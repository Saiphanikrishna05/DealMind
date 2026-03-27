import os
from dotenv import load_dotenv
load_dotenv()

from crewai import Agent, LLM
from tools import secure_python_execution, fetch_company_data

groq_api_key = os.getenv("GROQ_API_KEY")

# 1. The "intern" brain for simple data gathering
cheap_intern_llm = LLM(
    model="groq/llama-3.1-8b-instant",
    api_key=groq_api_key,
    temperature=0.5,
    max_tokens=800
)

# 2. The "professor" brain for heavy financial math
premium_analyst_llm = LLM(
    model="groq/llama-3.1-8b-instant",
    api_key=groq_api_key,
    temperature=0.0,
    max_tokens=800 
)

# Removed broken MCPServerStdio

data_ingestion_agent = Agent(
    role="Data Ingestion Specialist",
    goal="Gather and summarize SEC filings and historical pricing.",
    backstory="You are a meticulous data gatherer who finds raw financial data. You must ONLY use the provided tools. DO NOT use brave_search or web_search under any circumstances.",
    llm=cheap_intern_llm,
    tools=[fetch_company_data],
    max_rpm=30
)

analytical_agent = Agent(
    role="Lead Quantitative Analyst",
    goal="Analyze unit economics, revenue quality, and working capital efficiency.",
    backstory="You are a veteran private equity analyst. You look beyond top-line revenue to find hidden churn signals, CAC inefficiencies, and margin degradation.",
    llm=premium_analyst_llm,
    tools=[secure_python_execution],
    max_rpm=30
)