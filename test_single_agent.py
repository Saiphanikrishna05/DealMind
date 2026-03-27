import asyncio
from api import data_ingestion_agent
from crewai import Task, Crew

def run():
    task = Task(description="Fetch the stock price and EBITDA margin for Apple.", expected_output="A short text summary of the current price and EBITDA.", agent=data_ingestion_agent)
    crew = Crew(agents=[data_ingestion_agent], tasks=[task], verbose=True)
    res = crew.kickoff()
    print("RES:", res)

run()
