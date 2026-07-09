import os
import pandas as pd
import numpy as np
from src.database import SessionLocal
from src.models_db import ContributorAnalysis

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT_PATH = os.path.join(BASE_DIR, "frontend", "public", "drift_report.html")

def run_drift_analysis():
    """Run feature drift detection comparing recent contributor analyses against historical references."""
    # Ensure folder exists
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    
    # 1. Load Data from DB
    db = SessionLocal()
    records = db.query(ContributorAnalysis).all()
    db.close()
    
    if len(records) < 10:
        return {
            "status": "Insufficient data",
            "message": f"Need at least 10 contributor analyses to compare features. Currently have {len(records)}."
        }
        
    # Sort chronologically to split reference (older) and current (newer)
    records.sort(key=lambda r: r.timestamp or r.id)
    split_idx = int(len(records) * 0.70)  # 70% reference, 30% current
    
    ref_records = records[:split_idx]
    curr_records = records[split_idx:]
    
    cols = ["commits", "prs", "issues", "reviews", "active_days", "consistency", "score"]
    
    ref_data = []
    for r in ref_records:
        ref_data.append({
            "commits": r.commits,
            "prs": r.merged_prs,
            "issues": r.issues_closed,
            "reviews": r.code_reviews,
            "active_days": r.active_days,
            "consistency": r.consistency,
            "score": r.contribution_score
        })
        
    curr_data = []
    for r in curr_records:
        curr_data.append({
            "commits": r.commits,
            "prs": r.merged_prs,
            "issues": r.issues_closed,
            "reviews": r.code_reviews,
            "active_days": r.active_days,
            "consistency": r.consistency,
            "score": r.contribution_score
        })
        
    reference = pd.DataFrame(ref_data)
    current = pd.DataFrame(curr_data)
    
    # Run Evidently AI
    try:
        from evidently.report import Report
        from evidently.metric_preset import DataDriftPreset
        
        report = Report(metrics=[DataDriftPreset()])
        report.run(reference_data=reference, current_data=current)
        report.save_html(REPORT_PATH)
        
        result_dict = report.as_dict()
        metrics = result_dict["metrics"][0]["result"]
        drift_detected = metrics["dataset_drift"]
        drift_share = metrics["drift_share"]
        
        return {
            "status": "Success",
            "method": "Evidently AI",
            "drift_detected": bool(drift_detected),
            "drift_share": float(drift_share),
            "number_of_drifted_features": int(metrics["number_of_drifted_features"]),
            "total_features": int(metrics["number_of_columns"]),
            "report_url": "/drift-report"
        }
    except Exception as e:
        print(f"Evidently AI not available, falling back to scipy KS test: {e}")
        from scipy.stats import ks_2samp
        
        drifted_features = []
        for col in cols:
            stat, p_val = ks_2samp(reference[col], current[col])
            if p_val < 0.05:
                drifted_features.append(col)
                
        drift_detected = len(drifted_features) > 0
        drift_share = len(drifted_features) / float(len(cols))
        
        # Write HTML file
        with open(REPORT_PATH, "w") as f:
            f.write(f"""
            <html>
            <head>
                <title>Drift Report (KS Fallback)</title>
                <style>
                    body {{ font-family: sans-serif; padding: 40px; background: #f9f8f3; color: #000; }}
                    .card {{ border: 3px solid black; background: white; padding: 20px; box-shadow: 4px 4px 0px 0px #000; max-width: 600px; margin: 0 auto; }}
                    h1 {{ text-transform: uppercase; font-weight: 900; margin-top: 0; }}
                    .drift-stat {{ font-size: 24px; font-weight: bold; margin: 20px 0; }}
                    .yes {{ color: #e11d48; }}
                    .no {{ color: #16a34a; }}
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Data Drift Analysis</h1>
                    <p>Method: Scipy Kolmogorov-Smirnov 2-sample test fallback</p>
                    <div class="drift-stat">Drift Detected: <span class="{'yes' if drift_detected else 'no'}">{'YES' if drift_detected else 'NO'}</span></div>
                    <p>Drift Share: {drift_share * 100:.1f}% ({len(drifted_features)} / {len(cols)} features drifted)</p>
                    <p>Drifted Features: {', '.join(drifted_features) if drifted_features else 'None'}</p>
                </div>
            </body>
            </html>
            """)
            
        return {
            "status": "Success",
            "method": "Scipy KS-Test Fallback",
            "drift_detected": bool(drift_detected),
            "drift_share": float(drift_share),
            "number_of_drifted_features": len(drifted_features),
            "total_features": len(cols),
            "report_url": "/drift-report"
        }

if __name__ == "__main__":
    print(run_drift_analysis())
