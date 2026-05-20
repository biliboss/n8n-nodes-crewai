import {
	NodeConnectionType,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

export class Tool implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CrewAI Tool',
		name: 'crewAiTool',
		icon: 'file:tool.svg',
		group: ['transform'],
		version: 1,
		description:
			'A custom tool surface exposed to CrewAI agents. Wraps a JSON schema + description; backend execution lands later.',
		defaults: {
			name: 'CrewAI Tool',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['CrewAI'],
			},
		},
		inputs: [],
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [
			{
				displayName: 'Tool Name',
				name: 'toolName',
				type: 'string',
				default: '',
				placeholder: 'search_web',
				required: true,
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				placeholder: 'Search the web for fresh information.',
				required: true,
			},
			{
				displayName: 'Input Schema (JSON)',
				name: 'schema',
				type: 'json',
				default: '{\n  "type": "object",\n  "properties": {\n    "query": { "type": "string" }\n  },\n  "required": ["query"]\n}',
				description: 'A JSON Schema describing the tool input. The backend will validate calls against it.',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		const raw = this.getNodeParameter('schema', 0) as string;
		let schema: unknown = {};
		try {
			schema = typeof raw === 'string' ? JSON.parse(raw) : raw;
		} catch {
			schema = {};
		}
		const descriptor = {
			kind: 'crewai.tool',
			name: this.getNodeParameter('toolName', 0) as string,
			description: this.getNodeParameter('description', 0) as string,
			schema,
		};
		return { response: descriptor };
	}
}
