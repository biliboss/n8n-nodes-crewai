export interface ToolDescriptor {
  kind: "crewai.tool";
  name: string;
  description: string;
  schema?: Record<string, unknown>;
}
