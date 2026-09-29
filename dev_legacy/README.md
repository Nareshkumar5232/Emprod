# Legacy Development & Synthetic Prototype Archive

> [!NOTE]
> This folder preserves the initial proof-of-concept development files and synthetic datasets.
> **These files are NOT used in production.**

### Archived Files
- `generate_dataset.py`: Prototype generator for synthetic productivity figures.
- `legacy_train.py`: Prototype training script referencing synthetic classification labels.
- `employee_productivity.csv`: Synthetic dataset generated from arbitrary weighting formulas.
- `productivity_model.pkl` & `label_encoder.pkl`: Artifacts fitted on synthetic labels.
- `exploration.ipynb`: Initial notebook exploration.

### Production Architecture
Production RepoIntel does **NOT** use synthetic labels or assume employee productivity can be defined by simulated High/Medium/Low categories. Instead:
1. **Explainable Analytics Engine (`src/github_service.py`)**: Computes objective, transparent engineering activity scores (commits, PRs, reviews, issues, consistency) with explicit disclaimers that it measures observable repository activity.
2. **Machine Learning Pipeline (`src/train.py`, `src/predict.py`)**: Trained on real, chronological transitions from PostgreSQL snapshots to forecast future score velocity, performance trends, and contributor risk alerts using Scikit-Learn Random Forests tracked via MLflow.
