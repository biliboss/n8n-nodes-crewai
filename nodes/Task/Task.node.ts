/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

// import { Task } from '@langchain/crewai'; // Assuming this is the path to Task class

export class Task implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CrewAI Task',
		name: 'taskNode',
		icon: 'fa:tasks',
		group: ['transform'],
		version: 1,
		description: 'Configure a CrewAI task',
		defaults: {
			name: 'CrewAI Task',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tasks'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.crewai.example.com/tasks',
					},
				],
			},
		},
		inputs: [], // Assuming a task might be related to an agent
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Task'],
		properties: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'Identify the next big trend in {topic}.',
				typeOptions: {
					rows: 4,
				},
			},
			{
				displayName: 'Expected Output',
				name: 'expectedOutput',
				type: 'string',
				default: '',
				placeholder: 'A comprehensive report on the latest AI trends.',
				typeOptions: {
					rows: 2,
				},
			},
			// Here you might include properties related to tool association, async execution, output file customization, etc.
			// Additional properties can be added as required to match the Task class signature in CrewAI.
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const description = this.getNodeParameter('description', itemIndex) as string;
		const expectedOutput = this.getNodeParameter('expectedOutput', itemIndex) as string;

		// Assuming the Task class from CrewAI has a constructor that matches these parameters
		// const task = new Task({
		//     description,
		//     expectedOutput,
		//     // Additional parameters as needed
		// });

		// Depending on the CrewAI Task implementation, you might directly execute the task or return the task configuration
		return {
			response: `Configured Task: ${description} with expected output: ${expectedOutput}`
		};
	}
}
