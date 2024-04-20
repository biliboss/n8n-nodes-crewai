/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionType  } from 'n8n-workflow';

// import { Agent } from '@langchain/crewai'; // Assuming this is the path to Agent class

export class Agent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CrewAI Agent',
		name: 'agentNode',
		icon: 'fa:user-secret',
		group: ['transform'],
		version: 1,
		description: 'Configure a CrewAI agent',
		defaults: {
			name: 'CrewAI Agent',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Agents'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.crewai.example.com/agents',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionType.AiAgent],
		outputNames: ['Agent'],
		properties: [
			// getAgentConnectionHintNoticeField([NodeConnectionType.AiTool]),
			{
				displayName: 'Role',
				name: 'role',
				type: 'string',
				default: '',
				placeholder: 'Senior Researcher',
			},
			{
				displayName: 'Goal',
				name: 'goal',
				type: 'string',
				default: '',
				placeholder: 'Uncover groundbreaking technologies in {topic}',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Memory',
				name: 'memory',
				type: 'boolean',
				default: false,
				description: 'Enable memory for the agent',
			},
			{
				displayName: 'Verbose',
				name: 'verbose',
				type: 'boolean',
				default: false,
				description: 'Enable verbose mode for the agent',
			},
			{
				displayName: 'Backstory',
				name: 'backstory',
				type: 'string',
				default: '',
				placeholder: 'Driven by curiosity, you\'re at the forefront of innovation...',
				typeOptions: {
					rows: 4,
				},
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const role = this.getNodeParameter('role', itemIndex) as string;
		const goal = this.getNodeParameter('goal', itemIndex) as string;
		const memory = this.getNodeParameter('memory', itemIndex) as boolean;
		const verbose = this.getNodeParameter('verbose', itemIndex) as boolean;
		const backstory = this.getNodeParameter('backstory', itemIndex) as string;

		// Assuming the Agent class from CrewAI has a similar constructor
		// const agent = new Agent({
		// 	role,
		// 	goal,
		// 	memory,
		// 	verbose,
		// 	backstory,
		// 	// Include tools if necessary, similar to the dynamic tool creation in ToolCode
		// });

		// Depending on the CrewAI Agent implementation, you might directly execute tasks or return the agent configuration
		return {
			response: {role, goal, memory, verbose, backstory}
		};
	}
}
