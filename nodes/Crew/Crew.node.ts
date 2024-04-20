import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription, NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import {exec} from 'child_process';
import {promisify} from 'util';

const execPromise = promisify(exec);

function getInputs() {
	const inputs = [
		{displayName: 'Input Main', type: NodeConnectionType.Main},
		{
			displayName: 'Agents',
			// maxConnections: 20,
			type: NodeConnectionType.AiAgent,
			required: true,
		},
		{
			displayName: 'Tasks',
			// maxConnections: 20,
			type: NodeConnectionType.AiTool,
			required: true,
		},
	];

	// If `hasOutputParser` is undefined it must be version 1.3 or earlier so we
	// always add the output parser input
	// if (hasOutputParser === undefined || hasOutputParser === true) {
	// 	inputs.push({ displayName: 'Output Parser', type: NodeConnectionType.AiOutputParser });
	// }
	return inputs;
}

export class Crew implements INodeType {

	description: INodeTypeDescription = {
		displayName: 'CrewAI Crew',
		name: 'crewAICrew',
		group: ['transform'],
		version: 1,
		description: 'Configure and execute a CrewAI crew with autonomous agents, each tailored for specific roles and goals, directly within your n8n workflows. This node provides a structured approach to define agent configurations, facilitating sophisticated AI-driven task execution.',
		defaults: {
			name: 'CrewAI Crew',
		},
		inputs: `={{ ((parameter) => { ${getInputs.toString()}; return getInputs(parameter) })($parameter) }}`,
		outputs: ['main'],
		properties: [
			{
				displayName: 'Allow Delegation',
				name: 'allowDelegation',
				type: 'boolean',
				default: false,
				description: 'If true, the agent can delegate tasks to other agents when necessary.',
			},
			// Define additional properties for each aspect of CrewAI agent configuration here
			{
				displayName: 'Execution Mode',
				name: 'executionMode',
				type: 'options',
				options: [
					{
						name: 'Sequential',
						value: 'sequential',
						description: 'Executes tasks sequentially, one after the other.',
					},
					{
						name: 'Parallel',
						value: 'parallel',
						description: 'Executes tasks in parallel, based on dependencies and resources.',
					},
					// Additional execution modes can be considered here
				],
				default: 'sequential',
				description: 'Choose the execution mode for CrewAI tasks. Sequential mode ensures tasks are handled one at a time, while Parallel mode enables simultaneous execution where applicable.',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		let myString: string;

		const agents = (await this.getInputConnectionData(
			NodeConnectionType.AiAgent,
			0,
		)) as Object;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				myString = this.getNodeParameter('myString', itemIndex, '') as string;
				item = items[itemIndex];
				myString = myString;

				// Calling python function
				const {stdout} = await execPromise('python sample.py');
				// if (error) {
				// 	console.error(`exec error: ${error}`);
				// 	return;
				// }

				console.log(`Result from Python Script: ${stdout}`);

				// Assume that your Python function returns a string that you
				// want to add to the json object.
				item.json['myString3'] = JSON.stringify(agents);

			} catch (error) {
				if (this.continueOnFail()) {
					items.push({json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex});
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return this.prepareOutputData(items);
	}
}
