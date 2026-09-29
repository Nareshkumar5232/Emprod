# RepoIntel — AI-Powered Repository Analytics & Contributor Intelligence Platform

RepoIntel is an enterprise-grade Repository Analytics and Contributor Intelligence SaaS platform built with FastAPI, PostgreSQL, Scikit-Learn, MLflow, Evidently AI, and React (Neo Brutalism design).

> [!IMPORTANT]
> **ENGINEERING ACTIVITY SCORE DISCLAIMER**:
> The contribution score measures observable repository activity (commits, pull requests, issues, reviews, consistency) and should **NOT** be interpreted as a complete or objective measure of an employee's overall ability or performance. GitHub activity alone does not determine software engineering quality.
>
> **REAL GROUND TRUTH ML FORECASTING**:
> Machine Learning in RepoIntel does not use fabricated productivity labels (e.g. synthetic "High/Medium/Low Performer" labels). Instead, predictive models forecast future observable metrics (future score, trend trajectory, contributor engagement risk, and repository health) based on real chronological repository snapshots stored in PostgreSQL.

---

## Table of Contents
1. [Problem Statement & Overview](#problem-statement--overview)
2. [Architecture & System Design](#architecture--system-design)
3. [Technology Stack](#technology-stack)
4. [Database Architecture & Schema](#database-architecture--schema)
5. [Contribution Scoring & Health Engine](#contribution-scoring--health-engine)
6. [Machine Learning Pipeline](#machine-learning-pipeline)
7. [MLOps Pipeline (MLflow & Drift Detection)](#mlops-pipeline-mlflow--drift-detection)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Local Setup & Running](#local-setup--running)
10. [Docker Orchestration](#docker-orchestration)
11. [Environment Variables](#environment-variables)
12. [Deployment Guide](#deployment-guide)
13. [Testing & Quality Assurance](#testing--quality-assurance)
14. [Limitations & Future Roadmap](#limitations--future-roadmap)

---

## 1. Problem Statement & Overview

Engineering leaders and open-source maintainers frequently struggle to obtain objective visibility into repository maintenance velocity, pull request cycles, code review bandwidth, and contributor workload balance without resorting to invasive monitoring tools or ungrounded synthetic metrics.

RepoIntel bridges this gap by:
1. Connecting directly to the **live GitHub REST API** using real repository URLs.
2. Ingesting commits, pull requests, issues, branches, releases, and contributor metrics.
3. Calculating transparent, explainable heuristic scores for repository health and developer engagement.
4. Storing historical audit snapshots in a normalized **PostgreSQL** database.
5. Forecasting future metric trends and contributor burnout/churn risks using Random Forest models trained on empirical sequence snapshots.
6. Enforcing production MLOps standards via **MLflow experiment tracking** and **Evidently AI / KS-test data drift detection**.
7. Serving analytics through a handcrafted **Neo Brutalism** design system featuring high-contrast typography, bold borders, and responsive interactive data visualizations.

---

## 2. Architecture & System Design

```
+-----------------------------------------------------------------------------------+
|                                  USER / BROWSER                                   |
|                         React Neo Brutalist SPA (:3000 / :8000)                   |
+------------------------------------------+----------------------------------------+
                                           |
                              HTTP / REST  |  Authorization Bearer JWT
                                           v
+-----------------------------------------------------------------------------------+
|                                FASTAPI BACKEND (:8000)                            |
|                                                                                   |
|  +------------------+    +-----------------------+    +------------------------+  |
|  |   Auth & Roles   |    |  GitHub Data Ingest   |    |    Analytics Engine    |  |
|  |  (Admin/Leader/  |    |  (Requests + Token    |    |  - Contribution Score  |  |
|  |     Viewer)      |    |   Rate Limit Guard)   |    |  - 6-Factor Health     |  |
|  +------------------+    +-----------+-----------+    +-----------+------------+  |
|                                      |                            |               |
|                                      v                            v               |
|  +-----------------------------------------------------------------------------+  |
|  |                         ML / FORECASTING INFERENCE                          |  |
|  |  - Future Score Forecaster (Regressor)   - Future Health Model (Regressor)  |  |
|  |  - Trend Direction (Classifier)          - Contributor Risk (Classifier)    |  |
|  +-----------------------------------+-----------------------------------------+  |
|                                      |                                            |
|                                      v                                            |
|  +-----------------------------------------------------------------------------+  |
|  |                          MLOPS MONITORING ENGINE                            |  |
|  |  - Evidently AI / KS-Test Drift Detection  - Retraining Pipeline Trigger     |  |
|  +-----------------------------------+-----------------------------------------+  |
+--------------------------------------|--------------------------------------------+
                                       |
                     +-----------------+-----------------+
                     |                                   |
                     v                                   v
+--------------------------------------+   +----------------------------------------+
|      POSTGRESQL DATABASE (:5432)     |   |         MLFLOW REGISTRY (:5000)        |
|  - repositories       - contributors |   |  - Experiment: RepoSense_Forecasting   |
|  - repository_analyses- contributor_ |   |  - Metrics: RMSE, Accuracy, F1        |
|  - predictions        - history      |   |  - Artifacts: .pkl Model Binaries      |
|  - recommendations    - audit_logs   |   |  - Model Versioning & Hyperparameters  |
+--------------------------------------+   +----------------------------------------+
```

---

## 3. Technology Stack

* **Frontend**: React 18, Vite 6, Tailwind CSS & Vanilla CSS (Handcrafted Neo Brutalism design system), Axios, Lucide React, Recharts.
* **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic, SQLAlchemy ORM, Requests.
* **Database**: PostgreSQL 15 (with SQLite fallback for lightweight local dev), psycopg2-binary.
* **Machine Learning**: Scikit-Learn (RandomForestRegressor, RandomForestClassifier), NumPy, Pandas, Joblib.
* **MLOps**: MLflow 2.11+, Evidently AI, SciPy (Kolmogorov-Smirnov statistical tests).
* **Containerization & CI/CD**: Docker, Docker Compose, GitHub Actions.

---

## 4. Database Architecture & Schema

RepoIntel enforces a relational data model with foreign keys and cascade delete support:

```mermaid
erDiagram
    users {
        int id PK
        string username
        string password_hash
        string role
        datetime created_at
    }
    repositories {
        int id PK
        string repo_url
        string name
        string owner
        int stars
        int forks
        int watchers
        string languages
        string default_branch
        int branches_count
        int releases_count
        datetime repo_created_at
        datetime repo_updated_at
    }
    contributors {
        int id PK
        string username
        string avatar_url
        datetime created_at
    }
    repository_analyses {
        int id PK
        int repo_id FK
        datetime analyzed_at
        float commit_activity
        float pr_activity
        float issue_resolution
        float contributor_participation
        float maintenance_activity
        float review_participation
        float health_score
        string health_status
        int open_issues
        int closed_issues
        int recent_commits
        int pull_requests
    }
    contributor_analyses {
        int id PK
        int repo_analysis_id FK
        int contributor_id FK
        int commits
        int merged_prs
        int issues_closed
        int code_reviews
        float consistency
        int active_days
        float contribution_score
        string performance_category
        datetime timestamp
    }
    predictions {
        int id PK
        int repo_analysis_id FK
        int contributor_analysis_id FK
        string prediction_type
        float future_contribution_score
        float future_repository_health
        string contributor_risk
        string performance_trend
        datetime predicted_at
    }
    recommendations {
        int id PK
        int repo_analysis_id FK
        string recommendation_text
        string category
        string priority
    }
    history {
        int id PK
        int repo_id FK
        int repo_analysis_id FK
        datetime timestamp
        string action_type
        string summary
    }
    audit_logs {
        int id PK
        string user_role
        string action
        string endpoint
        string details
        datetime timestamp
    }

    repositories ||--o{ repository_analyses : tracks
    repositories ||--o{ history : logs
    repository_analyses ||--o{ contributor_analyses : records
    repository_analyses ||--o{ predictions : forecasts
    repository_analyses ||--o{ recommendations : guides
    contributors ||--o{ contributor_analyses : measures
```

---

## 5. Contribution Scoring & Health Engine

### Explainable Contribution Score
Evaluates individual contributor engagement across 5 normalized activity indicators:

$$\text{Contribution Score} = 0.30 \cdot C + 0.25 \cdot PR + 0.15 \cdot I + 0.15 \cdot R + 0.15 \cdot CS$$

Where:
* **Commits ($C$)**: Target ceiling of 50 commits (normalized to 100).
* **Pull Requests ($PR$)**: Target ceiling of 10 merged/open PRs (normalized to 100).
* **Issues ($I$)**: Target ceiling of 8 closed/addressed issues (normalized to 100).
* **Reviews ($R$)**: Target ceiling of 15 peer code review interactions (normalized to 100).
* **Consistency ($CS$)**: Active day ratio across observation period (normalized to 100).

Categories:
* **Elite/High**: Score $\ge 80.0$
* **Consistent/Medium**: Score $\ge 60.0$ and $< 80.0$
* **Low Activity**: Score $< 60.0$

### 6-Factor Repository Health Score
Evaluates repository stability and maintenance health on a 0–100 scale:
1. **Commit Activity (15%)**: Sustained commit frequency and recency.
2. **Pull Request Velocity (15%)**: Merging rate and turnaround cadence.
3. **Issue Resolution Rate (20%)**: Ratio of closed issues to total created issues.
4. **Contributor Participation (15%)**: Distribution of contributions to prevent single-person dependency.
5. **Maintenance Index (15%)**: Recency of releases, branch hygiene, and documentation assets.
6. **Code Review Participation (20%)**: Review distribution across team members.

---

## 6. Machine Learning Pipeline

Rather than classifying developers with synthetic labels, RepoIntel's ML pipeline predicts **future engineering trends** and **contributor risk** using historical snapshot sequences.

```
+---------------------------------------------------------------------------------+
|                                 ML PIPELINE SPEC                                |
+---------------------------------------------------------------------------------+
| INPUT FEATURES       | [commits, merged_prs, issues_closed, code_reviews,       |
|                      |  active_days, consistency, current_score]                |
|                      | Dimension: 7 continuous numerical features               |
+----------------------+----------------------------------------------------------+
| TARGET 1 (Forecast)  | future_contribution_score (Continuous [0.0, 100.0])      |
| TARGET 2 (Trend)     | performance_trend ("Improving", "Stable", "Declining")   |
| TARGET 3 (Risk)      | contributor_risk ("Low Risk", "Medium Risk", "High Risk")|
| TARGET 4 (Repo Health| future_repository_health (Continuous [0.0, 100.0])       |
+----------------------+----------------------------------------------------------+
| TRAINING DATA        | Historical 4-week sequences from PostgreSQL DB snapshots |
+----------------------+----------------------------------------------------------+
| ALGORITHMS           | - RandomForestRegressor(n_estimators=100, max_depth=6)   |
|                      | - RandomForestClassifier(n_estimators=100, max_depth=5)  |
+----------------------+----------------------------------------------------------+
| OUTPUT               | Future projected score, categorical trend trajectory,    |
|                      | churn/burnout risk alert, and projected repo health score|
+----------------------+----------------------------------------------------------+
| EVALUATION METRICS   | - Regressors: RMSE, MAE, R² score                        |
|                      | - Classifiers: Accuracy, F1-Score (macro), Confusion Mtx|
+----------------------+----------------------------------------------------------+
```

Legacy synthetic scripts and datasets have been permanently isolated into `dev_legacy/` for historical archival.

---

## 7. MLOps Pipeline (MLflow & Drift Detection)

### MLflow Tracking & Registry
* **Tracking URI**: `http://localhost:5000` (configurable via `MLFLOW_TRACKING_URI`).
* **Experiment**: `RepoSense_Forecasting`.
* **Logged Artifacts**: Model pickle binaries (`future_score_model.pkl`, `trend_model.pkl`, `risk_model.pkl`, `future_health_model.pkl`).
* **Logged Parameters**: `n_estimators`, `max_depth`, `random_state`, `dataset_size`.
* **Logged Metrics**: `contrib_score_rmse`, `contrib_trend_accuracy`, `contrib_risk_accuracy`, `repo_health_rmse`.

### Data Drift Monitoring
* **Evidently AI Integration**: Generates interactive HTML drift reports evaluating feature distribution shifts between reference snapshot distributions and current production data.
* **Kolmogorov-Smirnov Fallback**: In headless or resource-constrained deployments, executes a 2-sample Kolmogorov-Smirnov test at $\alpha = 0.05$ across all 7 features.
* If fewer than 10 contributor analyses are available across multiple snapshots, returns a graceful explanation:
  `"Insufficient historical data for drift detection. At least 10 contributor analyses across multiple snapshots are required."`

---

## 8. API Endpoints Reference

### Authentication
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new user account with role (`Admin`, `Team Leader`, `Viewer`). |
| `POST` | `/auth/login` | Public | Authenticate credentials and acquire JWT token. |

### Analytics & Processing
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/analyze-repo` | Auth / Public Read | Ingest real GitHub repo, run analytics engines, persist to DB, and forecast ML trends. |
| `POST` | `/team-ranking` | Public / Auth | Return contributor leaderboard sorted by contribution score. |
| `POST` | `/repository-health`| Public / Auth | Return 6-factor health score breakdown and status. |
| `POST` | `/recommendations` | Public / Auth | Generate heuristic recommendations for improving repo velocity and quality. |
| `POST` | `/top-performer` | Public / Auth | Identify top, most consistent, and most active contributors. |
| `POST` | `/risk-analysis` | Public / Auth | Surface contributor activity drop-off alerts. |
| `POST` | `/predict` | Public / Auth | What-If metric simulator predicting future score, trend, and risk from custom inputs. |

### History & Persistence
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/history` | Public / Auth | Full historical audit records with repo metrics and trend trajectories. |
| `GET` | `/recent` | Public / Auth | Latest repository analyses snapshots (newest first). |
| `GET` | `/stats` | Public / Auth | Platform overview KPI aggregates. |
| `GET` | `/repositories` | Public / Auth | List of all repositories tracked in the database. |
| `GET` | `/contributors/{user}`| Public / Auth| Detailed timeline and scoring history for an individual contributor. |
| `DELETE`| `/history` | Admin Only | Clear historical records and reset analysis cache (audited). |

### MLOps
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/drift-detection` | Auth / Admin | Run statistical KS drift analysis on contributor features. |
| `GET` | `/drift-report` | Auth / Admin | Return interactive Evidently AI HTML drift report. |
| `POST` | `/retrain` | Auth / Admin | Trigger model retraining pipeline on DB snapshot sequences and log to MLflow. |

---

## 9. Local Setup & Running

### Prerequisites
* Python 3.11+
* Node.js 18+ and npm
* Git
* (Optional) PostgreSQL 15 & Docker Desktop

### Quick Start (Single-Port Unified Mode)
The fastest way to run RepoIntel locally:

**On Windows (PowerShell):**
```powershell
# 1. Clone repository
git clone https://github.com/Nareshkumar5232/Emprod.git
cd Emprod

# 2. Set up Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Create .env configuration
Copy-Item .env.example .env
# Edit .env and paste your GITHUB_TOKEN

# 4. Launch unified server (builds frontend & serves API on :8000)
.\deploy.ps1
```

**On Linux / macOS (Bash):**
```bash
# 1. Set up Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Build frontend production assets
cd frontend
npm install
npm run build
cd ..

# 3. Configure environment
cp .env.example .env
# Add your GITHUB_TOKEN to .env

# 4. Start unified server
uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload
```
Open **`http://localhost:8000`** in your browser.

### Development Mode (Independent Hot-Reloading)
To run frontend and backend with hot-reload for UI development:

**Terminal 1 (Backend):**
```bash
uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 10. Docker Orchestration

RepoIntel is fully containerized. A multi-container stack boots the complete production topology:

```bash
docker compose up --build -d
```

### Services & Port Mappings
| Service | Container Name | Port | Description |
|---|---|---|---|
| `backend` | `repo_intel_backend` | `8000` | FastAPI REST API and analytics engine. |
| `frontend` | `repo_intel_frontend` | `3000` | Vite React Neo Brutalism web interface. |
| `db` | `repo_intel_db` | `5432` | PostgreSQL 15 persistence store with named volume. |
| `mlflow` | `repo_intel_mlflow` | `5000` | MLflow experiment tracking server. |

### Verifying Docker Services
```bash
docker compose ps
docker compose logs -f backend
```

---

## 11. Environment Variables

Create a `.env` file in the root directory (based on `.env.example`):

```ini
# GitHub API Integration (Required for high rate limits)
GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere

# PostgreSQL Database Persistence
# Production: postgresql://username:password@hostname:5432/dbname
# Local SQLite fallback: sqlite:///./productivity.db
DATABASE_URL=sqlite:///./productivity.db

# MLflow Tracking Registry
MLFLOW_TRACKING_URI=http://localhost:5000

# Authentication Secret
JWT_SECRET=supersecret-production-key-change-in-production

# CORS Configuration (Comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000

# Server Binding
HOST=0.0.0.0
PORT=8000
```

---

## 12. Deployment Guide

### Option A: Railway / Render (Backend + Database)
1. **Database**: Create a PostgreSQL instance on Neon.tech or Railway. Copy the provided connection string into `DATABASE_URL`.
2. **Backend**:
   * Link your GitHub repository.
   * Set root directory to `.`.
   * Set Build Command: `pip install -r requirements.txt && python -m src.db_seeder`
   * Set Start Command: `uvicorn src.app:app --host 0.0.0.0 --port $PORT`
   * Set Environment Variables: `DATABASE_URL`, `GITHUB_TOKEN`, `JWT_SECRET`, `CORS_ORIGINS`.

### Option B: Vercel (Frontend)
1. In the Vercel Dashboard, import the repository and set Root Directory to `frontend`.
2. Framework Preset: `Vite`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variables:
   * `VITE_API_URL`: Your deployed backend URL (e.g. `https://repointel-api.railway.app`).

---

## 13. Testing & Quality Assurance

A comprehensive test suite verifies GitHub parsing, scoring engines, database integrity, ML inference, and REST endpoints:

```bash
# Run pytest test suite
pytest tests/ -v
```

### Verified Test Cases:
* `test_parse_repo_url_valid_https`
* `test_parse_repo_url_with_git_suffix`
* `test_parse_repo_url_owner_repo_shorthand`
* `test_parse_repo_url_invalid_format`
* `test_calculate_contribution_score_bounds`
* `test_calculate_contribution_score_zero_division_safety`
* `test_get_repository_health_weights`
* `test_get_repository_health_empty_contributors_safety`
* `test_ml_prediction_models_loaded`
* `test_ml_prediction_inference_outputs`
* `test_ml_prediction_bounds_clamping`
* `test_database_persistence_repository_analysis`
* `test_database_history_retrieval`
* `test_jwt_auth_hashing_and_token_creation`
* `test_auth_login_invalid_credentials`
* `test_endpoint_api_stats`
* `test_endpoint_api_recent`
* `test_endpoint_api_history`
* `test_endpoint_api_predict_simulator`
* `test_endpoint_team_ranking`
* `test_endpoint_repository_health`
* `test_drift_detection_insufficient_data_handling`
* `test_delete_history_admin_authorization`

---

## 14. Limitations & Future Roadmap

1. **GitHub API Rate Limits**: Unauthenticated calls are capped at 60 requests/hour by GitHub. Users must supply a personal access token (`GITHUB_TOKEN`) for repositories with extensive commit/PR histories.
2. **Commit Author Resolution**: Commits made with Git emails not mapped to a GitHub user account appear aggregated under non-registered commit authors.
3. **ML Cold-Start**: Drift detection and sequence retraining require at least 2 distinct temporal snapshots and 10 contributor analyses. The platform returns clean informational messages during initial repository analysis before sufficient historical depth is accumulated.
