import os
import datetime
import hashlib
import base64
import hmac
import json
import time
from fastapi import FastAPI, Header, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.database import SessionLocal, engine
from src.models_db import (
    Base, User, Repository, Contributor,
    RepositoryAnalysis, ContributorAnalysis,
    RepositoryHealth, Recommendation, History, AuditLog,
    MLExperiment, Prediction
)
from src.github_service import (
    parse_repo_url,
    get_repo_metrics,
    get_contributors,
    calculate_employee_score,
    get_performance,
    get_repository_health,
    generate_recommendations,
    detect_top_performer,
    detect_risk
)
from src.predict import predict_contributor_future, predict_repository_future
from src.drift_detection import run_drift_analysis
from src.retrain_pipeline import retrain_model

# ── JWT Auth Setup ───────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "engineering-intelligence-secret-key-12345")

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_jwt(payload: dict) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(payload).encode('utf-8'))
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(JWT_SECRET.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = base64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_jwt(token: str) -> dict:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_sig = hmac.new(JWT_SECRET.encode('utf-8'), signing_input, hashlib.sha256).digest()
        expected_sig_b64 = base64url_encode(expected_sig)
        if not hmac.compare_digest(signature_b64, expected_sig_b64):
            return None
        payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
        if payload.get("exp", 0) < time.time():
            return None # Expired
        return payload
    except Exception:
        return None

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# FastAPI instance
app = FastAPI(title="Engineering Intelligence Platform API", version="1.0.0")

# Startup database initialization
@app.on_event("startup")
def on_startup():
    try:
        # Create database tables
        Base.metadata.create_all(bind=engine)
        print("Database initialized successfully.")
        
        # Check and add columns dynamically if missing
        from sqlalchemy import inspect, text
        with engine.connect() as conn:
            inspector = inspect(engine)
            
            # Check repository_analyses columns
            ra_columns = [c["name"] for c in inspector.get_columns("repository_analyses")]
            if "open_issues" not in ra_columns:
                print("Adding missing columns to repository_analyses...")
                conn.execute(text("ALTER TABLE repository_analyses ADD COLUMN open_issues INTEGER DEFAULT 0"))
                conn.execute(text("ALTER TABLE repository_analyses ADD COLUMN closed_issues INTEGER DEFAULT 0"))
                conn.execute(text("ALTER TABLE repository_analyses ADD COLUMN recent_commits INTEGER DEFAULT 0"))
                conn.execute(text("ALTER TABLE repository_analyses ADD COLUMN pull_requests INTEGER DEFAULT 0"))
                conn.commit()

            # Check repositories columns
            repo_columns = [c["name"] for c in inspector.get_columns("repositories")]
            if "owner" not in repo_columns:
                print("Adding missing columns to repositories...")
                conn.execute(text("ALTER TABLE repositories ADD COLUMN owner VARCHAR"))
                conn.execute(text("ALTER TABLE repositories ADD COLUMN description VARCHAR"))
                conn.execute(text("ALTER TABLE repositories ADD COLUMN watchers INTEGER DEFAULT 0"))
                conn.execute(text("ALTER TABLE repositories ADD COLUMN repo_created_at TIMESTAMP"))
                conn.execute(text("ALTER TABLE repositories ADD COLUMN repo_updated_at TIMESTAMP"))
                conn.commit()
        
        # Trigger seeder to verify DB is seeded
        from src.db_seeder import seed_db
        seed_db()
    except Exception as e:
        print(f"Error initializing database: {e}")

# Enable CORS for development and production
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency to get current user role
def get_user_role(authorization: str = Header(None)) -> str:
    if not authorization:
        # Default unauthenticated interaction to Team Leader so dashboard / repo analysis is accessible
        return "Team Leader"
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:].strip()
    payload = decode_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")
    return payload.get("role", "Viewer")

