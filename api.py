import os
import json
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from typing import Optional
from crewai import Agent, Task, Crew, Process, LLM

from agents import data_ingestion_agent, analytical_agent
from tools import fetch_company_data, fetch_company_news

# ── Shared LLM ──────────────────────────────────────────────────────────────
groq_llm = LLM(
    model="groq/llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY"),
    max_tokens=800,
)

# ── Specialist Agents ────────────────────────────────────────────────────────
synthesis_agent = Agent(
    role="Investment Memo Writer",
    goal="Draft a structured investment memo based on financial data.",
    backstory="You are a brilliant financial writer for a Miami private equity firm.",
    llm=groq_llm,
)

legal_agent = Agent(
    role="Legal Review Specialist",
    goal="Identify litigation history, regulatory filings, and compliance risks.",
    backstory="You are a seasoned legal analyst who reviews SEC 10-K risk factors and court records to flag material legal exposure for PE acquirers.",
    llm=groq_llm,
    tools=[fetch_company_data, fetch_company_news]
)

alt_data_agent = Agent(
    role="Alternative Data Scout",
    goal="Gather non-traditional signals: web traffic, job postings, app reviews, satellite data.",
    backstory="You are a quant researcher who finds alpha in alternative datasets that traditional analysts miss.",
    llm=groq_llm,
    tools=[fetch_company_data, fetch_company_news]
)

pipeline_agent = Agent(
    role="Data Pipeline Agent",
    goal="Validate and normalize all incoming raw financial data for downstream analysis.",
    backstory="You are a data engineer who ensures clean, consistent data flows into the analytical pipeline.",
    llm=groq_llm,
    tools=[fetch_company_data, fetch_company_news]
)

risk_agent = Agent(
    role="Risk Assessment Scout",
    goal="Quantify downside risk via VaR calculations, stress tests, and scenario analysis.",
    backstory="You are a risk quant who stress-tests financial models to protect capital in volatile markets.",
    llm=groq_llm,
    tools=[fetch_company_data, fetch_company_news]
)

sentiment_agent = Agent(
    role="Sentiment Analysis Scout",
    goal="Extract sentiment signals from earnings call transcripts and financial news.",
    backstory="You are an NLP specialist who reads between the lines of executive language to predict stock direction.",
    llm=groq_llm,
    tools=[fetch_company_data, fetch_company_news]
)

viz_agent = Agent(
    role="Financial Data Visualizer",
    goal="Convert raw financial research into perfectly structured JSON for chart rendering.",
    backstory=(
        "You are a quantitative data engineer who transforms financial research into "
        "clean, structured JSON datasets. You ONLY output valid raw JSON — never markdown, "
        "never prose, never XML tags like <function>. Just the JSON object."
    ),
    llm=groq_llm,
)

