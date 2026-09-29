import os
import joblib
import numpy as np

# Paths relative to this script's location
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODEL_DIR = os.path.join(BASE_DIR, 'models')

FUTURE_SCORE_MODEL_PATH = os.path.join(MODEL_DIR, "future_score_model.pkl")
TREND_MODEL_PATH = os.path.join(MODEL_DIR, "trend_model.pkl")
RISK_MODEL_PATH = os.path.join(MODEL_DIR, "risk_model.pkl")
FUTURE_HEALTH_MODEL_PATH = os.path.join(MODEL_DIR, "future_health_model.pkl")

# Helper function to reload models (useful when model is retrained in runtime)
def load_prediction_models():
    try:
        score = joblib.load(FUTURE_SCORE_MODEL_PATH)
        trend = joblib.load(TREND_MODEL_PATH)
        risk = joblib.load(RISK_MODEL_PATH)
        health = joblib.load(FUTURE_HEALTH_MODEL_PATH)
        return score, trend, risk, health
    except Exception as e:
        print(f"Warning: Forecasting models could not be loaded in predict.py (using rule-based fallback): {e}")
        return None, None, None, None

score_model, trend_model, risk_model, health_model = load_prediction_models()

import pandas as pd

CONTRIB_COLS = ["commits", "merged_prs", "issues_closed", "code_reviews", "active_days", "consistency", "contribution_score"]
REPO_COLS = ["commit_activity", "pr_activity", "issue_resolution_rate", "contributor_participation", "repository_maintenance", "review_participation", "health_score"]

def predict_contributor_future(commits: int, prs: int, issues: int, reviews: int, active_days: int, consistency: float, current_score: float):
    """Predict future score, performance trend, and contributor risk."""
    global score_model, trend_model, risk_model, health_model
    if score_model is None or trend_model is None or risk_model is None:
        score_model, trend_model, risk_model, health_model = load_prediction_models()

    # Rule-based fallback function
    def heuristic_fallback():
        diff = 2.0 if active_days >= 4 else (-2.0 if active_days <= 1 else 0.0)
        f_score = max(0.0, min(100.0, float(current_score + diff)))
        tr = "Stable"
        if f_score > current_score + 1:
            tr = "Improving"
        elif f_score < current_score - 1:
            tr = "Declining"
            
        rk = "Low"
        if f_score < 45 or active_days < 2:
            rk = "High"
        elif f_score < 60:
            rk = "Medium"
        return round(f_score, 1), tr, rk

    if score_model is None or trend_model is None or risk_model is None:
        return heuristic_fallback()
        
    try:
        features_df = pd.DataFrame(
            [[commits, prs, issues, reviews, active_days, consistency, current_score]],
            columns=CONTRIB_COLS
        )
        features_np = features_df.values
        
        # Check whether models were fitted with feature names
        use_df_score = hasattr(score_model, "feature_names_in_")
        use_df_trend = hasattr(trend_model, "feature_names_in_")
        use_df_risk = hasattr(risk_model, "feature_names_in_")
        
        # Predict score
        inp_score = features_df if use_df_score else features_np
        pred_score = float(score_model.predict(inp_score)[0])
        pred_score = max(0.0, min(100.0, pred_score))
        
        # Predict trend
        trend_labels = ["Declining", "Stable", "Improving"]
        inp_trend = features_df if use_df_trend else features_np
        pred_trend_idx = int(trend_model.predict(inp_trend)[0])
        pred_trend = trend_labels[min(max(0, pred_trend_idx), 2)]
        
        # Predict risk
        risk_labels = ["Low", "Medium", "High"]
        inp_risk = features_df if use_df_risk else features_np
        pred_risk_idx = int(risk_model.predict(inp_risk)[0])
        pred_risk = risk_labels[min(max(0, pred_risk_idx), 2)]
        
        return round(pred_score, 1), pred_trend, pred_risk
    except Exception as e:
        print(f"Warning: ML contributor prediction exception ({e}), using heuristic fallback.")
        return heuristic_fallback()

def predict_repository_future(commit_activity: float, pr_activity: float, issue_resolution_rate: float, contributor_participation: float, repository_maintenance: float, review_participation: float, health_score: float):
    """Predict future repository health score."""
    global score_model, trend_model, risk_model, health_model
    if health_model is None:
        score_model, trend_model, risk_model, health_model = load_prediction_models()
        
    def heuristic_fallback():
        diff = 1.5 if commit_activity >= 70 and pr_activity >= 70 else (-1.5 if commit_activity < 40 else 0.0)
        f_health = max(0.0, min(100.0, float(health_score + diff)))
        return round(f_health, 1)

    if health_model is None:
        return heuristic_fallback()
        
    try:
        features_df = pd.DataFrame(
            [[commit_activity, pr_activity, issue_resolution_rate, contributor_participation, repository_maintenance, review_participation, health_score]],
            columns=REPO_COLS
        )
        features_np = features_df.values
        use_df_health = hasattr(health_model, "feature_names_in_")
        inp_health = features_df if use_df_health else features_np
        pred_health = float(health_model.predict(inp_health)[0])
        pred_health = max(0.0, min(100.0, pred_health))
        return round(pred_health, 1)
    except Exception as e:
        print(f"Warning: ML repository health prediction exception ({e}), using heuristic fallback.")
        return heuristic_fallback()