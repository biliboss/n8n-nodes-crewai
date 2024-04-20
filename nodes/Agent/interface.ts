export interface CrewAIAgent {
	role: string;
	goal: string;
	verbose: boolean;
	memory: boolean;
	backstory: string;
}
