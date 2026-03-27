from crewai import Task, Crew, Agent, LLM
from crewai.flow.flow import Flow, start, listen
from crewai.flow.human_feedback import human_feedback
import os
import weave
from weave.integrations.integration_utilities import autopatch_settings

# Initialize Weave to capture a dashboard of our AI's "brain"
weave.init(
    project_name="DealMind",
    autopatch_settings=autopatch_settings(
        crewai={"disabled": True}  
    )
)

# Import the agents
from agents import data_ingestion_agent, analytical_agent



# 1. Define the Synthesis Agent (The Writer)
synthesis_agent = Agent(
    role="Investment Memo Writer",
    goal="Draft a structured investment memo based on financial data.",
    backstory="You are a brilliant financial writer for a Miami private equity firm.",
    llm=LLM(model="gemini/gemini-2.5-flash-lite", api_key=os.getenv("GEMINI_API_KEY"))
)

# 2. Define the Tasks
ingestion_task = Task(
    description="Use the MCP tool to fetch the stock price and EBITDA margin for {company_name}.",
    expected_output="A short text summary of the current price and EBITDA.",
    agent=data_ingestion_agent
)

analysis_task = Task(
    description="Use the secure Python sandbox to calculate the estimated annual revenue if the price grows by 10%. Data: {raw_data}",
    expected_output="A math calculation result.",
    agent=analytical_agent
)

synthesis_task = Task(
    description="""Write a formal Investment Memorandum for {company_name} utilizing the calculated financial data: {math_result}.
    
    The memorandum MUST be formatted in Markdown and include the following specific sections:
    1. Executive Summary: A high-level overview of the target company and the investment thesis.
    2. Market Analysis & Growth Potential: An assessment of the sector and expansion opportunities.
    3. Financial Projections & Valuation: Incorporate the provided EBITDA and revenue math results here.
    4. Risk Disclosures: Highlight potential operational, legal, and regulatory considerations.
    
    Ensure the tone is highly professional, analytical, and suitable for a Private Equity investment committee.""",
    expected_output="A comprehensive, multi-section Markdown investment memorandum.",
    agent=synthesis_agent
)

# 3. Build the Event-Driven Flow with Human-in-the-Loop
class FinancialDiligenceFlow(Flow):
    
    @start()
    def fetch_and_analyze(self):
        print("\n--- Phase 1: AI Agents Gathering & Analyzing Data ---")
        # Run the first two agents
        crew = Crew(
            agents=[data_ingestion_agent, analytical_agent],
            tasks=[ingestion_task, analysis_task],
            verbose=True
        )
        # We pass the company name (AAPL for Apple) into the tasks
        result = crew.kickoff(inputs={"company_name": "AAPL", "raw_data": "Use previous task data"})
        return result.raw

    # The AI PAUSES HERE and asks for your permission!
    @listen(fetch_and_analyze)
    @human_feedback(message="\nBoss, the analysis is done. Should I write the final investment memo? (Type 'approved' to continue):")
    def get_approval(self, analysis_result):
        return analysis_result

    @listen(get_approval)
    def write_final_report(self, approval_result):
        # If you typed "approved", the final agent runs!
        if approval_result.feedback.lower() == "approved":
            print("\n--- Phase 2: Approval received! Writing final report... ---")
            crew = Crew(
                agents=[synthesis_agent],
                tasks=[synthesis_task],
                verbose=True
            )
            final_report = crew.kickoff(inputs={"company_name": "AAPL", "math_result": approval_result.output})
            print("\n\n====== FINAL INVESTMENT MEMO ======\n")
            print(final_report.raw)
        else:
            print("\nExecution rejected by human. Stopping the workflow.")

# 4. Run the Application
if __name__ == "__main__":
    flow = FinancialDiligenceFlow()
    flow.kickoff()