import pytest
import datetime
from fastapi.testclient import TestClient

from src.app import app, get_db, create_jwt, decode_jwt
from src.database import engine, SessionLocal
from src.models_db import Base, User, Repository, RepositoryAnalysis, Contributor, ContributorAnalysis, RepositoryHealth, Prediction
from src.github_service import (
    parse_repo_url,
    calculate_employee_score,
    get_performance,
    get_repository_health,
    detect_top_performer,
    detect_risk,
    generate_recommendations
)
from src.predict import predict_contributor_future, predict_repository_future

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Teardown if needed

# ── 1. GitHub URL Validation Tests ────────────────────────────────────

def test_github_url_validation_standard():
    owner, repo = parse_repo_url("https://github.com/facebook/react")
    assert owner == "facebook"
    assert repo == "react"

def test_github_url_validation_trailing_slash():
    owner, repo = parse_repo_url("https://github.com/psf/requests/")
    assert owner == "psf"
    assert repo == "requests"

def test_github_url_validation_git_suffix():
    owner, repo = parse_repo_url("https://github.com/fastapi/fastapi.git")
    assert owner == "fastapi"
    assert repo == "fastapi"

def test_github_url_validation_query_params():
    owner, repo = parse_repo_url("https://github.com/python/cpython?tab=readme-ov-file")
    assert owner == "python"
    assert repo == "cpython"

def test_github_url_validation_short_format():
    owner, repo = parse_repo_url("tensorflow/tensorflow")
    assert owner == "tensorflow"
    assert repo == "tensorflow"

def test_github_url_validation_invalid():
    with pytest.raises(ValueError):
        parse_repo_url("not_a_github_url")

def test_github_url_validation_empty():
    with pytest.raises(ValueError):
        parse_repo_url("")

# ── 2. Contribution Activity Scoring Tests ────────────────────────────

def test_calculate_employee_score_bounds():
    profile = {
        "commits": 25,
        "pull_requests": 5,
        "issues_closed": 4,
        "reviews": 8,
        "active_days": 10
    }
    score = calculate_employee_score(profile)
    assert 0 <= score <= 100

def test_calculate_employee_score_zero():
    profile = {"commits": 0, "pull_requests": 0, "issues_closed": 0, "reviews": 0, "active_days": 0}
    score = calculate_employee_score(profile)
    assert score == 0

def test_calculate_employee_score_max_cap():
    profile = {"commits": 500, "pull_requests": 100, "issues_closed": 80, "reviews": 150, "active_days": 100}
    score = calculate_employee_score(profile)
    assert score == 100

def test_performance_category_tiers():
    assert get_performance(95) == "Elite Contributor"
    assert get_performance(80) == "Excellent"
    assert get_performance(65) == "Good"
    assert get_performance(50) == "Average"
    assert get_performance(30) == "Needs Attention"

# ── 3. Repository Health Scoring Tests ────────────────────────────────

def test_repository_health_scoring():
    repo_metrics = {
        "open_issues": 10,
        "closed_issues": 90,
        "recent_commits": 50,
        "pull_requests": 15,
        "releases_count": 5,
        "stars": 1500
    }
    contributors = [
        {"username": "alice", "commits": 25, "reviews": 10, "active_days": 5},
        {"username": "bob", "commits": 25, "reviews": 8, "active_days": 4}
    ]
    health = get_repository_health("psf", "requests", repo_metrics, contributors)
    assert 0 <= health["health_score"] <= 100
    assert health["status"] in ["Healthy", "Moderate", "Critical"]
    assert "commit_activity" in health
    assert "pr_activity" in health
    assert "issue_resolution_rate" in health

def test_repository_health_zero_division_safety():
    repo_metrics = {
        "open_issues": 0,
        "closed_issues": 0,
        "recent_commits": 0,
        "pull_requests": 0,
        "releases_count": 0,
        "stars": 0
    }
    contributors = []
    health = get_repository_health("empty", "repo", repo_metrics, contributors)
    assert 0 <= health["health_score"] <= 100
    assert health["status"] in ["Healthy", "Moderate", "Critical"]

# ── 4. ML Predictions Tests ───────────────────────────────────────────

def test_predict_contributor_future():
    score, trend, risk = predict_contributor_future(15, 3, 2, 6, 4, 0.2, 70.0)
    assert 0.0 <= score <= 100.0
    assert trend in ["Improving", "Stable", "Declining"]
    assert risk in ["Low", "Medium", "High"]

def test_predict_repository_future():
    future_health = predict_repository_future(75.0, 80.0, 90.0, 85.0, 70.0, 80.0, 80.0)
    assert 0.0 <= future_health <= 100.0

def test_predict_endpoint_simulator():
    payload = {
        "commits": 20,
        "prs": 5,
        "issues": 3,
        "reviews": 7,
        "active_days": 4
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "current_score" in data
    assert "future_score" in data
    assert "future_trend" in data
    assert "future_risk" in data

# ── 5. Authentication & Authorization Tests ───────────────────────────

def test_jwt_creation_and_decoding():
    payload = {"sub": "testuser", "role": "Team Leader", "exp": 9999999999}
    token = create_jwt(payload)
    assert isinstance(token, str)
    decoded = decode_jwt(token)
    assert decoded["sub"] == "testuser"
    assert decoded["role"] == "Team Leader"

def test_jwt_tampering_detection():
    token = create_jwt({"sub": "admin", "role": "Admin", "exp": 9999999999})
    tampered = token[:-4] + "fake"
    assert decode_jwt(tampered) is None

def test_auth_login_valid_user():
    res = client.post("/auth/login", json={"username": "viewer", "password": "viewer123"})
    assert res.status_code == 200
    assert "token" in res.json()
    assert res.json()["role"] == "Viewer"

def test_auth_login_invalid_credentials():
    res = client.post("/auth/login", json={"username": "viewer", "password": "wrongpassword"})
    assert res.status_code == 401

# ── 6. Endpoints Tests (History, Recent, Stats, Repositories) ──────────

def test_get_stats_endpoint():
    res = client.get("/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_analyzed" in data
    assert "avg_health_score" in data
    assert "excellent_contributors" in data

def test_get_history_endpoint():
    res = client.get("/history")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_get_recent_endpoint():
    res = client.get("/recent")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_get_repositories_endpoint():
    res = client.get("/repositories")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

# ── 7. Error Handling Tests ───────────────────────────────────────────

def test_analyze_repo_invalid_url():
    res = client.post("/analyze-repo", json={"repo_url": "invalid_url_format"})
    assert res.status_code == 400

def test_recommendations_not_found():
    res = client.post("/recommendations", json={"repo_url": "https://github.com/nonexistent/never-analyzed"})
    assert res.status_code == 404

def test_team_ranking_not_found():
    res = client.post("/team-ranking", json={"repo_url": "https://github.com/nonexistent/never-analyzed"})
    assert res.status_code == 404

def test_delete_history_viewer_forbidden():
    viewer_token = client.post("/auth/login", json={"username": "viewer", "password": "viewer123"}).json()["token"]
    res = client.delete("/history", headers={"Authorization": f"Bearer {viewer_token}"})
    assert res.status_code == 403
