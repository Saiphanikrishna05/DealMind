import { useState, useRef, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PolarRadiusAxis,
} from 'recharts';
import html2pdf from 'html2pdf.js';

// ── Agent definitions ─────────────────────────────────────────────────────────
const AGENTS = [
  { id: 'financial_analyst', name: 'Financial Analyst Agent', role: 'Financial Analyst', subRole: 'Source Credibility', rating: 'AAA', color: 'emerald', taskHint: 'Analyzing financials & building charts...', hasViz: true },
  { id: 'legal_review',      name: 'Legal Review Agent',      role: 'Legal Reviewer',    subRole: 'Regulatory Risk',    rating: 'AA',  color: 'cyan',    taskHint: 'Reviewing legal filings...',           hasViz: false },
  { id: 'alternative_data',  name: 'Alternative Data Scout',  role: 'Alt Data Intel',    subRole: 'Source Credibility', rating: 'A',   color: 'teal',    taskHint: 'Scouting alternative signals...',     hasViz: false },
  { id: 'data_pipeline',     name: 'Data Pipeline Agent',     role: 'Data Ingestion',    subRole: 'Pipeline Integrity', rating: 'A',   color: 'sky',     taskHint: 'Running data pipeline...',            hasViz: false },
  { id: 'risk_assessment',   name: 'Risk Assessment Scout',   role: 'Risk Quantification', subRole: 'Exposure Analysis', rating: 'B', color: 'amber',   taskHint: 'Quantifying risk exposure...',        hasViz: false },
  { id: 'sentiment_analysis',name: 'Sentiment Analysis Scout',role: 'Market Sentiment',  subRole: 'NLP Signal Extraction', rating: 'B', color: 'violet', taskHint: 'Extracting sentiment signals...',    hasViz: false },
];

const COLOR_MAP = {
  emerald: { dot: 'bg-emerald-400', glow: 'shadow-[0_0_10px_#34d399]', ping: 'bg-emerald-400', activeBorder: 'border-emerald-400', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  cyan:    { dot: 'bg-cyan-400',    glow: 'shadow-[0_0_10px_#22d3ee]', ping: 'bg-cyan-400',    activeBorder: 'border-cyan-400',    text: 'text-cyan-400',    ring: 'ring-cyan-500/30' },
  teal:    { dot: 'bg-teal-400',    glow: 'shadow-[0_0_10px_#2dd4bf]', ping: 'bg-teal-400',    activeBorder: 'border-teal-400',    text: 'text-teal-400',    ring: 'ring-teal-500/30' },
  sky:     { dot: 'bg-sky-400',     glow: 'shadow-[0_0_10px_#38bdf8]', ping: 'bg-sky-400',     activeBorder: 'border-sky-400',     text: 'text-sky-400',     ring: 'ring-sky-500/30' },
  amber:   { dot: 'bg-amber-400',   glow: 'shadow-[0_0_10px_#fbbf24]', ping: 'bg-amber-400',   activeBorder: 'border-amber-400',   text: 'text-amber-400',   ring: 'ring-amber-500/30' },
  violet:  { dot: 'bg-violet-400',  glow: 'shadow-[0_0_10px_#a78bfa]', ping: 'bg-violet-400',  activeBorder: 'border-violet-400',  text: 'text-violet-400',  ring: 'ring-violet-500/30' },
};

// ── Chart helpers ─────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0E131F] border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="font-mono font-bold" style={{ color: payload[0]?.color }}>${payload[0]?.value?.toFixed(1)}B</p>
    </div>
  );
};
const MarginTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0E131F] border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-violet-400 font-mono font-bold">{payload[0]?.value?.toFixed(1)}%</p>
    </div>
  );
};

