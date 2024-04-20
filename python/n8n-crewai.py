import json
import argparse

from crewai import Agent
from crewai import Crew
from crewai import Task
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
	model="gpt-3.5-turbo-0125",
	api_key=""
)
# Function to create agents from JSON definitions
def create_agents(agents_json):

	agents = []
	for agent_def in agents_json:
		agent = Agent(
			role=agent_def["role"],
			goal=agent_def["goal"],
			verbose=agent_def.get("verbose", False),
			memory=agent_def.get("memory", False),
			backstory=agent_def["backstory"],
			llm=llm
		)
		agents.append(agent)
	return agents


# Function to create tasks from JSON definitions
def create_tasks(tasks_json, agents):
	print('tasks')
	print(tasks_json)
	tasks = []
	for task_def in tasks_json:
		# Find the agent for this task
		print('task_def')
		print(task_def)
		agent = next((agent for agent in agents if agent.role == task_def["agent"]), None)
		if not agent:
			print(f"No agent found for the role: {task_def['agent']}")
			continue

		task = Task(
			description=task_def["description"],
			expected_output=task_def["expected_output"],
			agent=agent
		)
		tasks.append(task)
	return tasks


# Main function to parse arguments, load JSON, and create agents and tasks
def main():
	parser = argparse.ArgumentParser(description="Process CrewAI agent and task definitions.")
	parser.add_argument('--json', type=str, help="JSON string with agent and task definitions")
	parser.add_argument('--file', type=str, help="Path to a JSON file with agent and task definitions")

	args = parser.parse_args()

	if args.json:
		print(args.json)
		definitions = json.loads(args.json)
	elif args.file:
		with open(args.file, 'r') as json_file:
			definitions = json.load(json_file)
	else:
		raise ValueError("Either --json or --file must be provided.")

	agents = create_agents(definitions["agents"])
	tasks = create_tasks(definitions["tasks"], agents)

	# Example of how you might initialize a crew with these agents and tasks
	crew = Crew(agents=agents, tasks=tasks)
	print(f"Crew initialized with {len(agents)} agents and {len(tasks)} tasks.")
	crew.kickoff()


if __name__ == "__main__":
	main()