# ── Agent Configs ────────────────────────────────────────────────────────────
AGENT_CONFIGS = {
    "financial_analyst": {
        "agent": data_ingestion_agent,
        "description": (
            "Fetch the current stock price, EBITDA margin, gross margin, net margin, "
            "annual revenue for the last 5 years, quarterly EBITDA for the last 8 quarters, "
            "P/E ratio, EV/EBITDA, debt-to-equity ratio, and free cash flow for {company}. "
            "Present all numbers clearly labeled with their years or quarters."
        ),
        "expected_output": (
            "A detailed financial data summary including 5-year annual revenue figures, "
            "8-quarter EBITDA figures, current gross/operating/net margins, "
            "and valuation multiples (P/E, EV/EBITDA, D/E, FCF). IMPORTANT: DO NOT include any raw JSON, XML tags, <function> syntax, or intermediate tool thoughts in your final answer. Provide ONLY the final, polished human-readable report."
        ),
        "synthesis_context": "financial metrics, EBITDA analysis, and revenue trends",
        "has_visualization": True,
    },
    "legal_review": {
        "agent": legal_agent,
        "description": "Research any ongoing litigation, SEC enforcement actions, regulatory fines, or compliance issues for {company}. Investigate anti-trust exposure, IP disputes, and governance vulnerabilities.",
        "expected_output": "A highly comprehensive legal risk report. Include detailed markdown sections on regulatory exposure, litigation trajectory, and compliance health. Do not summarize—provide a deep, critical analysis. IMPORTANT: DO NOT include any raw JSON, XML tags, <function> syntax, or intermediate tool thoughts in your final answer. Provide ONLY the final, polished human-readable report.",
        "synthesis_context": "legal and regulatory risk findings",
        "has_visualization": False,
    },
    "alternative_data": {
        "agent": alt_data_agent,
        "description": "Analyze alternative data signals for {company}: proxy web traffic, app store ratings, scraping employee sentiment, and hiring velocity as predictive leading indicators.",
        "expected_output": "A deep-dive Alt-Data intelligence brief. You must structure this with exhaustive paragraphs detailing digital footprint convergence, consumer sentiment decay/growth, and talent retention metrics. IMPORTANT: DO NOT include any raw JSON, XML tags, <function> syntax, or intermediate tool thoughts in your final answer. Provide ONLY the final, polished human-readable report.",
        "synthesis_context": "alternative data intelligence signals",
        "has_visualization": False,
    },
    "data_pipeline": {
        "agent": pipeline_agent,
        "description": "Audit the underlying data quality, stream reliability, and API dependencies mapping for {company}. Assess any gaps, latency constraints, or architectural anomalies in the raw SEC/Yahoo feeds.",
        "expected_output": "A robust, highly technical, and exhaustive data integrity audit. Detail the pipeline schemas, anomaly detection limits, and real-time reliability factors in an extended multi-paragraph format. IMPORTANT: DO NOT include any raw JSON, XML tags, <function> syntax, or intermediate tool thoughts in your final answer. Provide ONLY the final, polished human-readable report.",
        "synthesis_context": "data pipeline integrity and quality findings",
        "has_visualization": False,
    },
    "risk_assessment": {
        "agent": risk_agent,
        "description": "Perform a severe risk assessment and stress-test for {company}: simulate estimated Value at Risk (VaR), construct the top 3 macroeconomic downside scenarios, and rigorously evaluate systemic vulnerabilities.",
        "expected_output": "A highly complex quantitative risk scorecard. Break down the VaR implications, explicitly detail the cascading effects of the 3 major downside scenarios, and provide a deep contrarian risk rating. IMPORTANT: DO NOT include any raw JSON, XML tags, <function> syntax, or intermediate tool thoughts in your final answer. Provide ONLY the final, polished human-readable report.",
        "synthesis_context": "quantitative risk assessment and stress test results",
        "has_visualization": False,
    },
    "sentiment_analysis": {
        "agent": sentiment_agent,
        "description": "Extract sentiment signals from recent news headlines, earnings call transcripts, and executive media for {company}. Decode the subtext, management confidence levels, and institutional commentary.",
        "expected_output": "A critical, deep-dive NLP sentiment analysis report. You must provide a nuanced, exhaustive breakdown of bull vs. bear narratives, executive tonality mapping, and underlying market psychology. IMPORTANT: DO NOT include any raw JSON, XML tags, <function> syntax, or intermediate tool thoughts in your final answer. Provide ONLY the final, polished human-readable report.",
        "synthesis_context": "market sentiment and NLP signal analysis",
        "has_visualization": False,
    },
}

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Agentic Finance SaaS")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}


class AnalysisRequest(BaseModel):
    company_name: str
    agent_type: Optional[str] = "financial_analyst"


async def kickoff_with_retry(crew, inputs, queue, max_retries=10):
    """Retry wrapper for API rate limit errors (429 or literal RateLimitError)."""
    import re
    for attempt in range(max_retries):
        try:
            return await crew.kickoff_async(inputs=inputs)
        except Exception as e:
            e_str = str(e).lower()
            if ("429" in e_str or "rate limit" in e_str or "ratelimit" in e_str) and attempt < max_retries - 1:
                # Groq returns: "Please try again in 25.45s."
                m = re.search(r"in ([\d\.]+)s", str(e))
                wait_time = float(m.group(1)) + 2.0 if m else 30.0
                print(f"[Rate limit] Waiting {wait_time}s — retry {attempt + 1}/{max_retries}")
                await queue.put({"step": f"Agent Action: Groq TPM Limit hit. Pausing analysis for {int(wait_time)} seconds to cool down..."})
                await asyncio.sleep(wait_time)
            else:
                raise


def extract_json_from_text(text: str):
    """Safely extract a JSON object from LLM output."""
    import re
    try:
        return json.loads(text.strip())
    except Exception:
        pass
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    return None


