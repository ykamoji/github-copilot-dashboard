# GitHub Copilot Dashboard — Service Architecture

> A single-glance view of all service layers, workflows, and data flows.

## Complete Service Architecture

```mermaid
flowchart TB
    %% ━━━ STYLING ━━━
    classDef source fill:#0d9488,stroke:#0f766e,color:#fff,font-weight:bold
    classDef process fill:#f97316,stroke:#ea580c,color:#fff,font-weight:bold
    classDef store fill:#6366f1,stroke:#4f46e5,color:#fff,font-weight:bold
    classDef api fill:#8b5cf6,stroke:#7c3aed,color:#fff,font-weight:bold
    classDef frontend fill:#0ea5e9,stroke:#0284c7,color:#fff,font-weight:bold
    classDef auth fill:#f59e0b,stroke:#d97706,color:#fff,font-weight:bold
    classDef admin fill:#ec4899,stroke:#db2777,color:#fff,font-weight:bold
    classDef hook fill:#10b981,stroke:#059669,color:#fff,font-weight:bold
    classDef user fill:#64748b,stroke:#475569,color:#fff,font-weight:bold

    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    %% LAYER 1: DATA INGESTION PIPELINE
    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    subgraph INGEST["🔄 Data Ingestion Pipeline"]
        direction LR
        VSCODE["🖥️ VS Code\nWorkspace Storage\n(JSONL session logs)"]:::source
        HOOK["⚡ Git Hook\n(Entry Point)"]:::hook
        ANALYSIS["📜 Orchestrator Script\n(waits for log flush,\nruns pipeline in background)"]:::process
        EXTRACT["📊 Usage Extractor\n(parse JSONL → extract\nmodel, tokens, credits,\ntimings, sessions)"]:::process
        CSV["📄 CSV File\n(intermediate output)"]:::store
        UPLOAD["⬆️ DB Uploader\n(type-convert,\nstamp user ID,\nbulk upsert)"]:::process

        VSCODE --> HOOK
        HOOK -->|"triggers"| ANALYSIS
        ANALYSIS -->|"step 1"| EXTRACT
        EXTRACT -->|"writes"| CSV
        ANALYSIS -->|"step 2"| UPLOAD
        CSV -->|"reads"| UPLOAD
    end

    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    %% LAYER 2: DATABASE
    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    subgraph DB["🗄️ Database"]
        direction LR
        USAGE_COL["📋 Usage Records\n(model, tokens, credits,\ntimestamps, sessions)"]:::store
        USERS_COL["👤 Users\n(credentials, roles,\nbudget settings)"]:::store
        SESSIONS_COL["🔑 Sessions\n(auth tokens,\nauto-expire 1hr)"]:::store
    end

    UPLOAD -->|"upserts records\n(dedup: timestamp+model+user)"| USAGE_COL

    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    %% SEED DATA (auxiliary)
    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    SEED["🌱 Demo Data Seeder\n(generate 800-1000 records,\ncreate demo viewer account)"]:::process
    SEED -->|"inserts demo records"| USAGE_COL
    SEED -->|"creates demo user"| USERS_COL

    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    %% LAYER 3: API SERVER
    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    subgraph API["⚙️ API Server"]
        direction TB

        subgraph AUTH_ENDPOINTS["🔐 Authentication"]
            direction LR
            REGISTER["Register\n(name, email, password\n→ auto-login)"]:::auth
            LOGIN["Login\n(email, password\n→ token)"]:::auth
            DEMO["Demo Login\n(no credentials\n→ viewer token)"]:::auth
            LOGOUT["Logout\n(invalidate token)"]:::auth
            SESSION["Session Check\n(validate token\n→ user info)"]:::auth
        end

        subgraph DATA_ENDPOINTS["📡 Data Endpoints"]
            direction LR
            CACHE["🗃️ Response Cache\n(per-user, per-query,\n5 min TTL)"]:::api
            MODELS_EP["Models\n(distinct model list)"]:::api
            MONTHS_EP["Available Months\n(date range discovery)"]:::api
            USAGE_EP["Usage Records\n(filter by date, model;\ngroup by session;\ncredit parsing)"]:::api
            CLEAR_CACHE["Clear Cache\n(force refresh)"]:::api
        end

        subgraph ADMIN_ENDPOINTS["🛡️ Admin Endpoints"]
            direction LR
            LIST_USERS["List All Users\n(admin only)"]:::admin
            RESET_PW["Reset User Password\n(admin only;\ninvalidates sessions)"]:::admin
            VIEW_OTHER["View Any User's Data\n(admin override\non data endpoints)"]:::admin
        end

        subgraph PROFILE_EP["👤 Profile"]
            UPDATE_PROFILE["Update Profile\n(password, budget)"]:::api
        end
    end

    %% DB ↔ API connections
    USAGE_COL <-->|"query / aggregate"| DATA_ENDPOINTS
    USERS_COL <-->|"read / write"| AUTH_ENDPOINTS
    USERS_COL <-->|"read / write"| ADMIN_ENDPOINTS
    USERS_COL <-->|"read / write"| PROFILE_EP
    SESSIONS_COL <-->|"create / validate / delete"| AUTH_ENDPOINTS

    %% Cache feeds data endpoints
    CACHE -.->|"serves cached\nresponses"| MODELS_EP
    CACHE -.->|"serves cached\nresponses"| MONTHS_EP
    CACHE -.->|"serves cached\nresponses"| USAGE_EP

    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    %% LAYER 4: FRONTEND APPLICATION
    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    subgraph FRONTEND["🌐 Frontend Application"]
        direction TB

        subgraph LANDING["🏠 Landing Page"]
            direction LR
            SIGNUP["Sign Up Form"]:::frontend
            SIGNIN["Sign In Form"]:::frontend
            DEMO_BTN["View Demo\nDashboard"]:::frontend
        end

        subgraph DASH["📊 User Dashboard"]
            direction TB

            subgraph CONTROLS["🎛️ Controls & Filters"]
                direction LR
                MODEL_FILTER["Model Filter\n(multi-select)"]:::frontend
                DATE_NAV["Date Navigation\n(week/month shift,\npresets, custom range)"]:::frontend
                SESSION_TOGGLE["Session Grouping\nToggle"]:::frontend
                CREDIT_TOGGLE["Credit Type Toggle\n(auto-switch based\non data)"]:::frontend
                MONTH_PICKER["Month Quick-Picker\n(available months)"]:::frontend
                SYNC_BTN["🔄 Go Live\n(clear cache,\nrefresh data)"]:::frontend
            end

            subgraph SUMMARY["📈 Summary & Insights"]
                direction LR
                CREDITS_TILE["Credits Tile\n(total credits,\nrecord count)"]:::frontend
                COST_TILE["Cost Tile\n(estimated USD,\ngrand total)"]:::frontend
                TOKENS_TILE["Tokens Tile\n(input / output /\nthinking breakdown)"]:::frontend
                BUDGET_CARD["Budget Progress\n(daily / weekly /\nmonthly bars)"]:::frontend
                FORECAST_CARD["Monthly Forecast\n(projected spend,\nvs budget comparison)"]:::frontend
                AVG_SPEND["Avg Daily Spend\n(all-time baseline,\nweekly/monthly projection)"]:::frontend
            end

            subgraph VIZ["📉 Visualizations"]
                direction LR
                CREDITS_CHART["Credits Over\nTime (line)"]:::frontend
                TOKEN_CHART["Token Breakdown\n(bar)"]:::frontend
                PIE_CHART["Model Distribution\n(pie)"]:::frontend
                HEATMAP["Usage Heatmap\n(hourly / daily)"]:::frontend
                SCATTER["Performance\nAnalysis (scatter)"]:::frontend
            end

            subgraph TABLES["📋 Data Tables"]
                direction LR
                RECORDS_TABLE["Usage Records\n(sortable, paginated,\ncollapsible)"]:::frontend
                COST_MODAL["Cost Breakdown\nModal (by session\n& model)"]:::frontend
            end
        end

        subgraph ADMIN_UI["🛡️ Admin Panel"]
            direction LR
            USER_TABLE["User Management\nTable (search,\nlist all users)"]:::admin
            PW_RESET_MODAL["Password Reset\nModal"]:::admin
            USER_DASH["View User's\nDashboard"]:::admin
        end

        subgraph PROFILE_UI["⚙️ Profile Page"]
            direction LR
            BUDGET_INPUT["Set AI Credit\nBudget"]:::frontend
            PW_CHANGE["Change\nPassword"]:::frontend
        end
    end

    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    %% FRONTEND → API CONNECTIONS
    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    SIGNUP -->|"register"| REGISTER
    SIGNIN -->|"login"| LOGIN
    DEMO_BTN -->|"demo login"| DEMO

    CONTROLS -->|"fetch filtered data"| USAGE_EP
    CONTROLS -->|"fetch models"| MODELS_EP
    MONTH_PICKER -->|"fetch months"| MONTHS_EP
    SYNC_BTN -->|"clear + refetch"| CLEAR_CACHE

    ADMIN_UI -->|"list users"| LIST_USERS
    PW_RESET_MODAL -->|"reset password"| RESET_PW
    USER_DASH -->|"fetch user data\n(admin override)"| VIEW_OTHER

    PROFILE_UI -->|"update settings"| UPDATE_PROFILE

    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    %% USER ACTORS
    %% ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    DEV["👨‍💻 Developer"]:::user
    ADMIN_USER["👑 Admin"]:::user
    DEMO_USER["👁️ Demo Viewer"]:::user

    DEV -->|"codes in VS Code\n(generates logs)"| VSCODE
    DEV -->|"signs up / logs in"| LANDING
    DEV -->|"analyzes usage"| DASH
    DEV -->|"manages settings"| PROFILE_UI

    ADMIN_USER -->|"manages users"| ADMIN_UI
    ADMIN_USER -->|"views any dashboard"| USER_DASH

    DEMO_USER -->|"explores demo"| DEMO_BTN
    DEMO_USER -->|"views read-only\ndashboard"| DASH
```

