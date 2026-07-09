import os
import datetime
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_squared_error, accuracy_score
import joblib
import mlflow
import mlflow.sklearn

from src.database import SessionLocal
from src.models_db import ContributorAnalysis, RepositoryAnalysis, MLExperiment

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models")

# Model Paths
FUTURE_SCORE_MODEL_PATH = os.path.join(MODEL_DIR, "future_score_model.pkl")
TREND_MODEL_PATH = os.path.join(MODEL_DIR, "trend_model.pkl")
RISK_MODEL_PATH = os.path.join(MODEL_DIR, "risk_model.pkl")
FUTURE_HEALTH_MODEL_PATH = os.path.join(MODEL_DIR, "future_health_model.pkl")

def get_ml_dataset():
    """Extract sequence datasets from DB for contributor and repo health trends."""
    db = SessionLocal()
    
    # 1. Gather Contributor Sequences
    # Group by contributor and sort by timestamp
    all_ca = db.query(ContributorAnalysis).order_by(ContributorAnalysis.contributor_id, ContributorAnalysis.timestamp).all()
    
    contrib_groups = {}
    for ca in all_ca:
        if ca.contributor_id not in contrib_groups:
            contrib_groups[ca.contributor_id] = []
        contrib_groups[ca.contributor_id].append(ca)
        
    contrib_features = []
    contrib_targets_score = []
    contrib_targets_trend = []
    contrib_targets_risk = []
    
    for cid, analyses in contrib_groups.items():
        if len(analyses) < 2:
            continue # Needs at least 2 points in time to observe a transition
            
        for i in range(len(analyses) - 1):
            curr = analyses[i]
            nxt = analyses[i+1]
            
            # Features (Current Period)
            feats = [
                curr.commits,
                curr.merged_prs,
                curr.issues_closed,
                curr.code_reviews,
                curr.active_days,
                curr.consistency,
                curr.contribution_score
            ]
            
            # Targets (Next Period)
            f_score = nxt.contribution_score
            
            # Trend calculation
            score_diff = f_score - curr.contribution_score
            if score_diff > 4:
                trend = "Improving"
            elif score_diff < -4:
                trend = "Declining"
            else:
                trend = "Stable"
                
            # Risk calculation
            if f_score < 45 or nxt.active_days < 2:
                risk = "High"
            elif f_score < 60:
                risk = "Medium"
            else:
                risk = "Low"
                
            contrib_features.append(feats)
            contrib_targets_score.append(f_score)
            contrib_targets_trend.append(trend)
            contrib_targets_risk.append(risk)
            
    # 2. Gather Repository Health Sequences
    all_ra = db.query(RepositoryAnalysis).order_by(RepositoryAnalysis.repo_id, RepositoryAnalysis.analyzed_at).all()
    
    repo_groups = {}
    for ra in all_ra:
        if ra.repo_id not in repo_groups:
            repo_groups[ra.repo_id] = []
        repo_groups[ra.repo_id].append(ra)
        
    repo_features = []
    repo_targets_health = []
    
    for rid, analyses in repo_groups.items():
        if len(analyses) < 2:
            continue
            
        for i in range(len(analyses) - 1):
            curr = analyses[i]
            nxt = analyses[i+1]
            
            feats = [
                curr.commit_activity,
                curr.pr_activity,
                curr.issue_resolution_rate,
                curr.contributor_participation,
                curr.repository_maintenance,
                curr.review_participation,
                curr.health_score
            ]
            
            repo_features.append(feats)
            repo_targets_health.append(nxt.health_score)
            
    db.close()
    
    return (
        np.array(contrib_features),
        np.array(contrib_targets_score),
        np.array(contrib_targets_trend),
        np.array(contrib_targets_risk),
        np.array(repo_features),
        np.array(repo_targets_health)
    )

