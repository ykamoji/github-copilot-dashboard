# GitHub Copilot Usage Dashboard

A personal analytics dashboard for tracking and visualizing your GitHub Copilot AI credit usage across models, sessions, and time.

## Why This Matters

GitHub's recent changes to Copilot billing for **Business and Enterprise** users removed per-user visibility into credit consumption and cost breakdowns. Usage is now aggregated at the organization level, leaving individual developers with no way to see how many credits they're consuming, which models cost the most, or how their usage trends over time.

This dashboard fills that gap. It extracts your usage data directly from VS Code's local workspace storage, stores it in MongoDB, and serves it through a clean analytics UI — giving you full visibility into your own Copilot consumption.

## Features

- **Credit & Cost Tracking** — View absolute credits, rate multipliers, and estimated USD cost per model
- **Multi-Model Analytics** — Filter and compare usage across GPT-4.1, Claude Sonnet 4, Gemini 3.1 Pro, and other supported models
- **Interactive Charts** — Credits over time, token breakdown bars, model distribution pie charts, performance scatter plots, and usage heatmaps (hourly & daily views)
- **Date Navigation** — Shift by week/month, use presets (This Week, This Month, Last 30 Days), or pick custom ranges
- **Session Grouping** — Toggle to aggregate records by coding session
- **Smart Credit Toggle** — Automatically switches between absolute credits and rate multipliers based on available data
- **Detailed Records Table** — Sortable, collapsible table with every individual usage record
- **Cost Breakdown Modal** — Click-to-expand cost analysis grouped by session and model

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Charts** | Recharts |
| **Styling** | Vanilla CSS (glassmorphism dark theme) |
| **Backend API** | Python Flask |
| **Database** | MongoDB |
| **Data Extraction** | Python scripts parsing VS Code workspace storage |

## Architecture

```
github-copilot-dashboard/
├── app/                          # Next.js frontend
│   ├── components/
│   │   ├── charts/               # Visualization components
│   │   │   ├── CreditsLineChart.tsx
│   │   │   ├── TokensBarChart.tsx
│   │   │   ├── ModelPieChart.tsx
│   │   │   ├── PerformanceScatter.tsx
│   │   │   └── UsageHeatmap.tsx
│   │   ├── controls/             # Filter & navigation controls
│   │   │   ├── Controls.tsx
│   │   │   └── Controls.css
│   │   ├── dashboard/            # Main dashboard orchestrator
│   │   │   └── Dashboard.tsx
│   │   └── tables/               # Data tables & modals
│   │       ├── RecordsTable.tsx
│   │       ├── RecordsTable.css
│   │       ├── CostModal.tsx
│   │       └── CostModal.css
│   ├── utils/
│   │   └── pricing.ts            # Model pricing dictionary
│   ├── types.ts                  # Shared TypeScript interfaces
│   ├── globals.css               # Design tokens & base styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Entry page
├── api/
│   └── index.py                  # Flask API server
├── preprocess/
│   ├── github_copilot_usage_tracker.py   # Extracts usage from VS Code logs
│   └── push_to_mongodb.py               # Uploads extracted CSV to MongoDB
├── .env.example                  # Environment variable template
├── requirements.txt              # Python dependencies
└── package.json                  # Node.js dependencies
```

## How It Works

```
VS Code Workspace Storage
        │
        ▼
┌──────────────────────┐
│  1. Extract & Parse  │  preprocess/github_copilot_usage_tracker.py
│  JSONL session logs  │  → copilot_credit_usage.csv
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  2. Upload to DB     │  preprocess/push_to_mongodb.py
│  CSV → MongoDB       │  → copilot.dashboard collection
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  3. Serve API        │  api/index.py (Flask :5328)
│  /api/usage          │  Filters by date, model, session
│  /api/models         │  Returns distinct model names
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  4. Render Dashboard │  Next.js frontend (:3000)
│  Charts, tables,     │  Proxies /api/* → Flask
│  controls, filters   │
└──────────────────────┘
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.10
- **MongoDB** instance (local or Atlas)

### 1. Clone & Install

```bash
git clone https://github.com/ykamoji/github-copilot-dashboard.git
cd github-copilot-dashboard

# Frontend dependencies
npm install

# Python dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB connection details:

```
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority
MONGO_DB=copilot
MONGO_COLLECTION=dashboard
```

### 3. Extract & Load Usage Data

```bash
# Step 1: Extract usage from VS Code workspace storage → CSV
python preprocess/github_copilot_usage_tracker.py

# Step 2: Push CSV records to MongoDB
python preprocess/push_to_mongodb.py
```

> **Note:** The tracker script path in `github_copilot_usage_tracker.py` points to VS Code's default workspace storage location on macOS. Update the `ROOT` variable if your setup differs.

### 4. Run the App

Open **two terminal windows**:

```bash
# Terminal 1 — Flask API
python api/index.py
```

```bash
# Terminal 2 — Next.js frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## License

MIT