function MetricCard({ label, value, change, positive }) {
  return (
    <div className="bg-[#0E131F] border border-slate-700/60 rounded-xl p-3 flex flex-col gap-1">
      <span className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-lg font-bold font-mono text-slate-100">{value}</span>
      {change && <span className={`text-[11px] font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{change}</span>}
    </div>
  );
}

function FinancialDashboard({ data }) {
  const [activeChart, setActiveChart] = useState('revenue');
  return (
    <div className="mb-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-slate-100 font-bold text-lg">{data.company} — Financial Dashboard</h3>
          <p className="text-slate-500 text-xs mt-0.5">AI-generated from SEC filings & public data</p>
        </div>
        <div className="flex gap-2">
          {['revenue', 'ebitda', 'margins'].map(tab => (
            <button key={tab} onClick={() => setActiveChart(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize
                ${activeChart === tab ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border border-slate-700 text-slate-500 hover:text-slate-300'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>
      {data.metrics?.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {data.metrics.map((m, i) => <MetricCard key={i} {...m} />)}
        </div>
      )}
      <div className="bg-[#0E131F] border border-slate-700/60 rounded-xl p-5">
        {activeChart === 'revenue' && data.revenue?.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-300">Annual Revenue (USD Billions)</p>
              <span className="text-[10px] text-slate-600 font-mono">5-Year Trend</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.revenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}B`} />
                <Tooltip content={<DarkTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} fill="url(#rGrad)" dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#34d399' }} />
              </AreaChart>
            </ResponsiveContainer>
            {data.insights?.[0] && <p className="mt-4 text-xs text-slate-400 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/40">💡 {data.insights[0]}</p>}
          </>
        )}
        {activeChart === 'ebitda' && data.ebitda?.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-300">Quarterly EBITDA (USD Billions)</p>
              <span className="text-[10px] text-slate-600 font-mono">8-Quarter View</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.ebitda} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}B`} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.4))' }} />
              </BarChart>
            </ResponsiveContainer>
            {data.insights?.[1] && <p className="mt-4 text-xs text-slate-400 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/40">💡 {data.insights[1]}</p>}
          </>
        )}
        {activeChart === 'margins' && data.margins?.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-300">Margin Profile (%)</p>
              <span className="text-[10px] text-slate-600 font-mono">Current Period</span>
            </div>
            <div className="flex gap-6 items-center">
              <ResponsiveContainer width="55%" height={200}>
                <RadarChart data={data.margins}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} />
                  <Radar name="Margin" dataKey="value" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip content={<MarginTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {data.margins.map((m, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{m.name}</span>
                      <span className="text-violet-400 font-mono font-bold">{m.value?.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
                        style={{ width: `${Math.min(m.value, 100)}%`, boxShadow: '0 0 8px #7c3aed' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {data.insights?.[2] && <p className="mt-4 text-xs text-slate-400 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/40">💡 {data.insights[2]}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function TimelineStep({ label, status, dim }) {
  const isDone = status === 'done';
  return (
    <div className={`flex gap-6 relative transition-opacity ${dim ? 'opacity-50' : 'opacity-100'}`}>
      <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10
        ${isDone ? 'bg-emerald-500/20 border-emerald-500' : 'bg-slate-800 border-slate-700'}`}>
        {isDone && <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />}
      </div>
      <div className="pt-1">
        <h3 className={`font-semibold text-sm ${isDone ? 'text-slate-200' : 'text-slate-400'}`}>{label}</h3>
        <p className={`text-sm mt-1 ${isDone ? 'text-emerald-500' : 'text-slate-500'}`}>{isDone ? 'Completed' : 'Awaiting'}</p>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [company, setCompany] = useState('');
  const [lockedCompany, setLockedCompany] = useState(''); // company frozen at deploy time
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [runningAgentId, setRunningAgentId] = useState(null); // which agent is actively fetching
  const [agentStatuses, setAgentStatuses] = useState({}); // 'running' | 'done' | 'error'
  const [fleetDeployed, setFleetDeployed] = useState(false);
  const [error, setError] = useState('');

  // ── Per-agent cached results ──────────────────────────────────────────────
  // Shape: { [agentId]: { logs, report, vizData } }
  const cache = useRef({});

  // ── What the right panel currently shows (from cache or live) ────────────
  const [displayLogs, setDisplayLogs] = useState([]);
  const [displayReport, setDisplayReport] = useState('');
  const [displayVizData, setDisplayVizData] = useState(null);

  const logsEndRef = useRef(null);
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayLogs]);

  // ── Switch displayed content when clicking a different agent ─────────────
  const selectAgent = useCallback((agentId) => {
    setActiveAgentId(agentId);
    setError('');
    const cached = cache.current[agentId];
    if (cached) {
      // ✅ Restore from cache — no API call
      setDisplayLogs(cached.logs);
      setDisplayReport(cached.report);
      setDisplayVizData(cached.vizData);
    } else {
      // Not yet run — clear panel
      setDisplayLogs([]);
      setDisplayReport('');
      setDisplayVizData(null);
    }
  }, []);

  // ── Stream a single agent from the API ───────────────────────────────────
  const streamAgent = useCallback(async (agent, company) => {
    // Guard: skip if already cached
    if (cache.current[agent.id]) {
      selectAgent(agent.id);
      return;
    }

    setRunningAgentId(agent.id);
    setActiveAgentId(agent.id);
    setDisplayLogs([]);
    setDisplayReport('');
    setDisplayVizData(null);
    setAgentStatuses(prev => ({ ...prev, [agent.id]: 'running' }));

    // live log buffer for this agent
    let liveLogs = [];

    const appendLog = (step) => {
      liveLogs = [...liveLogs, step];
      setDisplayLogs([...liveLogs]);
    };

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/v1/analyze/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: company, agent_type: agent.id }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let finalReport = '';
      let finalVizData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          let eventType = 'message';
          let dataLine = '';
          block.split(/\r?\n/).forEach(line => {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            if (line.startsWith('data: ')) dataLine = line.slice(6).trim();
          });
          if (!dataLine) continue;

          try {
            const data = JSON.parse(dataLine);

            if (eventType === 'viz_data') {
              finalVizData = data;
              setDisplayVizData(data);

            } else if (eventType === 'result' || data.report) {
              finalReport = data.report;
              setDisplayReport(data.report);
              setAgentStatuses(prev => ({ ...prev, [agent.id]: 'done' }));

            } else if (data.step?.trim()) {
              appendLog(data.step);

            } else if (data.error) {
              setError(data.error);
              setAgentStatuses(prev => ({ ...prev, [agent.id]: 'error' }));
            }
          } catch (_) {}
        }
      }

      // ✅ Save to cache once complete
      cache.current[agent.id] = {
        logs: liveLogs,
        report: finalReport,
        vizData: finalVizData,
      };

    } catch (err) {
      setError(err.message);
      setAgentStatuses(prev => ({ ...prev, [agent.id]: 'error' }));
    } finally {
      setRunningAgentId(null);
    }
  }, [selectAgent]);

  // ── Deploy Fleet: lock company, run ALL agents sequentially ──────────────
  const deployFleet = async () => {
    if (!company || runningAgentId) return;

    // Reset everything for a fresh deployment
    cache.current = {};
    setLockedCompany(company);
    setFleetDeployed(true);
    setAgentStatuses({});
    setDisplayLogs([]);
    setDisplayReport('');
    setDisplayVizData(null);
    setActiveAgentId(AGENTS[0].id);
    setError('');

    for (const agent of AGENTS) {
      await streamAgent(agent, company);
    }
  };

  const downloadPDF = () => {
    if (!displayReport && !displayVizData) return;

    import('jspdf').then(({ jsPDF }) => {
      const safeAgentName = activeAgent?.name || 'Report';
      const safeCompany = lockedCompany || company || 'Company';
      const now = new Date().toLocaleString();

      const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 48;
      const contentW = pageW - margin * 2;
      let y = margin;

      const addPage = () => {
        doc.addPage();
        y = margin;
      };

      const checkY = (needed = 20) => {
        if (y + needed > pageH - margin) addPage();
      };

      // ── Header ─────────────────────────────────────────────────────────
      doc.setFillColor(14, 19, 31);
      doc.rect(0, 0, pageW, pageH, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(241, 245, 249);
      doc.text(`${safeCompany} — Investment Memorandum`, margin, y);
      y += 24;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${safeAgentName}  ·  Generated ${now}`, margin, y);
      y += 8;

      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 18;

      // ── Key Metrics (Financial Agent) ───────────────────────────────────
      if (displayVizData?.metrics?.length) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(52, 211, 153);
        doc.text('KEY METRICS', margin, y);
        y += 14;

        const cols = 3;
        const cellW = contentW / cols;
        const cellH = 36;
        displayVizData.metrics.forEach((m, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = margin + col * cellW;
          const cy = y + row * (cellH + 6);
          checkY(cellH + 10);
          doc.setFillColor(22, 30, 46);
          doc.roundedRect(cx, cy, cellW - 6, cellH, 4, 4, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(m.label.toUpperCase(), cx + 8, cy + 13);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(241, 245, 249);
          doc.text(String(m.value), cx + 8, cy + 28);
        });
        const metricRows = Math.ceil((displayVizData.metrics.length) / cols);
        y += metricRows * (cellH + 6) + 16;
        doc.setDrawColor(51, 65, 85);
        doc.line(margin, y, pageW - margin, y);
        y += 16;
      }

      // ── Revenue Bar Chart ────────────────────────────────────────────────
      if (displayVizData?.revenue?.length) {
        checkY(130);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(52, 211, 153);
        doc.text('ANNUAL REVENUE (USD Billions) — 5-Year Trend', margin, y);
        y += 14;

        const chartH = 80;
        const chartW = contentW;
        const data = displayVizData.revenue;
        const maxVal = Math.max(...data.map(d => d.value));
        const barW = (chartW / data.length) * 0.55;
        const gap = chartW / data.length;

        // Background
        doc.setFillColor(22, 30, 46);
        doc.roundedRect(margin, y, chartW, chartH, 4, 4, 'F');

        data.forEach((d, i) => {
          const barH = (d.value / maxVal) * (chartH - 24);
          const bx = margin + i * gap + (gap - barW) / 2;
          const by = y + chartH - barH - 16;

          // Emerald bar
          doc.setFillColor(16, 185, 129);
          doc.roundedRect(bx, by, barW, barH, 2, 2, 'F');

          // Year label
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(String(d.year), bx + barW / 2 - 8, y + chartH - 4);

          // Value label above bar
          doc.setFontSize(7);
          doc.setTextColor(203, 213, 225);
          doc.text(`$${d.value}B`, bx, by - 3);
        });
        y += chartH + 16;
      }

      // ── EBITDA Bar Chart ─────────────────────────────────────────────────
      if (displayVizData?.ebitda?.length) {
        checkY(130);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(6, 182, 212);
        doc.text('QUARTERLY EBITDA (USD Billions) — 8-Quarter View', margin, y);
        y += 14;

        const chartH = 80;
        const chartW = contentW;
        const data = displayVizData.ebitda;
        const maxVal = Math.max(...data.map(d => d.value));
        const barW = (chartW / data.length) * 0.5;
        const gap = chartW / data.length;

        doc.setFillColor(22, 30, 46);
        doc.roundedRect(margin, y, chartW, chartH, 4, 4, 'F');

        data.forEach((d, i) => {
          const barH = (d.value / maxVal) * (chartH - 24);
          const bx = margin + i * gap + (gap - barW) / 2;
          const by = y + chartH - barH - 16;

          doc.setFillColor(6, 182, 212);
          doc.roundedRect(bx, by, barW, barH, 2, 2, 'F');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(d.quarter, bx - 2, y + chartH - 4);
        });
        y += chartH + 16;
      }

      // ── Margin Chart (horizontal bars) ───────────────────────────────────
      if (displayVizData?.margins?.length) {
        checkY(110);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(167, 139, 250);
        doc.text('MARGIN PROFILE (%)', margin, y);
        y += 12;

        doc.setFillColor(22, 30, 46);
        doc.roundedRect(margin, y, contentW, displayVizData.margins.length * 22 + 10, 4, 4, 'F');
        y += 8;

        displayVizData.margins.forEach((m) => {
          const pct = Math.min(Math.max(m.value, 0), 100);
          const barMaxW = contentW - 90;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184);
          doc.text(m.name, margin + 8, y + 9);

          // Track background
          doc.setFillColor(30, 41, 59);
          doc.roundedRect(margin + 68, y + 2, barMaxW, 10, 3, 3, 'F');

          // Filled bar
          doc.setFillColor(124, 58, 237);
          doc.roundedRect(margin + 68, y + 2, (pct / 100) * barMaxW, 10, 3, 3, 'F');

          // Value label
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(167, 139, 250);
          doc.text(`${m.value?.toFixed(1)}%`, margin + 68 + barMaxW + 4, y + 10);

          y += 22;
        });
        y += 12;
        doc.setDrawColor(51, 65, 85);
        doc.line(margin, y, pageW - margin, y);
        y += 16;
      }

      // ── Report Body ─────────────────────────────────────────────────────
      const lines = (displayReport || '').split('\n');
      for (const rawLine of lines) {
        if (rawLine.startsWith('# ')) {
          checkY(28);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(241, 245, 249);
          doc.text(rawLine.replace(/^#\s*/, ''), margin, y);
          y += 22;
        } else if (rawLine.startsWith('## ')) {
          checkY(24);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(148, 163, 184);
          doc.text(rawLine.replace(/^##\s*/, ''), margin, y);
          y += 18;
        } else if (rawLine.startsWith('### ')) {
          checkY(20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(100, 116, 139);
          doc.text(rawLine.replace(/^###\s*/, ''), margin, y);
          y += 16;
        } else if (rawLine.startsWith('- ') || rawLine.startsWith('* ')) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(203, 213, 225);
          const bullet = '•  ' + rawLine.substring(2);
          const wrapped = doc.splitTextToSize(bullet, contentW - 10);
          checkY(wrapped.length * 14);
          doc.text(wrapped, margin + 8, y);
          y += wrapped.length * 14 + 2;
        } else if (rawLine.trim() === '') {
          y += 6;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(203, 213, 225);
          const wrapped = doc.splitTextToSize(rawLine, contentW);
          checkY(wrapped.length * 14);
          doc.text(wrapped, margin, y);
          y += wrapped.length * 14 + 4;
        }
      }

      // ── Footer ──────────────────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`¹ SEC EDGAR  ² Bloomberg Terminal  ³ Alternative Indicators API`, margin, pageH - 28);
        doc.text(`Page ${p} of ${totalPages}`, pageW - margin - 40, pageH - 28);
      }

      doc.save(`${safeCompany}_${safeAgentName}.pdf`);
    });
  };

  const isFleetRunning = runningAgentId !== null;
  const activeAgent = AGENTS.find(a => a.id === activeAgentId);
  const isActiveRunning = runningAgentId === activeAgentId;

  return (
    <div className="min-h-screen bg-[#0E131F] text-slate-300 font-sans p-6 flex flex-col items-center">

      {/* Header */}
      <div className="w-full max-w-[1600px] mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-500 tracking-tight m-0 border-none">
            Agentic Diligence
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {fleetDeployed
              ? `Fleet locked to: ${lockedCompany} — click any agent to view its analysis`
              : 'Enter a company and deploy the full agent fleet.'}
          </p>
        </div>
        <div className="flex gap-4 w-[520px]">
          <input
            type="text"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="Target Company (e.g., Apple)"
            className="flex-1 px-4 py-2 bg-[#1A2235] border border-cyan-500/30 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none placeholder-slate-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
            disabled={isFleetRunning}
            onKeyDown={e => { if (e.key === 'Enter') deployFleet(); }}
          />
          <button
            onClick={deployFleet}
            disabled={isFleetRunning || !company}
            className="bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30 text-cyan-300 px-6 py-2 rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)] disabled:opacity-50 whitespace-nowrap"
          >
            {isFleetRunning ? `Running ${AGENTS.find(a => a.id === runningAgentId)?.name?.split(' ')[0]}...` : 'Deploy Fleet'}
          </button>
        </div>
      </div>

      <div className="w-full max-w-[1600px] grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">

        {/* Col 1: Agent Fleet */}
        <div className="col-span-3 bg-[#131A2A] border border-slate-700/50 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-[#182136]">
            <h2 className="text-lg font-semibold text-slate-200 m-0">Agent Fleet Status</h2>
            <span className="text-xs text-slate-500 font-mono">{AGENTS.length} agents</span>
          </div>
          <div className="flex justify-between px-6 py-3 text-xs text-slate-500 border-b border-slate-700/30 uppercase tracking-wider font-semibold">
            <span>Agent</span><span>Rating</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {AGENTS.map(agent => {
              const c = COLOR_MAP[agent.color];
              const status = agentStatuses[agent.id];
              const isActive = activeAgentId === agent.id;
              const isRunning = runningAgentId === agent.id;
              const isDone = status === 'done';
              const isError = status === 'error';
              const isCached = !!cache.current[agent.id];

              return (
                <button
                  key={agent.id}
                  onClick={() => fleetDeployed && selectAgent(agent.id)}
                  disabled={!fleetDeployed}
                  className={`w-full text-left flex items-center justify-between p-3 rounded-xl border transition-all duration-200
                    ${isActive
                      ? `${c.activeBorder} bg-[#1E2A42] shadow-lg ring-1 ${c.ring}`
                      : 'border-slate-700/30 bg-[#1A233A] hover:border-slate-600/50 hover:bg-[#1E2A42]'}
                    ${!fleetDeployed ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
                      {isRunning ? (
                        <><div className={`absolute w-4 h-4 rounded-full ${c.ping} opacity-20 animate-ping`} /><div className={`absolute w-2.5 h-2.5 rounded-full ${c.dot} ${c.glow}`} /></>
                      ) : isDone ? (
                        <div className={`w-2.5 h-2.5 rounded-full ${c.dot} ${c.glow}`} />
                      ) : isError ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_8px_#f87171]" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-200 leading-tight">{agent.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{agent.role}</div>
                      <div className="text-[10px] text-slate-600">{agent.subRole}</div>
                      {agent.hasViz && <div className="text-[9px] text-emerald-500 mt-0.5 font-semibold">📊 Includes Charts</div>}
                      {isCached && !isRunning && <div className="text-[9px] text-slate-500 mt-0.5">✓ cached — click to view</div>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className={`font-mono text-base font-bold ${c.text}`}>{agent.rating}</span>
                    {isDone  && <span className="text-[9px] text-emerald-400 font-semibold uppercase">Done</span>}
                    {isRunning && <span className={`text-[9px] ${c.text} font-semibold uppercase animate-pulse`}>Live</span>}
                    {isError && <span className="text-[9px] text-red-400 font-semibold uppercase">Error</span>}
                    {!fleetDeployed && <span className="text-[9px] text-slate-600 uppercase">Idle</span>}
                  </div>
                </button>
              );
            })}
          </div>
          {!fleetDeployed && (
            <div className="p-3 border-t border-slate-700/30 text-center text-xs text-slate-600 italic">
              Enter a company and hit Deploy Fleet
            </div>
          )}
          {fleetDeployed && isFleetRunning && (
            <div className="p-3 border-t border-slate-700/30 text-center text-xs text-amber-500 font-mono animate-pulse">
              Fleet running… {AGENTS.filter(a => agentStatuses[a.id] === 'done').length}/{AGENTS.length} complete
            </div>
          )}
          {fleetDeployed && !isFleetRunning && (
            <div className="p-3 border-t border-slate-700/30 text-center text-xs text-emerald-500 font-mono">
              ✓ All agents complete — results cached
            </div>
          )}
        </div>

        {/* Col 2: Timeline */}
        <div className="col-span-4 bg-[#131A2A] border border-slate-700/50 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-700/50 bg-[#182136]">
            <h2 className="text-lg font-semibold text-slate-200 m-0">Glass Brain Timeline</h2>
            {activeAgent && (
              <p className={`text-xs mt-1 ${COLOR_MAP[activeAgent.color].text} font-mono`}>
                ▶ {activeAgent.name} {cache.current[activeAgent.id] ? '(cached)' : ''}
              </p>
            )}
          </div>
          <div className="flex-1 p-8 overflow-y-auto relative">
            <div className="absolute left-[47.5px] top-12 bottom-12 w-[2px] bg-slate-800" />
            <div className="space-y-8 relative">
              <TimelineStep label="Document Ingestion" status={displayReport ? 'done' : 'idle'} />
              <TimelineStep label="Entity Verification" status={(displayLogs.length > 0 && displayReport) ? 'done' : 'idle'} />

              {/* Active step */}
              <div className="flex gap-6 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all
                  ${isActiveRunning ? 'bg-amber-500/20 border border-amber-500' : displayReport ? 'bg-emerald-500/20 border border-emerald-500' : 'bg-slate-800 border border-slate-700'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full transition-all
                    ${isActiveRunning ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : displayReport ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-slate-600'}`} />
                </div>
                <div className="pt-1 w-full z-10">
                  <div className={`border rounded-xl p-4 transition-all
                    ${isActiveRunning ? 'border-amber-500/30 bg-amber-500/5' : displayReport ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-700/30'}`}>
                    <h3 className="text-slate-200 font-semibold text-sm">{activeAgent?.name || 'Analysis'}</h3>
                    <p className={`text-xs mt-1 font-medium ${isActiveRunning ? 'text-amber-500' : 'text-slate-500'}`}>
                      {isActiveRunning ? activeAgent?.taskHint : displayReport ? 'Completed' : 'Awaiting deployment'}
                    </p>
                  </div>
                  {(isActiveRunning || displayReport) && (
                    <div className="mt-4 border border-cyan-500/50 bg-cyan-900/10 rounded-xl p-4 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                      <h4 className="text-sm font-semibold text-cyan-100 mb-3">Correction Steps</h4>
                      <div className="space-y-2">
                        <div className="bg-cyan-900/20 border border-cyan-800/50 p-2.5 rounded-lg text-xs text-cyan-300/80">Cross-referencing SEC Filings</div>
                        <div className="bg-cyan-900/20 border border-cyan-800/50 p-2.5 rounded-lg text-xs text-cyan-300/80">Verifying Alternative Data Sources</div>
                      </div>
                      {isActiveRunning && (
                        <div className="mt-4 flex justify-center">
                          <div className="flex items-center gap-3 px-6 py-2 bg-teal-500/20 border border-teal-400 text-teal-300 font-mono text-xs uppercase rounded tracking-widest w-full justify-center">
                            <span className="flex gap-1">{[0,75,150].map(d => <span key={d} className="h-3 w-0.5 bg-teal-400 animate-pulse" style={{ animationDelay: `${d}ms` }} />)}</span>
                            Recalculating
                            <span className="flex gap-1">{[150,75,0].map((d, i) => <span key={i} className="h-3 w-0.5 bg-teal-400 animate-pulse" style={{ animationDelay: `${d}ms` }} />)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <TimelineStep label="Risk Assessment" status={displayReport ? 'done' : 'idle'} dim={!displayReport} />
              <TimelineStep label="Final Report" status={displayReport ? 'done' : 'idle'} dim={!displayReport} />
            </div>
          </div>
        </div>

        {/* Col 3: Memorandum */}
        <div id="memo-col" className="col-span-5 bg-[#131A2A] border border-slate-700/50 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-[#182136]">
            <div>
              <h2 className="text-lg font-semibold text-slate-200 m-0">Investment Memorandum</h2>
              {activeAgent && cache.current[activeAgent.id] && (
                <p className="text-[10px] text-emerald-500 mt-0.5 font-mono">✓ Loaded from cache</p>
              )}
            </div>
            <button id="export-btn" onClick={downloadPDF}
              className="bg-cyan-400 text-cyan-950 font-semibold px-4 py-1.5 rounded text-sm shadow-[0_0_15px_rgba(34,211,238,0.5)] hover:bg-cyan-300 transition-colors">
              One-Click Export to PDF
            </button>
          </div>

          <div id="memo-content" className="flex-1 overflow-y-auto p-8 max-w-none text-slate-300 pr-10">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 font-mono text-sm">
                [SYSTEM ERROR] {error}
              </div>
            )}

            {/* Charts for financial analyst */}
            {displayVizData && <FinancialDashboard data={displayVizData} />}

            {/* Live traces */}
            {!displayReport && isActiveRunning && (
              <div className="font-mono text-sm space-y-3 p-4 bg-[#182136] rounded-xl border border-slate-700/50">
                <div className="text-slate-500 font-semibold mb-2 uppercase text-xs tracking-widest border-b border-slate-700 pb-2">
                  Live Agent Traces — {activeAgent?.name}
                </div>
                {displayLogs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-slate-600 opacity-50">{'>'}</span>
                    <span className="text-cyan-300 leading-relaxed break-words text-xs">{log}</span>
                  </div>
                ))}
                {displayLogs.length === 0 && <div className="text-slate-600 italic text-xs">Initializing agent...</div>}
                <div ref={logsEndRef} />
              </div>
            )}

            {/* Empty state */}
            {!displayReport && !isActiveRunning && !error && !displayVizData && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="text-slate-700 text-5xl">⬡</div>
                <p className="text-slate-500 italic text-sm max-w-xs">
                  {fleetDeployed
                    ? 'Select an agent from the fleet to view its analysis.'
                    : 'Enter a company name and hit Deploy Fleet to start all agents.'}
                </p>
                {!fleetDeployed && <p className="text-emerald-600 text-xs">📊 Financial Analyst includes live charts</p>}
              </div>
            )}

            {/* Markdown report */}
            {displayReport && (
              <div className="mt-2 text-[14px] leading-relaxed">
                {displayReport.split('\n').map((line, i) => {
                  if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold text-slate-200 mt-5 mb-2">{line.replace(/^###\s*/, '')}</h3>;
                  if (line.startsWith('## '))  return <h2 key={i} className="text-xl font-bold text-slate-100 mt-7 mb-3">{line.replace(/^##\s*/, '')}</h2>;
                  if (line.startsWith('# '))   return <h1 key={i} className="text-2xl font-bold text-white mt-8 mb-4">{line.replace(/^#\s*/, '')}</h1>;
                  if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 mb-1.5 text-slate-300 text-sm">{line.substring(2)}</li>;
                  if (line.trim() === '') return <br key={i} />;
                  return <p key={i} className="mb-3 text-slate-300 text-sm">{line}</p>;
                })}
              </div>
            )}

            {displayReport && (
              <div className="mt-10 pt-5 border-t border-slate-700/50 text-xs text-slate-500 space-y-1">
                <div><sup className="text-cyan-500">1</sup> Data Source: <span className="text-cyan-600 underline cursor-pointer">SEC EDGAR</span></div>
                <div><sup className="text-cyan-500">2</sup> Bloomberg Data: <span className="text-cyan-600 underline cursor-pointer">Bloomberg Terminal Extract</span></div>
                <div><sup className="text-cyan-500">3</sup> Proprietary Alt Data: <span className="text-cyan-600 underline cursor-pointer">Alternative Indicators API</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}