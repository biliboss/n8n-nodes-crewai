export interface TaskDescriptor {
  kind: "crewai.task";
  description: string;
  expectedOutput: string;
  agentRole?: string;
  context?: string[];
  outputPydantic?: Record<string, unknown>;
}
