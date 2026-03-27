import asyncio
import asyncio


from api import data_ingestion_agent, analytical_agent, devils_advocate_agent, synthesis_agent
from crewai import Task, Crew, Process

ingestion_task = Task(description="Fetch the stock price and EBITDA margin for Apple.", expected_output="A short text summary of the current price and EBITDA.", agent=data_ingestion_agent)
analysis_task = Task(description="Analyze the {raw_data}. Calculate: FINANCIAL HEALTH, PREDICTIVE INDICATORS, RED FLAGS.", expected_output="An institutional-grade financial scorecard.", agent=analytical_agent)
devils_advocate_task = Task(description="Review the financial scorecard. Formulate 3 counterarguments.", expected_output="A harsh risk assessment.", agent=devils_advocate_agent)
synthesis_task = Task(description="Write a formal Investment Memorandum.", expected_output="A comprehensive Markdown investment memorandum.", agent=synthesis_agent)

crew = Crew(
    agents=[data_ingestion_agent, analytical_agent, devils_advocate_agent, synthesis_agent],
    tasks=[ingestion_task, analysis_task, devils_advocate_task, synthesis_task],
    process=Process.sequential,
    max_rpm=30,
    verbose=True
)

async def main():
    try:
        res = await crew.kickoff_async(inputs={"raw_data": "Fetch from SEC"})
        print("FINAL RESULT:", res)
    except Exception as e:
        print("ERROR:", e)

asyncio.run(main())