---

## Service Layer Summary

```mermaid
flowchart LR
    classDef layer1 fill:#0d9488,stroke:#0f766e,color:#fff,font-weight:bold
    classDef layer2 fill:#6366f1,stroke:#4f46e5,color:#fff,font-weight:bold
    classDef layer3 fill:#8b5cf6,stroke:#7c3aed,color:#fff,font-weight:bold
    classDef layer4 fill:#0ea5e9,stroke:#0284c7,color:#fff,font-weight:bold
    classDef layer5 fill:#64748b,stroke:#475569,color:#fff,font-weight:bold

    L1["📥 Ingestion Layer\n─────────────────\n• Git hook trigger\n• Log extraction\n• CSV transformation\n• DB upload (upsert)\n• Demo data seeding"]:::layer1

    L2["🗄️ Storage Layer\n─────────────────\n• Usage records\n• User accounts\n• Auth sessions (1hr TTL)\n• Unique indexes"]:::layer2

    L3["⚙️ API Layer\n─────────────────\n• Auth (register/login/demo)\n• Token-based sessions\n• Data queries + aggregation\n• Per-user response cache\n• Role-based access (user/admin/viewer)"]:::layer3

    L4["🌐 Presentation Layer\n─────────────────\n• Landing + auth forms\n• Interactive dashboard\n• 5 chart types + heatmap\n• Budget tracking + forecasting\n• Admin user management\n• Profile settings"]:::layer4

    L5["👤 User Layer\n─────────────────\n• Developer (primary)\n• Admin (manages all)\n• Demo Viewer (read-only)"]:::layer5

    L5 --> L4 --> L3 --> L2
    L1 --> L2
```

