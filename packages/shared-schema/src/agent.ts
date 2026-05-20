export interface AgentDescriptor {
  kind: "crewai.agent";
  role: string;
  goal: string;
  backstory: string;
  allowDelegation?: boolean;
  verbose?: boolean;
  maxIter?: number;
  toolRefs?: string[];
  llmRef?: string;
  memoryRef?: string;
}