# Input Models
class RegisterInput(BaseModel):
    username: str
    password: str
    role: str # "Admin", "Team Leader", "Viewer"

class LoginInput(BaseModel):
    username: str
    password: str

class RepoInput(BaseModel):
    repo_url: str

class CustomPredictInput(BaseModel):
    commits: int
    prs: int
    issues: int
    reviews: int
    active_days: int

# ── Home Page Endpoint ────────────────────────────────────────────────
@app.get("/")
def home():
    index_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "AI-Powered Repository Analytics and Employee Contribution Intelligence Platform API Active"}

# ── Auth Endpoints ───────────────────────────────────────────────────
@app.post("/auth/register")
def register(data: RegisterInput, db: Session = Depends(get_db)):
    # Check if username exists
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists.")
    
    if data.role not in ["Admin", "Team Leader", "Viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role specified.")
        
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        role=data.role
    )
    db.add(user)
    db.commit()
    return {"status": "Success", "message": "User registered successfully."}

@app.post("/auth/login")
def login(data: LoginInput, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or user.password_hash != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
        
    # Generate JWT (valid for 1 day)
    payload = {
        "sub": user.username,
        "role": user.role,
        "exp": time.time() + (24 * 3600)
    }
    token = create_jwt(payload)
    return {
        "status": "Success",
        "token": token,
        "username": user.username,
        "role": user.role
    }

# ── Simulator Predictions Endpoint ───────────────────────────────────
@app.post("/predict")
def predict(data: CustomPredictInput):
    try:
        # Compute current score & performance category
        profile = {
            "commits": data.commits,
            "pull_requests": data.prs,
            "issues_closed": data.issues,
            "reviews": data.reviews,
            "active_days": data.active_days
        }
        score = calculate_employee_score(profile)
        perf = get_performance(score)
        
        # Predict future metrics using ML models
        f_score, f_trend, f_risk = predict_contributor_future(
            data.commits, data.prs, data.issues, data.reviews,
            data.active_days, round(data.active_days / 20.0, 2), float(score)
        )
        f_perf = get_performance(int(f_score))
        
        return {
            "current_score": score,
            "performance": perf,
            "future_score": f_score,
            "future_performance": f_perf,
            "future_trend": f_trend,
            "future_risk": f_risk
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction simulation failed: {str(e)}")

# ── Repository Analysis Endpoints ─────────────────────────────────────

@app.post("/analyze-repo")
def analyze_repo(data: RepoInput, x_github_token: str = Header(None), role: str = Depends(get_user_role), db: Session = Depends(get_db)):
    if role not in ["Admin", "Team Leader"]:
        raise HTTPException(status_code=403, detail="Permission denied. Only Admins and Team Leaders can trigger repository analysis.")
        
    token = x_github_token or os.getenv("GITHUB_TOKEN")
    try:
        owner, repo_name = parse_repo_url(data.repo_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    try:
        # 1. Fetch real statistics from GitHub REST API
        metrics = get_repo_metrics(owner, repo_name, token)
        contributors = get_contributors(owner, repo_name, token)
        health_data = get_repository_health(owner, repo_name, metrics, contributors, token)
        recs = generate_recommendations(contributors, health_data)
    except Exception as api_err:
        # Fallback to existing analysis in the DB only if live API fails
        repo_record = db.query(Repository).filter(
            (Repository.owner == owner) & ((Repository.name == f"{owner}/{repo_name}") | (Repository.name == repo_name))
        ).first()
        if repo_record:
            latest_analysis = db.query(RepositoryAnalysis).filter(
                RepositoryAnalysis.repo_id == repo_record.id
            ).order_by(RepositoryAnalysis.analyzed_at.desc()).first()
            if latest_analysis:
                print(f"GitHub API error ({api_err}); falling back to existing cached analysis for {owner}/{repo_name}")
                return format_analysis_response(latest_analysis, db)
        raise HTTPException(status_code=400, detail=f"Analysis failed: {str(api_err)}")

    try:
        
        # 2. Check/create Repository
        repo_record = db.query(Repository).filter(Repository.repo_url == data.repo_url).first()
        if not repo_record:
            repo_record = Repository(
                repo_url=data.repo_url,
                name=metrics["name"],
                owner=metrics["owner"],
                description=metrics["description"],
                stars=metrics["stars"],
                forks=metrics["forks"],
                watchers=metrics["watchers"],
                languages=json.dumps(metrics["languages"]),
                default_branch=metrics["default_branch"],
                branches_count=metrics["branches_count"],
                releases_count=metrics["releases_count"],
                repo_created_at=metrics["created_at"],
                repo_updated_at=metrics["updated_at"]
            )
            db.add(repo_record)
            db.commit()
            db.refresh(repo_record)
        else:
            repo_record.stars = metrics["stars"]
            repo_record.forks = metrics["forks"]
            repo_record.owner = metrics["owner"]
            repo_record.description = metrics["description"]
            repo_record.watchers = metrics["watchers"]
            repo_record.languages = json.dumps(metrics["languages"])
            repo_record.branches_count = metrics["branches_count"]
            repo_record.releases_count = metrics["releases_count"]
            repo_record.repo_created_at = metrics["created_at"]
            repo_record.repo_updated_at = metrics["updated_at"]
            db.commit()
            
        # 3. Create RepositoryAnalysis run
        analysis = RepositoryAnalysis(
            repo_id=repo_record.id,
            analyzed_at=datetime.datetime.utcnow(),
            commit_activity=health_data["commit_activity"],
            pr_activity=health_data["pr_activity"],
            issue_resolution_rate=health_data["issue_resolution_rate"],
            contributor_participation=health_data["contributor_participation"],
            repository_maintenance=health_data["repository_maintenance"],
            review_participation=health_data["review_participation"],
            health_score=health_data["health_score"],
            health_status=health_data["status"],
            open_issues=metrics["open_issues"],
            closed_issues=metrics["closed_issues"],
            recent_commits=metrics["recent_commits"],
            pull_requests=metrics["pull_requests"]
        )
        db.add(analysis)
        db.commit() # Flushes analysis.id
        
        # 4. Insert detailed health
        repo_health = RepositoryHealth(
            repo_analysis_id=analysis.id,
            commit_activity=health_data["commit_activity"],
            pr_activity=health_data["pr_activity"],
            issue_resolution_rate=health_data["issue_resolution_rate"],
            contributor_participation=health_data["contributor_participation"],
            repository_maintenance=health_data["repository_maintenance"],
            review_participation=health_data["review_participation"],
            health_score=health_data["health_score"],
            status=health_data["status"]
        )
        db.add(repo_health)
        
        # 5. Insert Recommendations
        for r_text in recs:
            rec = Recommendation(
                repo_analysis_id=analysis.id,
                recommendation_text=r_text,
                category="general"
            )
            db.add(rec)
            
        # 6. Contributors and predictions
        profiles = []
        for c in contributors:
            username = c["username"]
            
            # Check/create Contributor
            contrib_rec = db.query(Contributor).filter(Contributor.username == username).first()
            if not contrib_rec:
                contrib_rec = Contributor(username=username, avatar_url=f"https://github.com/{username}.png")
                db.add(contrib_rec)
                db.commit()
                db.refresh(contrib_rec)
                
            score = calculate_employee_score(c)
            perf = get_performance(score)
            
            ca = ContributorAnalysis(
                repo_analysis_id=analysis.id,
                contributor_id=contrib_rec.id,
                commits=c["commits"],
                merged_prs=c["pull_requests"],
                issues_closed=c["issues_closed"],
                code_reviews=c["reviews"],
                consistency=round(c["active_days"] / 20.0, 2),
                active_days=c["active_days"],
                contribution_score=float(score),
                performance_category=perf,
                timestamp=datetime.datetime.utcnow()
            )
            db.add(ca)
            db.commit() # Get ca.id
            
            # Predict future behavior using ML
            f_score, f_trend, f_risk = predict_contributor_future(
                c["commits"], c["pull_requests"], c["issues_closed"], c["reviews"],
                c["active_days"], round(c["active_days"] / 20.0, 2), float(score)
            )
            
            pred = Prediction(
                repo_analysis_id=analysis.id,
                contributor_analysis_id=ca.id,
                prediction_type="contributor_future",
                future_contribution_score=float(f_score),
                contributor_risk=f_risk,
                performance_trend=f_trend,
                predicted_at=datetime.datetime.utcnow()
            )
            db.add(pred)
            
            profiles.append({
                "username": username,
                "commits": c["commits"],
                "pull_requests": c["pull_requests"],
                "issues_closed": c["issues_closed"],
                "reviews": c["reviews"],
                "active_days": c["active_days"],
                "score": score,
                "performance": perf,
                "future_score": f_score,
                "future_trend": f_trend,
                "future_risk": f_risk
            })
            
        # Predict future repo health
        f_health = predict_repository_future(
            health_data["commit_activity"],
            health_data["pr_activity"],
            health_data["issue_resolution_rate"],
            health_data["contributor_participation"],
            health_data["repository_maintenance"],
            health_data["review_participation"],
            health_data["health_score"]
        )
        
        repo_pred = Prediction(
            repo_analysis_id=analysis.id,
            prediction_type="repository_future",
            future_repository_health=float(f_health),
            predicted_at=datetime.datetime.utcnow()
        )
        db.add(repo_pred)
        
        # Add History Entry
        hist = History(
            repo_id=repo_record.id,
            repo_analysis_id=analysis.id,
            timestamp=datetime.datetime.utcnow(),
            action_type="analysis",
            summary=f"Repository analysis run completed. Health score evaluated at {health_data['health_score']}% ({health_data['status']})."
        )
        db.add(hist)
        
        # Log audit entry
        audit = AuditLog(
            user_role=role,
            action="Repository Analysis",
            endpoint="/analyze-repo",
            details=f"Analyzed repository {data.repo_url}. Health score: {health_data['health_score']}%",
            timestamp=datetime.datetime.utcnow()
        )
        db.add(audit)
        
        db.commit()
        
        # Output results
        result = {
            "id": analysis.id,
            "repo_url": data.repo_url,
            "name": repo_record.name,
            "owner": repo_record.owner or owner,
            "stars": repo_record.stars,
            "forks": repo_record.forks,
            "branches_count": repo_record.branches_count,
            "releases_count": repo_record.releases_count,
            "contributors_count": len(contributors),
            "open_issues": metrics["open_issues"],
            "closed_issues": metrics["closed_issues"],
            "recent_commits": metrics["recent_commits"],
            "pull_requests": metrics["pull_requests"],
            "default_branch": repo_record.default_branch,
            "languages": metrics["languages"],
            "analyzed_at": analysis.analyzed_at.isoformat(),
            "contributors": profiles,
            "health": health_data,
            "future_health": f_health,
            "recommendations": recs,
            "top_performers": detect_top_performer(profiles),
            "risks": detect_risk(profiles)
        }
        return result
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Analysis failed: {str(e)}")

@app.post("/team-ranking")
def team_ranking(data: RepoInput, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.repo_url == data.repo_url).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found. Please analyze it first.")
        
    latest_analysis = db.query(RepositoryAnalysis).filter(RepositoryAnalysis.repo_id == repo.id).order_by(RepositoryAnalysis.analyzed_at.desc()).first()
    if not latest_analysis:
        raise HTTPException(status_code=404, detail="No analyses found.")
        
    ranking = []
    for ca in latest_analysis.contributor_analyses:
        pred = db.query(Prediction).filter(Prediction.contributor_analysis_id == ca.id).first()
        uname = ca.contributor.username if ca.contributor else "Unknown"
        ranking.append({
            "employee": uname,
            "username": uname,
            "commits": ca.commits,
            "prs": ca.merged_prs,
            "issues_closed": ca.issues_closed,
            "reviews": ca.code_reviews,
            "active_days": ca.active_days,
            "score": ca.contribution_score,
            "performance": ca.performance_category,
            "future_score": pred.future_contribution_score if pred else ca.contribution_score,
            "future_trend": pred.performance_trend if pred else "Stable",
            "future_risk": pred.contributor_risk if pred else "Low"
        })
    ranking.sort(key=lambda x: x["score"], reverse=True)
    return ranking

@app.post("/repository-health")
def repository_health(data: RepoInput, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.repo_url == data.repo_url).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    latest_analysis = db.query(RepositoryAnalysis).filter(RepositoryAnalysis.repo_id == repo.id).order_by(RepositoryAnalysis.analyzed_at.desc()).first()
    if not latest_analysis or not latest_analysis.health:
        raise HTTPException(status_code=404, detail="Health score not found.")
        
    h = latest_analysis.health
    return {
        "health_score": h.health_score,
        "status": h.status,
        "commit_activity": h.commit_activity,
        "pr_activity": h.pr_activity,
        "issue_resolution_rate": h.issue_resolution_rate,
        "contributor_participation": h.contributor_participation,
        "repository_maintenance": h.repository_maintenance,
        "review_participation": h.review_participation
    }

@app.post("/recommendations")
def recommendations(data: RepoInput, db: Session = Depends(get_db)):
    repo = db.query(Repository).filter(Repository.repo_url == data.repo_url).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")
        
    latest_analysis = db.query(RepositoryAnalysis).filter(RepositoryAnalysis.repo_id == repo.id).order_by(RepositoryAnalysis.analyzed_at.desc()).first()
    if not latest_analysis:
        raise HTTPException(status_code=404, detail="No recommendations found.")
        
    recs = [r.recommendation_text for r in latest_analysis.recommendations]
    return {"recommendations": recs}

@app.post("/top-performer")
def top_performer(data: RepoInput, db: Session = Depends(get_db)):
    ranking = team_ranking(data, db)
    return detect_top_performer(ranking)

@app.post("/risk-analysis")
def risk_analysis(data: RepoInput, db: Session = Depends(get_db)):
    ranking = team_ranking(data, db)
    return {"risks": detect_risk(ranking)}

# ── History & Stats API (Repository Analyses) ─────────────────────────

@app.get("/history")
def history(db: Session = Depends(get_db)):
    rows = db.query(RepositoryAnalysis).order_by(RepositoryAnalysis.analyzed_at.desc(), RepositoryAnalysis.id.desc()).all()
    result = []
    for row in rows:
        repo_pred = db.query(Prediction).filter(
            Prediction.repo_analysis_id == row.id,
            Prediction.prediction_type == "repository_future"
        ).first()
        trend = repo_pred.performance_trend if repo_pred else ("Improving" if row.health_score >= 75 else ("Stable" if row.health_score >= 50 else "Declining"))
        
        repo_name = row.repo.name if row.repo else "Unknown"
        owner_name = row.repo.owner if row.repo and row.repo.owner else (repo_name.split('/')[0] if '/' in repo_name else "Unknown")
        cnt = len(row.contributor_analyses) if row.contributor_analyses else 0

        result.append({
            "id": row.id,
            "repo_url": row.repo.repo_url if row.repo else "",
            "name": repo_name,
            "repository": repo_name,
            "owner": owner_name,
            "stars": row.repo.stars if row.repo else 0,
            "forks": row.repo.forks if row.repo else 0,
            "contributors_count": cnt,
            "contributor_count": cnt,
            "recent_commits": row.recent_commits or 0,
            "health_score": row.health_score or 0.0,
            "status": row.health_status or "Healthy",
            "repository_status": row.health_status or "Healthy",
            "prediction_trend": trend,
            "performance_trend": trend,
            "trend": trend,
            "analyzed_at": row.analyzed_at.isoformat() if row.analyzed_at else "",
            "timestamp": row.analyzed_at.isoformat() if row.analyzed_at else ""
        })
    return result

@app.get("/recent")
def recent(db: Session = Depends(get_db)):
    # Returns latest repository analyses snapshots (newest first)
    rows = db.query(RepositoryAnalysis).order_by(RepositoryAnalysis.analyzed_at.desc(), RepositoryAnalysis.id.desc()).limit(20).all()
    result = []
    for row in rows:
        repo_pred = db.query(Prediction).filter(
            Prediction.repo_analysis_id == row.id,
            Prediction.prediction_type == "repository_future"
        ).first()
        trend = repo_pred.performance_trend if repo_pred else ("Improving" if row.health_score >= 75 else ("Stable" if row.health_score >= 50 else "Declining"))
        
        repo_name = row.repo.name if row.repo else "Unknown"
        owner_name = row.repo.owner if row.repo and row.repo.owner else (repo_name.split('/')[0] if '/' in repo_name else "Unknown")
        cnt = len(row.contributor_analyses) if row.contributor_analyses else 0

        result.append({
            "id": row.id,
            "repo_url": row.repo.repo_url if row.repo else "",
            "name": repo_name,
            "repository": repo_name,
            "owner": owner_name,
            "stars": row.repo.stars if row.repo else 0,
            "forks": row.repo.forks if row.repo else 0,
            "contributors_count": cnt,
            "contributor_count": cnt,
            "recent_commits": row.recent_commits or 0,
            "health_score": row.health_score or 0.0,
            "status": row.health_status or "Healthy",
            "repository_status": row.health_status or "Healthy",
            "prediction_trend": trend,
            "performance_trend": trend,
            "trend": trend,
            "analyzed_at": row.analyzed_at.isoformat() if row.analyzed_at else "",
            "analysis_date": row.analyzed_at.isoformat() if row.analyzed_at else ""
        })
    return result

@app.get("/stats")
def stats(db: Session = Depends(get_db)):
    total = db.query(RepositoryAnalysis).count()
    if total == 0:
        return {
            "total_analyzed": 0,
            "avg_health_score": 0,
            "excellent_contributors": 0,
            "total_commits": 0
        }
        
    avg_health = db.query(RepositoryAnalysis.health_score).all()
    avg_health_val = round(sum(h[0] for h in avg_health) / len(avg_health), 1)
    
    excellent = db.query(ContributorAnalysis).filter(ContributorAnalysis.performance_category.in_(["Elite Contributor", "Excellent"])).count()
    total_commits = int(sum(c[0] for c in db.query(ContributorAnalysis.commits).all() or [(0,)]))
    
    return {
        "total_analyzed": total,
        "avg_health_score": avg_health_val,
        "excellent_contributors": excellent,
        "total_commits": total_commits
    }

@app.delete("/history")
def clear_history(role: str = Depends(get_user_role), db: Session = Depends(get_db)):
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Permission denied. Only Admins can clear database history.")
        
    try:
        db.query(AuditLog).delete()
        db.query(History).delete()
        db.query(Prediction).delete()
        db.query(Recommendation).delete()
        db.query(RepositoryHealth).delete()
        db.query(ContributorAnalysis).delete()
        db.query(RepositoryAnalysis).delete()
        db.query(Contributor).delete()
        db.query(Repository).delete()
        db.query(MLExperiment).delete()
        
        # Log audit entry
        audit = AuditLog(
            user_role=role,
            action="Clear History",
            endpoint="/history",
            details="All historical tables cleared.",
            timestamp=datetime.datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        return {"message": "Repository analysis history and ML logs cleared successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database purge failed: {str(e)}")

@app.get("/contributors/{username}")
def contributor_details(username: str, db: Session = Depends(get_db)):
    contrib = db.query(Contributor).filter(Contributor.username == username).first()
    if not contrib:
        raise HTTPException(status_code=404, detail="Contributor not found.")
        
    analyses = db.query(ContributorAnalysis).filter(ContributorAnalysis.contributor_id == contrib.id).order_by(ContributorAnalysis.timestamp.asc()).all()
    
    history_scores = []
    repositories = set()
    for ca in analyses:
        pred = db.query(Prediction).filter(Prediction.contributor_analysis_id == ca.id).first()
        history_scores.append({
            "timestamp": ca.timestamp.isoformat(),
            "commits": ca.commits,
            "prs": ca.merged_prs,
            "issues": ca.issues_closed,
            "reviews": ca.code_reviews,
            "active_days": ca.active_days,
            "score": ca.contribution_score,
            "performance": ca.performance_category,
            "future_score": pred.future_contribution_score if pred else ca.contribution_score,
            "trend": pred.performance_trend if pred else "Stable",
            "risk": pred.contributor_risk if pred else "Low"
        })
        if ca.repo_analysis and ca.repo_analysis.repo:
            repositories.add(ca.repo_analysis.repo.name)
            
    return {
        "username": contrib.username,
        "avatar_url": contrib.avatar_url,
        "repositories": list(repositories),
        "history": history_scores
    }

@app.get("/repositories")
def repositories(db: Session = Depends(get_db)):
    repos = db.query(Repository).all()
    result = []
    for r in repos:
        result.append({
            "id": r.id,
            "repo_url": r.repo_url,
            "name": r.name,
            "stars": r.stars,
            "forks": r.forks,
            "default_branch": r.default_branch
        })
    return result

def format_analysis_response(row, db: Session):
    profiles = []
    for ca in row.contributor_analyses:
        pred = db.query(Prediction).filter(Prediction.contributor_analysis_id == ca.id).first()
        uname = ca.contributor.username if ca.contributor else "Unknown"
        profiles.append({
            "username": uname,
            "commits": ca.commits,
            "pull_requests": ca.merged_prs,
            "issues_closed": ca.issues_closed,
            "reviews": ca.code_reviews,
            "active_days": ca.active_days,
            "score": ca.contribution_score,
            "performance": ca.performance_category,
            "future_score": pred.future_contribution_score if pred else ca.contribution_score,
            "future_trend": pred.performance_trend if pred else "Stable",
            "future_risk": pred.contributor_risk if pred else "Low"
        })
        
    h = row.health
    health_data = {
        "health_score": h.health_score if h else row.health_score,
        "status": h.status if h else row.health_status,
        "commit_activity": h.commit_activity if h else 0,
        "pr_activity": h.pr_activity if h else 0,
        "issue_resolution_rate": h.issue_resolution_rate if h else 0,
        "contributor_participation": h.contributor_participation if h else 0,
        "repository_maintenance": h.repository_maintenance if h else 0,
        "review_participation": h.review_participation if h else 0
    }
    
    recs = [rec.recommendation_text for rec in row.recommendations]
    
    repo_pred = db.query(Prediction).filter(Prediction.repo_analysis_id == row.id, Prediction.prediction_type == "repository_future").first()
    f_health = repo_pred.future_repository_health if repo_pred else row.health_score
    
    repo_name = row.repo.name if row.repo else ""
    owner_name = row.repo.owner if row.repo and row.repo.owner else (repo_name.split('/')[0] if '/' in repo_name else "Unknown")
    
    parsed_langs = {}
    if row.repo and row.repo.languages:
        try:
            parsed_langs = json.loads(row.repo.languages)
        except Exception:
            parsed_langs = {}

    return {
        "id": row.id,
        "repo_url": row.repo.repo_url if row.repo else "",
        "name": repo_name,
        "owner": owner_name,
        "stars": row.repo.stars if row.repo else 0,
        "forks": row.repo.forks if row.repo else 0,
        "branches_count": row.repo.branches_count if row.repo else 1,
        "releases_count": row.repo.releases_count if row.repo else 0,
        "contributors_count": len(profiles),
        "open_issues": row.open_issues,
        "closed_issues": row.closed_issues,
        "recent_commits": row.recent_commits,
        "pull_requests": row.pull_requests,
        "default_branch": row.repo.default_branch if row.repo else "main",
        "languages": parsed_langs,
        "analyzed_at": row.analyzed_at.isoformat() if row.analyzed_at else "",
        "contributors": profiles,
        "health": health_data,
        "future_health": f_health,
        "recommendations": recs,
        "top_performers": detect_top_performer(profiles),
        "risks": detect_risk(profiles)
    }

@app.get("/analysis/{analysis_id}")
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    row = db.query(RepositoryAnalysis).filter(RepositoryAnalysis.id == analysis_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found.")
        
    return format_analysis_response(row, db)

@app.delete("/analysis/{analysis_id}")
def delete_analysis(analysis_id: int, role: str = Depends(get_user_role), db: Session = Depends(get_db)):
    if role not in ["Admin", "Team Leader"]:
        raise HTTPException(status_code=403, detail="Permission denied. Only Admins and Team Leaders can delete analysis records.")
    
    analysis = db.query(RepositoryAnalysis).filter(RepositoryAnalysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    
    # Save to Audit log
    audit = AuditLog(
        user_role=role,
        action="Delete Analysis",
        endpoint=f"/analysis/{analysis_id}",
        details=f"Deleted analysis record ID {analysis_id} for repository {analysis.repo.name if analysis.repo else 'Unknown'}",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit)
    
    db.delete(analysis)
    db.commit()
    return {"status": "Success", "message": f"Analysis record {analysis_id} has been deleted successfully."}

# ── MLOps Drift & Retrain Endpoints ───────────────────────────────────

@app.get("/drift-detection")
def drift_detection_endpoint(role: str = Depends(get_user_role)):
    if role not in ["Admin", "Team Leader"]:
        raise HTTPException(status_code=403, detail="Permission denied. Only Admins and Team Leaders can trigger drift analysis.")
    return run_drift_analysis()

@app.get("/drift-report", response_class=HTMLResponse)
def drift_report_html():
    report_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "public", "drift_report.html")
    if os.path.exists(report_path):
        with open(report_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>No Drift Report Found</h1><p>Please trigger the drift analysis in the Admin dashboard first.</p>"

@app.post("/retrain")
def retrain_endpoint(role: str = Depends(get_user_role), db: Session = Depends(get_db)):
    if role not in ["Admin", "Team Leader"]:
        raise HTTPException(status_code=403, detail="Permission denied. Only Admins and Team Leaders can trigger model retraining.")
    
    result = retrain_model()
    
    # Save to Audit log
    audit = AuditLog(
        user_role=role,
        action="Model Retrain",
        endpoint="/retrain",
        details=f"Retraining completed with status: {result.get('status', 'Unknown')}. Accuracy: {result.get('contrib_trend_accuracy', 0.0)}",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    
    return result

# SPA fallback to index.html for client-side routing
@app.get("/{catchall:path}")
def spa_fallback(catchall: str):
    if catchall.startswith(("docs", "redoc", "openapi.json", "auth", "predict", "analyze-repo", "team-ranking", "repository-health", "recommendations", "top-performer", "risk-analysis", "history", "recent", "stats", "contributors", "repositories", "analysis", "drift-detection", "drift-report", "retrain")):
        raise HTTPException(status_code=404, detail="Not Found")
    
    frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
    file_path = os.path.join(frontend_dist, catchall)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Not Found")

# Mount frontend production build if it exists
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")