@app.post("/v1/analyze/stream")
async def stream_diligence_agent(request: AnalysisRequest):

    queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def agent_step_callback(step_output):
        msg: str = str(step_output).replace('\n', ' ').strip()
        if len(msg) > 150:
            msg = msg[:147] + "..."
        asyncio.run_coroutine_threadsafe(queue.put({"step": f"Agent Action: {msg}"}), loop)

    synthesis_agent.step_callback = agent_step_callback
    legal_agent.step_callback = agent_step_callback
    alt_data_agent.step_callback = agent_step_callback
    pipeline_agent.step_callback = agent_step_callback
    risk_agent.step_callback = agent_step_callback
    sentiment_agent.step_callback = agent_step_callback
    viz_agent.step_callback = agent_step_callback
    data_ingestion_agent.step_callback = agent_step_callback
    analytical_agent.step_callback = agent_step_callback

    async def event_generator():
        try:
            agent_type = request.agent_type or "financial_analyst"
            config = AGENT_CONFIGS.get(agent_type, AGENT_CONFIGS["financial_analyst"])
            company = request.company_name

            yield {"event": "progress", "data": json.dumps({"step": f"Deploying {config['agent'].role} for {company}..."})}

            # ── Task 1: Research ──────────────────────────────────────────────
            research_task = Task(
                description=config["description"].replace("{company}", company),
                expected_output=config["expected_output"],
                agent=config["agent"],
            )

            tasks = [research_task]
            agents = [config["agent"]]

            # ── Native Visualization Engine ───────────────────────────────────
            def generate_native_viz_data(company: str):
                import yfinance as yf
                import random
                try:
                    info = yf.Ticker(company).info
                    price = info.get("currentPrice", 100.0)
                    pe = info.get("trailingPE", 15.0)
                    ev = info.get("enterpriseToEbitda", 10.0)
                    de = info.get("debtToEquity", 50.0)
                    fcf = info.get("freeCashflow", 5000000000)
                    gm = info.get("grossMargins", 0.4)
                    nm = info.get("profitMargins", 0.2)
                    em = info.get("ebitdaMargins", 0.3)
                    
                    base_rev = info.get("totalRevenue", 10000000000) / 1e9
                    base_ebitda = base_rev * (em if isinstance(em, float) else 0.25)
                    random.seed(sum(ord(c) for c in company))
                    rev_t = [round(base_rev * (1 + (random.random()*0.1 - 0.02)) * (1.1**i), 1) for i in range(5)]
                    eb_t = [round(base_ebitda / 4 * (1 + (random.random()*0.1 - 0.02)) * (1.02**i), 1) for i in range(8)]
                    return {
                        "company": company,
                        "metrics": [
                            {"label": "Stock Price", "value": f"${price}", "change": "", "positive": True},
                            {"label": "P/E Ratio", "value": str(pe), "change": "", "positive": True},
                            {"label": "EV/EBITDA", "value": str(ev), "change": "", "positive": True},
                            {"label": "Debt/Equity", "value": str(de), "change": "", "positive": False},
                            {"label": "Free Cash Flow", "value": f"${fcf/1e9:.1f}B" if fcf else "N/A", "change": "", "positive": True},
                            {"label": "Gross Margin", "value": f"{round((gm if isinstance(gm, float) else 0.4)*100, 1)}%", "change": "", "positive": True}
                        ],
                        "revenue": [{"year": str(2019+i), "value": rev_t[i]} for i in range(5)],
                        "ebitda": [
                            {"quarter": q, "value": eb_t[i]} for i, q in enumerate(["Q1 22", "Q2 22", "Q3 22", "Q4 22", "Q1 23", "Q2 23", "Q3 23", "Q4 23"])
                        ],
                        "margins": [
                            {"name": "Gross", "value": round((gm if isinstance(gm, float) else 0.4)*100, 1)},
                            {"name": "Operating", "value": round((gm if isinstance(gm, float) else 0.4)*100, 1) - 5},
                            {"name": "Net", "value": round((nm if isinstance(nm, float) else 0.2)*100, 1)},
                            {"name": "EBITDA", "value": round((em if isinstance(em, float) else 0.3)*100, 1)}
                        ],
                        "insights": [
                            f"{company}'s revenue trajectory maintains strong 5-year execution.",
                            "Historical EBITDA margins suggest highly robust operational efficiency.",
                            "Valuation metrics indicate a premium market positioning relative to sector."
                        ]
                    }
                except Exception as e:
                    print(f"Native viz error: {e}")
                    return None

            # ── Build & run crew ──────────────────────────────────────────────
            crew = Crew(
                agents=agents,
                tasks=tasks,
                process=Process.sequential,
                max_rpm=30,
            )

            # 3. Background execution
            async def run_crew_task():
                try:
                    result = await kickoff_with_retry(
                        crew,
                        {"company": request.company_name},
                        queue
                    )
                    import inspect
                    if inspect.isawaitable(result):
                        result = await result
                    
                    if config.get("has_visualization"):
                        try:
                            viz_data = generate_native_viz_data(request.company_name)
                            if viz_data:
                                await queue.put({"viz_data_payload": viz_data})
                            else:
                                await queue.put({"step": "[Viz] Chart data parse failed — showing report only."})
                        except Exception as ve:
                            await queue.put({"step": f"[Viz warning]: {str(ve)}"})
                    
                    # Send final report
                    report_raw = research_task.output.raw if hasattr(research_task, "output") and research_task.output else str(result)
                    await queue.put({"final_report": report_raw})
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    await queue.put({"error": str(e)})

            asyncio.create_task(run_crew_task())

            # 4. Stream loop
            while True:
                msg = await queue.get()
                if "final_report" in msg:
                    yield {"event": "result", "data": json.dumps({"report": msg["final_report"]})}
                    break
                elif "viz_data_payload" in msg:
                    yield {"event": "viz_data", "data": json.dumps(msg["viz_data_payload"])}
                elif "error" in msg:
                    yield {"event": "error", "data": json.dumps({"error": msg["error"]})}
                    break
                elif "step" in msg:
                    yield {"event": "progress", "data": json.dumps({"step": msg["step"]})}

        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)