---

## Data Ingestion Flow (Hook-triggered)

```mermaid
flowchart LR
    classDef trigger fill:#10b981,stroke:#059669,color:#fff,font-weight:bold
    classDef step fill:#f97316,stroke:#ea580c,color:#fff,font-weight:bold
    classDef data fill:#6366f1,stroke:#4f46e5,color:#fff,font-weight:bold

    COMMIT["Git Commit/Push"]:::trigger
    HOOK["Git Hook\n(entry point)"]:::trigger
    WAIT["Wait for\nVS Code flush\n(20s delay)"]:::step
    PARSE["Parse JSONL\nsession logs"]:::step
    EXTRACT["Extract per-request:\n• Model name\n• Credit rate or amount\n• Token counts\n• Response timing\n• Session ID\n• Timestamp"]:::step
    CSV["Write to CSV"]:::data
    CONVERT["Type-convert\n& stamp user ID"]:::step
    UPSERT["Bulk upsert to DB\n(dedup on timestamp\n+ model + user)"]:::step
    DB["Database"]:::data

    COMMIT --> HOOK --> WAIT --> PARSE --> EXTRACT --> CSV --> CONVERT --> UPSERT --> DB
```

---

## Authentication & User Roles

```mermaid
flowchart TB
    classDef auth fill:#f59e0b,stroke:#d97706,color:#fff,font-weight:bold
    classDef role fill:#0ea5e9,stroke:#0284c7,color:#fff,font-weight:bold
    classDef action fill:#8b5cf6,stroke:#7c3aed,color:#fff,font-weight:bold

    subgraph AUTH_FLOW["Authentication Flow"]
        direction TB
        LANDING["Landing Page"]:::auth
        REG["Register\n(name + email + password)"]:::auth
        LOG["Login\n(email + password)"]:::auth
        DEM["Demo Login\n(no credentials)"]:::auth
        TOKEN["Session Token Issued\n(auto-expires in 1 hour)"]:::auth

        LANDING --> REG --> TOKEN
        LANDING --> LOG --> TOKEN
        LANDING --> DEM --> TOKEN
    end

    subgraph ROLES["User Roles & Permissions"]
        direction TB
        USER_ROLE["👨‍💻 User\n• View own dashboard\n• Update own profile\n• Set credit budget"]:::role
        ADMIN_ROLE["👑 Admin\n• All user permissions\n• View any user's data\n• List all users\n• Reset passwords"]:::role
        VIEWER_ROLE["👁️ Viewer\n• Read-only dashboard\n• Demo data only\n• No profile editing"]:::role
    end

    TOKEN --> USER_ROLE
    TOKEN --> ADMIN_ROLE
    TOKEN --> VIEWER_ROLE

    subgraph PROTECTED["Protected Actions"]
        direction TB
        OWN_DATA["Fetch own usage,\nmodels, months"]:::action
        FILTER["Filter by date,\nmodel, session"]:::action
        CACHE_CLEAR["Force data refresh"]:::action
        PROFILE_EDIT["Change password,\nset budget"]:::action
        ADMIN_OPS["User management,\npassword resets,\nview other dashboards"]:::action
    end

    USER_ROLE --> OWN_DATA
    USER_ROLE --> FILTER
    USER_ROLE --> CACHE_CLEAR
    USER_ROLE --> PROFILE_EDIT
    ADMIN_ROLE --> ADMIN_OPS
    VIEWER_ROLE --> OWN_DATA
    VIEWER_ROLE --> FILTER
```

