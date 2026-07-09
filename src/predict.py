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

def predict_contributor_future(commits: int, prs: int, issues: int, reviews: int, active_days: int, consistency: float, current_score: float):
    """Predict future score, performance trend, and contributor risk."""
    global score_model, trend_model, risk_model, health_model
    if score_model is None or trend_model is None or risk_model is None:
        # Reload models in case they were trained after import
        score_model, trend_model, risk_model, health_model = load_prediction_models()
        
    if score_model is None or trend_model is None or risk_model is None:
        # Heuristic Fallback (deterministic)
        diff = 2.0 if active_days >= 4 else (-2.0 if active_days <= 1 else 0.0)
        future_score = max(0.0, min(100.0, float(current_score + diff)))
        trend = "Stable"
        if future_score > current_score + 1:
            trend = "Improving"
        elif future_score < current_score - 1:
            trend = "Declining"
            
        risk = "Low"
        if future_score < 45 or active_days < 2:
            risk = "High"
        elif future_score < 60:
            risk = "Medium"
            
        return round(future_score, 1), trend, risk
        
    features = np.array([[commits, prs, issues, reviews, active_days, consistency, current_score]])
    
    # Predict score
    pred_score = float(score_model.predict(features)[0])
    
    # Predict trend
    trend_labels = ["Declining", "Stable", "Improving"]
    pred_trend_idx = int(trend_model.predict(features)[0])
    pred_trend = trend_labels[pred_trend_idx]
    
    # Predict risk
    risk_labels = ["Low", "Medium", "High"]
    pred_risk_idx = int(risk_model.predict(features)[0])
    pred_risk = risk_labels[pred_risk_idx]
    
    return round(pred_score, 1), pred_trend, pred_risk

def predict_repository_future(commit_activity: float, pr_activity: float, issue_resolution_rate: float, contributor_participation: float, repository_maintenance: float, review_participation: float, health_score: float):
    """Predict future repository health score."""
    global score_model, trend_model, risk_model, health_model
    if health_model is None:
        score_model, trend_model, risk_model, health_model = load_prediction_models()
        
    if health_model is None:
        # Heuristic Fallback (deterministic)
        diff = 1.5 if commit_activity >= 70 and pr_activity >= 70 else (-1.5 if commit_activity < 40 else 0.0)
        future_health = max(0.0, min(100.0, float(health_score + diff)))
        return round(future_health, 1)
        
    features = np.array([[commit_activity, pr_activity, issue_resolution_rate, contributor_participation, repository_maintenance, review_participation, health_score]])
    pred_health = float(health_model.predict(features)[0])
    return round(pred_health, 1)