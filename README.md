# DealMind

> **Autonomous multi-agent financial due diligence, powered by AI.**

DealMind deploys a coordinated fleet of specialized AI agents to perform institutional-grade financial analysis on any publicly traded company — delivering SEC-sourced data, risk quantification, legal screening, sentiment analysis, and a structured Investment Memorandum, all within a single workflow.

---

## Overview

Traditional due diligence is slow, expensive, and siloed. DealMind replaces that process with a real-time autonomous agent pipeline that ingests public financial data, runs parallel specialist analyses, and synthesizes findings into a professional Investment Memorandum — streamed live to a financial-grade dashboard.

Built for private equity analysts, venture capital associates, and financial researchers who need deep-dive company analysis at the speed of a conversation.

---

## Key Features

- **Autonomous Agent Fleet** — Six specialist agents run sequentially, each owning a distinct analytical domain
- **Live Streaming Dashboard** — Agent reasoning and execution traces stream in real time to the UI via Server-Sent Events (SSE)
- **Financial Visualizations** — Interactive charts for revenue trends, quarterly EBITDA, and margin profiling, generated from real LLM-extracted data
- **Investment Memorandum Generation** — Produces a structured Markdown memo covering Executive Summary, Financials, Risk, and Recommendations
- **Result Caching** — Each agent's output is cached client-side; switching between agents is instant with zero re-computation
- **One-Click PDF Export** — Export the final memorandum directly from the browser
- **Full Observability** — All agent traces captured via Weights & Biases Weave and CrewAI tracing

---

## Agent Fleet

| Agent | Role | Capability |
|---|---|---|
| **Financial Analyst Agent** | AAA | SEC filings, stock price, EBITDA, revenue trends, valuation multiples + interactive charts |
| **Legal Review Agent** | AA | Litigation history, SEC enforcement actions, regulatory compliance flags |
| **Alternative Data Scout** | A | Web traffic, app store ratings, Glassdoor sentiment, hiring velocity |
| **Data Pipeline Agent** | A | Data quality validation, anomaly detection, pipeline integrity |
| **Risk Assessment Scout** | B | Value at Risk (VaR), stress testing, downside scenario modeling |
| **Sentiment Analysis Scout** | B | NLP extraction from earnings calls, news sentiment scoring |

---

## Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — Async REST API with Server-Sent Events streaming
- **[CrewAI](https://www.crewai.com/)** — Multi-agent orchestration framework
- **[Google Gemini 1.5 Flash](https://ai.google.dev/)** — LLM backbone for all agents
- **[MCP (Model Context Protocol)](https://modelcontextprotocol.io/)** — Financial data tool server (SEC EDGAR integration)
- **[Weights & Biases Weave](https://wandb.ai/site/weave)** — LLM observability and trace capture
- **[uvicorn](https://www.uvicorn.org/)** — ASGI server

### Frontend
- **[React](https://react.dev/)** + **[Vite](https://vitejs.dev/)** — Fast, modern UI framework
- **[Recharts](https://recharts.org/)** — Composable chart library (Area, Bar, Radar charts)
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first styling

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│   Agent Fleet Panel │ Glass Brain Timeline │ Memo Output │
└──────────────────────────────┬──────────────────────────┘
                               │ SSE Stream (progress/viz_data/result)
┌──────────────────────────────▼──────────────────────────┐
│                  FastAPI Backend (api.py)                 │
│         POST /v1/analyze/stream  →  EventSourceResponse  │
└──────────────────────────────┬──────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────┐
│                    CrewAI Crew Pipeline                   │
│   Research Task → Visualization Task → Synthesis Task    │
│        ↓                  ↓                  ↓           │
│  Specialist Agent    Viz Agent (JSON)   Memo Writer       │
└──────────────────────────────┬──────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────┐
│               MCP Financial Data Server                   │
│              (sec_mcp_server.py via stdio)                │
│         SEC EDGAR  │  Stock Price  │  Financial Ratios    │
└─────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Python 3.13+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/DealMind.git
cd DealMind
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

```env
GEMINI_API_KEY=your_gemini_api_key_here
WANDB_API_KEY=your_wandb_api_key_here   # optional, for Weave tracing
```

### 3. Install backend dependencies

```bash
uv sync
```

### 4. Install frontend dependencies

```bash
cd finance-ui
npm install
```

### 5. Run the application

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd DealMind
uv run api.py
# Server running at http://localhost:8000
```

**Terminal 2 — Frontend:**
```bash
cd DealMind/finance-ui
npm run dev
# UI running at http://localhost:5173
```

### 6. Open the dashboard

Navigate to [http://localhost:5173](http://localhost:5173), enter a company ticker or name, and click **Deploy Fleet**.

---

## Usage

1. **Enter a target company** — Type any publicly traded company name (e.g., `Apple`, `Tesla`, `Microsoft`)
2. **Deploy Fleet** — All six agents are dispatched sequentially and automatically
3. **Watch live traces** — The Glass Brain Timeline streams agent reasoning in real time
4. **Switch between agents** — Click any agent card to instantly view its cached analysis
5. **Review the memo** — The Investment Memorandum is rendered in the right panel with charts
6. **Export** — Click "One-Click Export to PDF" to save the final report

---

## Project Structure

```
DealMind/
├── api.py                  # FastAPI server + SSE streaming endpoint
├── agents.py               # CrewAI agent definitions
├── tools.py                # Secure Python execution tool
├── sec_mcp_server.py       # MCP server for SEC/financial data
├── .env                    # Environment variables (not committed)
├── .env.example            # Environment variable template
├── pyproject.toml          # Python dependencies (uv)
└── finance-ui/
    ├── src/
    │   └── App.jsx         # Main React dashboard
    ├── package.json
    └── vite.config.js
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` |  Yes | Google Gemini API key for all LLM calls |
| `WANDB_API_KEY` |  Optional | Weights & Biases key for Weave trace logging |

---

## Rate Limits

DealMind uses **Google Gemini 1.5 Flash**. Free tier limits apply:

- **15 requests/minute** on the free tier
- The backend automatically retries with a 60-second backoff on `429` errors
- `max_rpm=10` is set at the Crew level to stay safely within limits
- Upgrade to a paid Gemini API plan to remove rate limit constraints

---

## Roadmap

- [ ] PDF export with charts embedded (Puppeteer integration)
- [ ] PostgreSQL persistence for analysis history
- [ ] Multi-company comparison mode
- [ ] Bloomberg Terminal API integration
- [ ] Authentication and user workspaces
- [ ] Slack/email delivery of completed memos
- [ ] Support for private company analysis via document upload

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Author

Built by [@saiphanikrishnaarumalla](https://github.com/saiphanikrishnaarumalla)  
University of South Florida

---

*DealMind is an independent research project. All financial data is sourced from public filings and should not be construed as investment advice.*