---

## Dashboard Analytics Flow

```mermaid
flowchart TB
    classDef control fill:#0d9488,stroke:#0f766e,color:#fff,font-weight:bold
    classDef data fill:#6366f1,stroke:#4f46e5,color:#fff,font-weight:bold
    classDef viz fill:#0ea5e9,stroke:#0284c7,color:#fff,font-weight:bold
    classDef insight fill:#f59e0b,stroke:#d97706,color:#fff,font-weight:bold

    subgraph INPUTS["User Controls"]
        direction LR
        DATES["📅 Date Range\n(shift, presets,\ncustom picker)"]:::control
        MODELS["🏷️ Model Filter\n(multi-select from\navailable models)"]:::control
        SESSION["🔗 Session\nGrouping"]:::control
        CREDIT_TYPE["💳 Credit Type\n(auto-detected:\nrate vs absolute)"]:::control
    end

    FETCH["Fetch Usage Data\n(with filters applied)"]:::data
    ALL_TIME["Fetch All-Time\nData (no filters)"]:::data

    INPUTS --> FETCH
    INPUTS --> ALL_TIME

    subgraph ANALYTICS["Analytics Output"]
        direction TB

        subgraph HERO["Hero Summary Tiles"]
            direction LR
            C1["Total Credits"]:::viz
            C2["Estimated Cost (USD)"]:::viz
            C3["Token Breakdown\n(input/output/thinking)"]:::viz
        end

        subgraph INSIGHTS["Budget & Forecasting"]
            direction LR
            B1["Budget Progress\n(daily/weekly/monthly\nprogress bars)"]:::insight
            B2["Monthly Forecast\n(projected vs budget)"]:::insight
            B3["Avg Daily Spend\n(all-time baseline)"]:::insight
        end

        subgraph CHARTS["Interactive Charts"]
            direction LR
            V1["📈 Credits Over Time\n(line chart)"]:::viz
            V2["📊 Token Breakdown\n(stacked bar)"]:::viz
            V3["🥧 Model Distribution\n(pie chart)"]:::viz
            V4["🌡️ Usage Heatmap\n(hourly × daily)"]:::viz
            V5["⚡ Performance\n(latency scatter)"]:::viz
        end

        subgraph TABLE["Data Tables"]
            direction LR
            T1["📋 Records Table\n(sortable, paginated)"]:::viz
            T2["💰 Cost Modal\n(breakdown by\nsession & model)"]:::viz
        end
    end

    FETCH --> HERO
    FETCH --> CHARTS
    FETCH --> TABLE
    ALL_TIME --> INSIGHTS
    FETCH --> INSIGHTS
```
