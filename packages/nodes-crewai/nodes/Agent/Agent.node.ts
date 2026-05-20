import {
	NodeConnectionType,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

export class Agent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CrewAI Agent',
		name: 'crewAiAgent',
		icon: 'file:agent.svg',
		group: ['transform'],
		version: 1,
		description: 'A single role-playing CrewAI agent. Hang Tools / LLM / Memory off this node.',
		defaults: {
			name: 'CrewAI Agent',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['CrewAI'],
			},
		},
		inputs: [
			{ displayName: 'LLM', type: NodeConnectionType.AiLanguageModel, maxConnections: 1 },
			{ displayName: 'Tools', type: NodeConnectionType.AiTool },
			{ displayName: 'Memory', type: NodeConnectionType.AiMemory, maxConnections: 1 },
		],
		outputs: [NodeConnectionType.AiAgent],
		outputNames: ['Agent'],
		properties: [
			{
				displayName: 'Role',
				name: 'role',
				type: 'string',
				default: '',
				placeholder: 'Senior Researcher',
				required: true,
			},
			{
				displayName: 'Goal',
				name: 'goal',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				placeholder: 'Uncover novel findings in a given topic.',
				required: true,
			},
			{
				displayName: 'Backstory',
				name: 'backstory',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				placeholder: 'You are an expert with a knack for…',
				required: true,
			},
			{
				displayName: 'Allow Delegation',
				name: 'allowDelegation',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Verbose',
				name: 'verbose',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Max Iterations',
				name: 'maxIter',
				type: 'number',
				default: 15,
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		const descriptor = {
			kind: 'crewai.agent',
			role: this.getNodeParameter('role', 0) as string,
			goal: this.getNodeParameter('goal', 0) as string,
			backstory: this.getNodeParameter('backstory', 0) as string,
			allowDelegation: this.getNodeParameter('allowDelegation', 0) as boolean,
			verbose: this.getNodeParameter('verbose', 0) as boolean,
			maxIter: this.getNodeParameter('maxIter', 0) as number,
		};
		return { response: descriptor };
	}
}
