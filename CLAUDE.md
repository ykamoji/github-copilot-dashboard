<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:react-agent-rules -->
# React Best Practices for Next.js 16+

## UI Components & Client Interactions
- **Components are React Functions:** All UI components must be written as JavaScript or TypeScript functions that return JSX. Avoid using classes unless necessary.
- **Props are Immutable:** Props passed to components must be treated as read-only.
- **State Management:**
  - Use React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, etc.) for component-local state and side effects.
  - Avoid `React.Component` classes and `this.setState()`.
  - State updates should be treated as asynchronous. Use the functional form of `setState` when you need the previous state.
- **Event Handling:** Use inline event handlers (e.g., `onClick`) or delegate events to parent components. Avoid imperative DOM manipulation.
- **Rendering:**
  - Use `async/await` with React Server Components (RSCs) to fetch data directly on the server.
  - Use `"use client"` directives only when necessary for client-only features like event handlers or browser APIs.
  - Leverage React Suspense for concurrent rendering and graceful loading states.

## CSS & Styling
- **Global Styles:** Use the `globals.css` file in the `app` directory for global CSS rules.
- **Component Styles:**
  - **Option 1:** Local class names scoped to components (e.g., CSS modules, Tailwind classes).
  - **Option 2:** Inline styles for dynamic, component-specific styling.
  - **Option 3:** CSS-in-JS libraries (if explicitly allowed by the project architecture).

## Security & Best Practices
- **Server Components First:** Default to using React Server Components for data fetching and rendering to leverage server-side logic and security.
- **Client Data Fetching:** When data is needed on the client, fetch it within a `useEffect` hook or using a dedicated data fetching library (e.g., TanStack Query).
- **Forms:** Use standard HTML form elements with React state for form handling. Consider using libraries like React Hook Form for complex forms.
- **Tooling:** Use the latest version of Next.js (v15+) and React (v18+). Ensure all code is compatible with the App Router paradigm.
<!-- END:react-agent-rules -->

<!-- BEGIN:repo-architecture-rules -->
# Repository Architecture

This repository follows this structure. Please refer to this structure to understand where components, styles, and utilities are located:

```text
github-copilot-dashboard/
├── api/
│   └── index.py                          # Flask API server (auth, caching, CRUD)
├── app/                                  # Next.js frontend
│   ├── admin/                            # Admin routes
│   │   ├── user/[userId]/
│   │   │   ├── page.css                  # Per-user admin dashboard styles
│   │   │   └── page.tsx                  # Per-user admin dashboard
│   │   └── page.tsx                      # Admin panel entry
│   ├── components/
│   │   ├── admin/                        # Admin components
│   │   │   ├── AdminDashboard.css        # Admin dashboard styles
│   │   │   └── AdminDashboard.tsx        # User management table
│   │   ├── auth/                         # Authentication
│   │   │   ├── AuthContext.tsx           # React auth context & provider
│   │   │   ├── LoginPage.css             # Landing page styles
│   │   │   └── LoginPage.tsx             # Landing page with sign-in / sign-up
│   │   ├── charts/                       # Visualization components
│   │   │   ├── CreditsLineChart.tsx      # Credit usage over time
│   │   │   ├── ModelPieChart.tsx         # Model distribution pie chart
│   │   │   ├── PerformanceScatter.tsx    # Token latency scatter plot
│   │   │   ├── TokensBarChart.tsx        # Token usage bar chart
│   │   │   └── UsageHeatmap.tsx          # Activity heatmap
│   │   ├── controls/                     # Filter & navigation controls
│   │   │   ├── Controls.css              # Controls panel styles
│   │   │   ├── Controls.tsx              # Main filter panel
│   │   │   └── Dropdown.tsx              # Reusable dropdown component
│   │   ├── dashboard/                    # Main dashboard orchestrator
│   │   │   ├── ChartsPanel.css           # Charts grid styles
│   │   │   ├── ChartsPanel.tsx           # Charts grid orchestrator
│   │   │   ├── CollapsibleSection.css    # Collapsible wrapper styles
│   │   │   ├── CollapsibleSection.tsx    # Reusable expand/collapse wrapper
│   │   │   ├── Dashboard.tsx             # Main dashboard orchestrator
│   │   │   ├── DashboardHeader.css       # Header styles
│   │   │   ├── DashboardHeader.tsx       # Header with user profile menu
│   │   │   ├── InsightsRow.css           # Budget & forecast styles
│   │   │   ├── InsightsRow.tsx           # Budget & forecast metrics
│   │   │   ├── SummaryBox.css            # Hero tiles styles
│   │   │   └── SummaryBox.tsx            # Hero tiles for credits/costs
│   │   └── tables/                       # Data tables & modals
│   │       ├── costModal/
│   │       │   ├── CostModal.css         # Cost modal styles
│   │       │   └── CostModal.tsx         # Detailed cost breakdown modal
│   │       └── recordsTable/
│   │           ├── RecordsTable.css      # Usage table styles
│   │           └── RecordsTable.tsx      # Paginated usage records table
│   ├── hooks/
│   │   └── useFetchWithCache.ts          # Custom caching fetch hook
│   ├── main/                             # Main user routes
│   │   └── page.tsx                      # User dashboard entry
│   ├── profile/
│   │   └── page.tsx                      # User profile & credentials page
│   ├── utils/
│   │   ├── controlHelpers.ts             # Date and UI helpers
│   │   └── pricing.ts                    # Model pricing calculations & map
│   ├── globals.css                       # Design tokens & base styles
│   ├── layout.tsx                        # Root layout
│   ├── page.module.css                   # NextJS page module styles
│   ├── page.tsx                          # Entry page (redirects based on auth)
│   └── types.ts                          # Shared TypeScript interfaces
├── preprocess/                           # Backend / Processing scripts
│   ├── analysis.sh                       # Analysis shell script
│   ├── github_copilot_usage_tracker.py   # VS Code logs extractor
│   ├── migrate_user_id.py                # Database migration helper
│   ├── push_to_mongodb.py                # MongoDB uploader script
│   └── seed_demo_data.py                 # Generates demo usage data
├── public/                               # Static assets
│   └── images/
│       └── landing-bg.png                # Landing background asset
├── AGENTS.md                             # AI Assistant rules
├── README.md                             # Project documentation
├── .env.example                          # Env variables template
├── package.json                          # Node.js dependencies
└── requirements.txt                      # Python dependencies
```
<!-- END:repo-architecture-rules -->
