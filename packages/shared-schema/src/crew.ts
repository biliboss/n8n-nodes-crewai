import type { AgentDescriptor } from "./agent";
import type { TaskDescriptor } from "./task";

export type CrewProcess = "sequential" | "hierarchical";

export interface CrewDescriptor {
  kind: "crewai.crew";
  process: CrewProcess;
  verbose?: boolean;
  maxRpm?: number;
  memory?: boolean;
  agents: AgentDescriptor[];
  tasks: TaskDescriptor[];
}
