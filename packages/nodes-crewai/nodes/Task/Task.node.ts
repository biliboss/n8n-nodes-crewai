import {
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	NodeConnectionType,
	type SupplyData,
} from 'n8n-workflow';

const AI_TASK = 'ai_task' as unknown as NodeConnectionType;

export class Task implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CrewAI Task',
		name: 'crewAiTask',
		icon: 'file:task.svg',
		group: ['transform'],
		version: 1,
		description: 'A declarative task definition assigned to a CrewAI agent.',
		defaults: {
			name: 'CrewAI Task',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['CrewAI'],
			},
		},
		inputs: [],
		outputs: [AI_TASK],
		outputNames: ['Task'],
		properties: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				placeholder: 'Identify the top 3 emerging trends in…',
				required: true,
			},
			{
				displayName: 'Expected Output',
				name: 'expectedOutput',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				placeholder: 'A bullet list of 3 trends, each with a one-line rationale.',
				required: true,
			},
			{
				displayName: 'Assigned Agent Role',
				name: 'agentRole',
				type: 'string',
				default: '',
				placeholder: 'Senior Researcher',
				description:
					'The role string of the Agent that should execute this task. Must match an Agent attached to the same Crew.',
			},
			{
				displayName: 'Context (Task Refs)',
				name: 'context',
				type: 'string',
				default: '',
				description: 'Comma-separated task names whose outputs feed this task as context.',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		const ctx = (this.getNodeParameter('context', 0) as string)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const descriptor = {
			kind: 'crewai.task',
			description: this.getNodeParameter('description', 0) as string,
			expectedOutput: this.getNodeParameter('expectedOutput', 0) as string,
			agentRole: this.getNodeParameter('agentRole', 0) as string,
			context: ctx,
		};
		return { response: descriptor };
	}
}
