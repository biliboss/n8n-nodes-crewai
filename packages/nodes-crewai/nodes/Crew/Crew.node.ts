import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

const AI_TASK = 'ai_task' as unknown as NodeConnectionType;

export class Crew implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CrewAI Crew',
		name: 'crewAiCrew',
		icon: 'file:crew.svg',
		group: ['transform'],
		version: 1,
		description:
			'Orchestrates a crew of CrewAI agents and tasks. Attach Agents and Tasks as sub-nodes, then run the crew.',
		defaults: {
			name: 'CrewAI Crew',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['CrewAI'],
			},
		},
		inputs: [
			{ displayName: '', type: NodeConnectionType.Main },
			{ displayName: 'Agents', type: NodeConnectionType.AiAgent, required: true },
			{ displayName: 'Tasks', type: AI_TASK, required: true },
			{ displayName: 'LLM', type: NodeConnectionType.AiLanguageModel, maxConnections: 1 },
		],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Process',
				name: 'process',
				type: 'options',
				options: [
					{ name: 'Sequential', value: 'sequential' },
					{ name: 'Hierarchical', value: 'hierarchical' },
				],
				default: 'sequential',
				description: 'How the crew executes tasks across agents.',
			},
			{
				displayName: 'Verbose',
				name: 'verbose',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Memory',
				name: 'memory',
				type: 'boolean',
				default: false,
				description: 'Enable shared memory across the crew.',
			},
			{
				displayName: 'Max RPM',
				name: 'maxRpm',
				type: 'number',
				default: 0,
				description: 'Optional rate limit. 0 disables the cap.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Visual shell only — execution lands once the crewai-bridge service exists.
		const items = this.getInputData();
		return [items];
	}
}
