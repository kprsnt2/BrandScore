<div align="center">

# 🔥 rAsh Score

### AI Brand Intelligence Platform for India

**Measure how AI models perceive, recommend, and rank your brand**

[![Live Demo](https://img.shields.io/badge/Live-bs.kprsnt.in-667eea?style=for-the-badge&logo=vercel&logoColor=white)](https://bs.kprsnt.in)
[![Dashboard](https://img.shields.io/badge/Dashboard-India%20rAsh%20Index-34d399?style=for-the-badge)](https://bs.kprsnt.in/dashboard)
[![Intelligence](https://img.shields.io/badge/Intelligence-Cross--Industry-a855f7?style=for-the-badge)](https://bs.kprsnt.in/intelligence)

**285 brands · 19 industries · 61+ days of data · multi-model AI analysis**

[Live Demo](https://bs.kprsnt.in) · [Architecture Docs](docs/ARCHITECTURE.md) · [Data Dictionary](docs/DATA_DICTIONARY.md) · [Changelog](docs/CHANGELOG.md)

</div>

---

## What is rAsh Score?

rAsh Score answers a question every brand will face: **"When someone asks an AI about your industry, does it recommend you?"**

It queries multiple AI models with standardized prompts and computes a **0-100 visibility score** across four dimensions — Recommendation, Sentiment, Prominence, and Accuracy. It runs daily via GitHub Actions, building a longitudinal dataset of how AI perception changes over time.

> Based on [LLM Recommendation Manipulation Research](https://kprsnt.in/blog/manipulating-llm-recommendations-brand-influence) — published research on how AI recommendations can be influenced.

---

## Key Features

### 📊 India rAsh Index Dashboard
Live dashboard tracking 285 Indian brands across 19 industries with daily score updates, rank deltas, model filtering, and export (CSV/JSON/PDF).

### 🧠 Cross-Industry Intelligence
Bird's-eye analytics page with industry leaderboard, **model bias heatmap** (how NVIDIA vs Groq perceive brands differently), top movers, score distributions with statistical analysis, and Pearson correlation matrix.

### 🔍 Live Brand Check
Enter any brand name → get real-time AI visibility analysis from multiple models with actionable optimization tips.

### 📈 Brand Detail Pages
Per-brand deep dives with historical trend charts (custom SVG), per-model score comparison, industry ranking context, and competitor analysis.

### 🤖 Multi-Model Pipeline
Daily automated scoring via GitHub Actions querying:
- **NVIDIA Nemotron** (550B parameter model)
- **Groq Llama 3.3** (70B, ultra-fast inference)
- **NVIDIA GLM 5.1** (specialized for structured output)

### 💡 AI-Generated Insights
Daily narrative insights per industry — AI analyzes score movements and generates contextual analysis with chained memory (each insight references the previous day's).

---

## Architecture

```
GitHub Actions (Daily Cron 01:30 UTC)
  → run-pipeline.ts (better-sqlite3)
    → NVIDIA Nemotron API
    → Groq API (Llama, GLM)
  → brand-intelligence.db (SQLite)
  → Git commit + push

Vercel (Auto-deploy on push)
  → Next.js 16 (sql.js WASM)
    → /api/brands          (Dashboard data)
    → /api/intelligence    (Cross-industry analytics)
    → /api/check-brand     (Live AI analysis)
    → /api/compare-brands  (Head-to-head)
  → Dashboard UI
  → Intelligence UI
  → Brand Detail Pages (SSR + ISR)
```

> 📐 See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full Mermaid diagrams (system, ER, pipeline)

### Dual Database Strategy

| Context | Library | Why |
|---------|---------|-----|
| Pipeline (GitHub Actions) | `better-sqlite3` (native) | Sync API, fast writes, WAL mode |
| API Routes (Vercel) | `sql.js` (WASM) | Works in serverless, no native modules |

The SQLite database is committed directly to git — Vercel reads it from the filesystem. No external database infrastructure needed.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 16, React 18, TypeScript | SSR/ISR, excellent DX |
| **Styling** | Tailwind CSS 3.4 | Dark theme, utility-first |
| **Animation** | Framer Motion | Smooth section transitions |
| **Charts** | Custom SVG | Zero dependencies, full control |
| **Database** | SQLite (sql.js + better-sqlite3) | Portable, serverless-compatible |
| **AI Models** | NVIDIA Nemotron, Groq Llama/GLM | Multi-model bias detection |
| **CI/CD** | GitHub Actions | Daily automated pipeline |
| **Hosting** | Vercel | Zero-config, ISR caching |
| **Validation** | Zod | Runtime type safety |

---

## Data Engineering Highlights

- **ETL Pipeline**: TypeScript-based daily extraction from multiple AI APIs, transformation (JSON parsing, fuzzy brand matching, cross-model score aggregation), and loading into SQLite with transactions
- **Statistical Computing**: Pearson correlation, median, standard deviation — all in pure TypeScript without external stats libraries
- **SQL Analytics**: Window functions (`ROW_NUMBER`), CTEs, cross-model aggregation, rank deltas between pipeline runs
- **Data Quality**: Fuzzy brand name matching across models, score validation, error handling with fallback chains
- **Schema Design**: Normalized tables with dual-row pattern — `model=NULL` for aggregated scores, `model=<name>` for per-model bias analysis

> 📖 See [docs/DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md) for full schema documentation

---

## AI Engineering Highlights

- **Multi-Model Orchestration**: Parallel API calls to NVIDIA + Groq with retry logic, model fallback chains, and timeout handling
- **Structured Output Parsing**: Extracts typed JSON scores from LLM free-text responses using Zod validation
- **Model Bias Detection**: Cross-model score comparison reveals systematic biases (e.g., NVIDIA rates Finance higher, Groq rates FMCG higher)
- **Insight Chaining**: Daily AI-generated insights use previous day's insight as context, creating coherent narrative threads
- **Prompt Engineering**: Standardized evaluation prompts ensure consistent cross-model comparison

---

## Scoring System

| Dimension | Max Score | Weight | What It Measures |
|-----------|----------|--------|-----------------|
| **Recommendation** | 40 | 40% | How strongly AI recommends the brand |
| **Sentiment** | 30 | 30% | Positive vs negative perception tone |
| **Prominence** | 20 | 20% | How early and often the brand appears |
| **Accuracy** | 10 | 10% | Factual correctness of AI's knowledge |
| **rAsh Score** | **100** | **100%** | Composite AI visibility score |

### Interpretation

| Score | Rating | Meaning |
|-------|--------|---------|
| 85–100 | 🟢 Excellent | Brand dominates AI recommendations |
| 70–84 | 🟢 Good | Strong AI visibility |
| 55–69 | 🟡 Average | Decent presence, room for improvement |
| 40–54 | 🟠 Low | Minimal AI visibility |
| 0–39 | 🔴 Poor | Brand is largely invisible to AI |

---

## Quick Start

### Prerequisites
- Node.js 18+
- NVIDIA API key ([build.nvidia.com](https://build.nvidia.com))
- Groq API key ([console.groq.com](https://console.groq.com))

### Installation

```bash
git clone https://github.com/kprsnt2/BrandScore.git
cd BrandScore

npm install

# Configure environment
cp .env.example .env.local
# Add: NVIDIA_API_KEY=your_key
# Add: GROQ_API_KEY=your_key

npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run tests |
| `npm run typecheck` | TypeScript type check |

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/brands` | GET | Industry brand rankings with deltas |
| `/api/brands/search` | GET | Brand search across industries |
| `/api/brands/timeline` | GET | Historical score data |
| `/api/brands/insights` | GET | AI-generated daily insights |
| `/api/intelligence` | GET | Cross-industry analytics |
| `/api/check-brand` | POST | Live AI brand analysis |
| `/api/compare-brands` | POST | Head-to-head comparison |
| `/api/health` | GET | System health check |

> 📖 See [docs/INTELLIGENCE.md](docs/INTELLIGENCE.md) for Intelligence API response schema

---

## Project Structure

```
├── .github/workflows/
│   ├── daily-pipeline.yml        # Daily brand scoring (01:30 UTC)
│   └── daily-insights.yml        # Daily insight generation (03:00 UTC)
├── data/
│   └── brand-intelligence.db     # SQLite database (committed to git)
├── docs/
│   ├── ARCHITECTURE.md           # System architecture + Mermaid diagrams
│   ├── DATA_DICTIONARY.md        # Tables, columns, metrics
│   ├── INTELLIGENCE.md           # Intelligence feature docs
│   └── CHANGELOG.md              # Version history
├── scripts/
│   ├── run-pipeline.ts           # Daily ETL pipeline
│   └── run-insights.ts           # Daily insight generation
├── src/
│   ├── app/
│   │   ├── api/                  # Next.js API routes
│   │   ├── brand/[brand]/        # Dynamic brand pages (SSR)
│   │   ├── dashboard/            # India rAsh Index
│   │   └── intelligence/         # Cross-industry analytics
│   ├── components/               # React components
│   └── lib/
│       ├── db.ts                 # Database helpers (sql.js)
│       ├── nvidia.ts             # NVIDIA API client
│       ├── groq.ts               # Groq API client
│       ├── scoring.ts            # Score calculation logic
│       ├── industry-data.ts      # 19 industry definitions
│       ├── ui-utils.ts           # Shared score utilities
│       ├── types.ts              # Shared TypeScript interfaces
│       └── validation.ts         # Zod schemas
└── package.json
```

---

## Deployment

### Vercel (Recommended)

The app auto-deploys from the `main` branch. The daily pipeline (GitHub Actions) pushes DB updates → triggers Vercel rebuild.

Required secrets in Vercel:
- `NVIDIA_API_KEY`
- `GROQ_API_KEY`

Required secrets in GitHub:
- `NVIDIA_API_KEY`
- `GROQ_API_KEY`

---

## Research Foundation

This project operationalizes findings from published research on AI brand visibility:

> **"Manipulating LLM Recommendations: Brand Influence in the Age of AI"**
> — [Read the research](https://kprsnt.in/blog/manipulating-llm-recommendations-brand-influence)

Key finding: AI models develop persistent brand preferences based on training data, and these preferences systematically influence purchase recommendations. rAsh Score quantifies this effect at scale.

---

## Author

**Prashanth Kumar Kadasi** — AI & Data Engineer

- 🌐 [kprsnt.in](https://kprsnt.in)
- 🐦 [@kprsnt2](https://twitter.com/kprsnt2)
- 💻 [@kprsnt2](https://github.com/kprsnt2)

---

## License

MIT License — see [LICENSE](LICENSE) for details.