def train_and_log():
    """Train models and log results to MLflow and local database."""
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    X_c, y_c_score, y_c_trend, y_c_risk, X_r, y_r_health = get_ml_dataset()
    
    if len(X_c) == 0 or len(X_r) == 0:
        print("Warning: Insufficient historical transitions in DB for training. Seeding must be run first.")
        return {"error": "Insufficient dataset. Seed database first."}
        
    # Model 1: Future Contribution Score (Regression)
    X_train_c, X_test_c, y_train_cs, y_test_cs = train_test_split(X_c, y_c_score, test_size=0.2, random_state=42)
    score_model = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42)
    score_model.fit(X_train_c, y_train_cs)
    score_pred = score_model.predict(X_test_c)
    score_rmse = float(np.sqrt(mean_squared_error(y_test_cs, score_pred)))
    
    # Model 2: Performance Trend (Classification: Improving, Stable, Declining)
    # Target values to integers for sklearn
    trend_labels = ["Declining", "Stable", "Improving"]
    y_c_trend_encoded = np.array([trend_labels.index(t) for t in y_c_trend])
    X_train_ct, X_test_ct, y_train_ct, y_test_ct = train_test_split(X_c, y_c_trend_encoded, test_size=0.2, random_state=42, stratify=y_c_trend_encoded)
    trend_model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    trend_model.fit(X_train_ct, y_train_ct)
    trend_pred = trend_model.predict(X_test_ct)
    trend_acc = float(accuracy_score(y_test_ct, trend_pred))
    
    # Model 3: Contributor Risk (Classification: Low, Medium, High)
    risk_labels = ["Low", "Medium", "High"]
    y_c_risk_encoded = np.array([risk_labels.index(r) for r in y_c_risk])
    X_train_cr, X_test_cr, y_train_cr, y_test_cr = train_test_split(X_c, y_c_risk_encoded, test_size=0.2, random_state=42, stratify=y_c_risk_encoded)
    risk_model = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    risk_model.fit(X_train_cr, y_train_cr)
    risk_pred = risk_model.predict(X_test_cr)
    risk_acc = float(accuracy_score(y_test_cr, risk_pred))
    
    # Model 4: Future Repository Health (Regression)
    X_train_r, X_test_r, y_train_rh, y_test_rh = train_test_split(X_r, y_r_health, test_size=0.2, random_state=42)
    health_model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
    health_model.fit(X_train_r, y_train_rh)
    health_pred = health_model.predict(X_test_r)
    health_rmse = float(np.sqrt(mean_squared_error(y_test_rh, health_pred)))
    
    # Save models locally
    joblib.dump(score_model, FUTURE_SCORE_MODEL_PATH)
    joblib.dump(trend_model, TREND_MODEL_PATH)
    joblib.dump(risk_model, RISK_MODEL_PATH)
    joblib.dump(health_model, FUTURE_HEALTH_MODEL_PATH)
    
    print("Models saved successfully to models/ directory.")
    
    # Log to MLflow
    run_id = ""
    try:
        os.environ["MLFLOW_ALLOW_FILE_STORE"] = "true"
        tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db")
        mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment("engineering_platform_forecasting")
        
        with mlflow.start_run() as run:
            run_id = run.info.run_id
            
            # Log params
            mlflow.log_param("n_estimators", 100)
            mlflow.log_param("score_max_depth", 6)
            mlflow.log_param("dataset_transitions", len(X_c))
            mlflow.log_param("repo_transitions", len(X_r))
            
            # Log metrics
            mlflow.log_metric("contrib_score_rmse", score_rmse)
            mlflow.log_metric("contrib_trend_accuracy", trend_acc)
            mlflow.log_metric("contrib_risk_accuracy", risk_acc)
            mlflow.log_metric("repo_health_rmse", health_rmse)
            
            # Log models as artifacts
            mlflow.sklearn.log_model(score_model, "future_score_model")
            mlflow.sklearn.log_model(trend_model, "trend_model")
            mlflow.sklearn.log_model(risk_model, "risk_model")
            mlflow.sklearn.log_model(health_model, "future_health_model")
            
            print(f"MLflow Run logged successfully. Run ID: {run_id}")
    except Exception as e:
        print(f"Warning: MLflow logging bypassed or encountered error: {e}")
        
    # Log to MLExperiments database table
    try:
        db = SessionLocal()
        exp = MLExperiment(
            run_id=run_id or f"local-run-{datetime.datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
            experiment_name="engineering_platform_forecasting",
            accuracy=round((trend_acc + risk_acc) / 2.0, 4),
            dataset_size=int(len(X_c)),
            parameters=json.dumps({"n_estimators": 100, "max_depth": 5}),
            metrics=json.dumps({
                "contrib_score_rmse": round(score_rmse, 3),
                "contrib_trend_accuracy": round(trend_acc, 3),
                "contrib_risk_accuracy": round(risk_acc, 3),
                "repo_health_rmse": round(health_rmse, 3)
            })
        )
        db.add(exp)
        db.commit()
        db.close()
    except Exception as e:
        print(f"Could not save experiment metrics to DB: {e}")
        
    return {
        "status": "Success",
        "contrib_score_rmse": score_rmse,
        "contrib_trend_accuracy": trend_acc,
        "contrib_risk_accuracy": risk_acc,
        "repo_health_rmse": health_rmse,
        "run_id": run_id
    }

if __name__ == "__main__":
    train_and_log()