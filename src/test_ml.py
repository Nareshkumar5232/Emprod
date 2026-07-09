from src.github_service import calculate_employee_score, get_performance, get_repository_health
from src.predict import predict_contributor_future, predict_repository_future

def test_calculate_employee_score():
    profile = {
        "commits": 10,
        "pull_requests": 2,
        "issues_closed": 1,
        "reviews": 5,
        "active_days": 4
    }
    score = calculate_employee_score(profile)
    assert 0 <= score <= 100
    
    perf = get_performance(score)
    assert perf in ["Elite Contributor", "Excellent", "Good", "Average", "Needs Attention"]

def test_get_repository_health():
    repo_metrics = {
        "open_issues": 5,
        "closed_issues": 15,
        "recent_commits": 20,
        "pull_requests": 4,
        "releases_count": 2,
        "stars": 10
    }
    contributors = [
        {"username": "dev-1", "commits": 10, "reviews": 2},
        {"username": "dev-2", "commits": 10, "reviews": 2}
    ]
    health = get_repository_health("owner", "repo", repo_metrics, contributors)
    assert 0 <= health["health_score"] <= 100
    assert health["status"] in ["Healthy", "Moderate", "Critical"]

def test_predict_contributor_future():
    score, trend, risk = predict_contributor_future(10, 2, 1, 5, 4, 0.8, 60.0)
    assert 0.0 <= score <= 100.0
    assert trend in ["Improving", "Stable", "Declining"]
    assert risk in ["Low", "Medium", "High"]

def test_predict_repository_future():
    score = predict_repository_future(80.0, 75.0, 90.0, 85.0, 80.0, 80.0, 85.0)
    assert 0.0 <= score <= 100.0
