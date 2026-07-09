import requests
import datetime
import re

# Contribution Score Formula Configuration Weights
SCORE_WEIGHTS = {
    "commits": 0.30,
    "pull_requests": 0.25,
    "issues_closed": 0.15,
    "reviews": 0.15,
    "consistency": 0.15
}

# Normalization maximum targets (to scale score contribution)
SCORE_LIMITS = {
    "commits": 50.0,
    "pull_requests": 10.0,
    "issues_closed": 8.0,
    "reviews": 15.0,
    "consistency": 20.0
}

def parse_repo_url(url):
    if not url:
        raise ValueError("Repository URL is empty.")
    
    # Clean up the URL: strip spaces, trailing slashes, remove .git suffix
    clean_url = url.strip().rstrip("/").replace(".git", "")
    
    # Match standard GitHub formats:
    # 1. https://github.com/owner/repo or http://github.com/...
    # 2. git@github.com:owner/repo or ssh://git@github.com/owner/repo
    # 3. owner/repo format
    github_pattern = r"(?:https?://(?:www\.)?github\.com/|git@github\.com:|ssh://git@github\.com/)([^/]+)/([^/]+)"
    match = re.search(github_pattern, clean_url)
    if match:
        return match.group(1), match.group(2)
        
    # Check if user passed "owner/repo" directly
    parts = [p for p in clean_url.split("/") if p]
    if len(parts) == 2:
        return parts[0], parts[1]
        
    raise ValueError(f"Invalid GitHub URL or format: '{url}'. Please provide a valid GitHub repository URL (e.g. 'https://github.com/owner/repo' or 'owner/repo').")

def get_auth_headers(token=None):
    headers = {
        "User-Agent": "Engineering-Analytics-Platform-MLOps",
        "Accept": "application/vnd.github.v3+json"
    }
    if token and token.strip() and token != "undefined":
        headers["Authorization"] = f"token {token.strip()}"
    return headers

def parse_link_header_count(link_header):
    if not link_header:
        return 0
    # Search for page number in rel="last" link
    # Example: <...page=120>; rel="last"
    match = re.search(r'page=(\d+)>; rel="last"', link_header)
    if match:
        return int(match.group(1))
    # If there's rel="next" but no rel="last", it means there are at least 2 pages
    match_next = re.search(r'page=(\d+)>; rel="next"', link_header)
    if match_next:
        return int(match_next.group(1))
    return 0

def get_repo_metrics(owner, repo, token=None):
    """Fetch repository metadata and count totals using pagination headers."""
    headers = get_auth_headers(token)
    repo_url = f"https://api.github.com/repos/{owner}/{repo}"
    
    response = requests.get(repo_url, headers=headers, timeout=10)
    if response.status_code == 403 or response.status_code == 429:
        raise Exception("GitHub API rate limit exceeded. Please configure a Personal Access Token in Settings.")
    elif response.status_code != 200:
        raise Exception(f"Failed to fetch repository metadata: {response.json().get('message', 'Unknown error')}")
        
    repo_data = response.json()
    
    # 1. Fetch total commits using per_page=1 and rel="last" link header trick
    commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1"
    r_commits = requests.get(commits_url, headers=headers, timeout=5)
    total_commits = parse_link_header_count(r_commits.headers.get("Link")) or (1 if r_commits.status_code == 200 else 0)
    
    # 2. Fetch total PRs
    pulls_url = f"https://api.github.com/repos/{owner}/{repo}/pulls?state=all&per_page=1"
    r_pulls = requests.get(pulls_url, headers=headers, timeout=5)
    total_pulls = parse_link_header_count(r_pulls.headers.get("Link")) or (1 if r_pulls.status_code == 200 else 0)

    # 3. Fetch total issues (which includes PRs in GitHub API)
    issues_url = f"https://api.github.com/repos/{owner}/{repo}/issues?state=all&per_page=1"
    r_issues = requests.get(issues_url, headers=headers, timeout=5)
    total_issues_and_prs = parse_link_header_count(r_issues.headers.get("Link")) or (1 if r_issues.status_code == 200 else 0)
    
    # 4. Fetch closed issues
    closed_issues_url = f"https://api.github.com/repos/{owner}/{repo}/issues?state=closed&per_page=1"
    r_closed = requests.get(closed_issues_url, headers=headers, timeout=5)
    total_closed = parse_link_header_count(r_closed.headers.get("Link")) or (1 if r_closed.status_code == 200 else 0)

    # Calculate actual issues only (total minus PRs)
    open_issues = repo_data.get("open_issues_count", 0)
    
    # Fetch Languages
    langs_url = f"{repo_url}/languages"
    r_langs = requests.get(langs_url, headers=headers, timeout=5)
    languages = r_langs.json() if r_langs.status_code == 200 else {}
    
    # Fetch Branches
    branches_url = f"{repo_url}/branches?per_page=1"
    r_branches = requests.get(branches_url, headers=headers, timeout=5)
    branches_count = parse_link_header_count(r_branches.headers.get("Link")) or (1 if r_branches.status_code == 200 else 1)

    # Fetch Releases
    releases_url = f"{repo_url}/releases?per_page=1"
    r_releases = requests.get(releases_url, headers=headers, timeout=5)
    releases = r_releases.json() if r_releases.status_code == 200 else []
    latest_release = releases[0].get("tag_name", "None") if releases else "None"
    releases_count = parse_link_header_count(r_releases.headers.get("Link")) or (1 if len(releases) > 0 else 0)
    
    # Parse creation and update dates
    created_at_str = repo_data.get("created_at")
    updated_at_str = repo_data.get("updated_at")
    
    created_at_dt = None
    if created_at_str:
        try:
            created_at_dt = datetime.datetime.strptime(created_at_str, "%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            pass
            
    updated_at_dt = None
    if updated_at_str:
        try:
            updated_at_dt = datetime.datetime.strptime(updated_at_str, "%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            pass
            
    return {
        "name": repo_data.get("full_name", f"{owner}/{repo}"),
        "owner": repo_data.get("owner", {}).get("login", owner),
        "stars": repo_data.get("stargazers_count", 0),
        "forks": repo_data.get("forks_count", 0),
        "watchers": repo_data.get("subscribers_count", 0),
        "open_issues": open_issues,
        "closed_issues": total_closed,
        "recent_commits": total_commits,
        "pull_requests": total_pulls,
        "branches_count": branches_count,
        "releases_count": releases_count,
        "default_branch": repo_data.get("default_branch", "main"),
        "languages": languages,
        "latest_release": latest_release,
        "description": repo_data.get("description", ""),
        "created_at": created_at_dt,
        "updated_at": updated_at_dt
    }

def get_contributors(owner, repo, token=None):
    """Fetch real contributor data and aggregate detailed metrics using bulk endpoints."""
    headers = get_auth_headers(token)
    contrib_url = f"https://api.github.com/repos/{owner}/{repo}/contributors?per_page=10"
    
    response = requests.get(contrib_url, headers=headers, timeout=10)
    if response.status_code == 403 or response.status_code == 429:
        raise Exception("GitHub API rate limit exceeded. Please configure a Personal Access Token in Settings.")
    elif response.status_code != 200:
        raise Exception(f"Failed to fetch contributors: {response.json().get('message', 'Unknown error')}")
        
    contribs = response.json()
    if not isinstance(contribs, list):
        return []
        
    # Limit to top 8 contributors to optimize requests
    active_contribs = contribs[:8]
    usernames = [c.get("login") for c in active_contribs]
    
    # Initialize aggregated metrics dict
    metrics = {uname: {
        "username": uname,
        "commits": 0,
        "pull_requests": 0,
        "issues_closed": 0,
        "reviews": 0,
        "active_days": 1, # default min
    } for uname in usernames}
    
    # Store total commits count from the contributor profile
    for c in active_contribs:
        uname = c.get("login")
        metrics[uname]["commits"] = c.get("contributions", 0)

    # 1. Fetch last 100 commits to calculate active days and recent commit counts
    commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=100"
    r_commits = requests.get(commits_url, headers=headers, timeout=10)
    if r_commits.status_code == 200:
        commits = r_commits.json()
        if isinstance(commits, list):
            user_commit_dates = {uname: set() for uname in usernames}
            for commit in commits:
                author_data = commit.get("author")
                if author_data:
                    author_name = author_data.get("login")
                    if author_name in metrics:
                        date_str = commit.get("commit", {}).get("author", {}).get("date", "")
                        if date_str:
                            day = date_str.split("T")[0]
                            user_commit_dates[author_name].add(day)
            
            for uname in usernames:
                metrics[uname]["active_days"] = max(1, len(user_commit_dates[uname]))

    # 2. Fetch last 100 pull requests to count PR authoring
    pulls_url = f"https://api.github.com/repos/{owner}/{repo}/pulls?state=all&per_page=100"
    r_pulls = requests.get(pulls_url, headers=headers, timeout=10)
    if r_pulls.status_code == 200:
        pulls = r_pulls.json()
        if isinstance(pulls, list):
            for pr in pulls:
                user_data = pr.get("user")
                if user_data:
                    uname = user_data.get("login")
                    if uname in metrics:
                        metrics[uname]["pull_requests"] += 1

    # 3. Fetch last 100 issues to count closed issues
    issues_url = f"https://api.github.com/repos/{owner}/{repo}/issues?state=closed&per_page=100"
    r_issues = requests.get(issues_url, headers=headers, timeout=10)
    if r_issues.status_code == 200:
        issues = r_issues.json()
        if isinstance(issues, list):
            for issue in issues:
                # Exclude Pull Requests from issue calculations
                if "pull_request" in issue:
                    continue
                user_data = issue.get("user")
                assignees = issue.get("assignees", [])
                
                # Check author
                if user_data:
                    uname = user_data.get("login")
                    if uname in metrics:
                        metrics[uname]["issues_closed"] += 1
                # Check assignees
                for asn in assignees:
                    uname = asn.get("login")
                    if uname in metrics:
                        metrics[uname]["issues_closed"] += 1

    # 4. Fetch last 100 issue comments (which represent discussion and review comments)
    comments_url = f"https://api.github.com/repos/{owner}/{repo}/issues/comments?per_page=100"
    r_comments = requests.get(comments_url, headers=headers, timeout=10)
    if r_comments.status_code == 200:
        comments = r_comments.json()
        if isinstance(comments, list):
            for comment in comments:
                user_data = comment.get("user")
                if user_data:
                    uname = user_data.get("login")
                    if uname in metrics:
                        metrics[uname]["reviews"] += 1

    return list(metrics.values())

def calculate_employee_score(profile: dict) -> int:
    """Calculate contribution score based on configurable weights and limits."""
    commits = profile.get("commits", 0)
    prs = profile.get("pull_requests", 0) or profile.get("prs", 0) or profile.get("merged_prs", 0)
    issues = profile.get("issues_closed", 0)
    reviews = profile.get("reviews", 0) or profile.get("code_reviews", 0)
    active = profile.get("active_days", 0)
    
    c_score = min((commits / SCORE_LIMITS["commits"]) * 100, 100)
    p_score = min((prs / SCORE_LIMITS["pull_requests"]) * 100, 100)
    i_score = min((issues / SCORE_LIMITS["issues_closed"]) * 100, 100)
    r_score = min((reviews / SCORE_LIMITS["reviews"]) * 100, 100)
    con_score = min((active / SCORE_LIMITS["consistency"]) * 100, 100)
    
    score = (
        c_score * SCORE_WEIGHTS["commits"] +
        p_score * SCORE_WEIGHTS["pull_requests"] +
        i_score * SCORE_WEIGHTS["issues_closed"] +
        r_score * SCORE_WEIGHTS["reviews"] +
        con_score * SCORE_WEIGHTS["consistency"]
    )
    return max(0, min(int(score), 100))

def get_performance(score: int) -> str:
    """Classify performance score into Neo Brutalist categories."""
    if score >= 90:
        return "Elite Contributor"
    elif score >= 75:
        return "Excellent"
    elif score >= 60:
        return "Good"
    elif score >= 45:
        return "Average"
    return "Needs Attention"

def get_repository_health(owner, repo, repo_metrics=None, contributors=None, token=None):
    """Calculate repository health score using 6 key criteria:
    Commit Activity, PR Activity, Issue Resolution Rate, Contributor Participation, Repository Maintenance, Review Participation
    """
    if not repo_metrics:
        repo_metrics = get_repo_metrics(owner, repo, token)
    if not contributors:
        contributors = get_contributors(owner, repo, token)
        
    open_issues = repo_metrics.get("open_issues", 0)
    closed_issues = repo_metrics.get("closed_issues", 0)
    total_issues = open_issues + closed_issues
    issue_resolution_rate = (closed_issues / total_issues) * 100 if total_issues > 0 else 100.0
    
    pull_requests = repo_metrics.get("pull_requests", 0)
    # PR Activity: normalized against healthy velocity of 15 PRs
    pr_activity = min((pull_requests / 15.0) * 100, 100.0)
    
    recent_commits = repo_metrics.get("recent_commits", 0)
    # Commit Activity: normalized against target 50 commits
    commit_activity = min((recent_commits / 50.0) * 100, 100.0)
    
    total_reviews = sum(c.get("reviews", 0) or c.get("code_reviews", 0) for c in contributors)
    # Review Participation: code reviews compared to PRs
    review_participation = min((total_reviews / max(pull_requests, 1)) * 100, 100.0)
    
    # Contributor Participation: ratio of active contributors
    active_contribs = sum(1 for c in contributors if c.get("commits", 0) > 0)
    contributor_participation = (active_contribs / max(len(contributors), 1)) * 100.0
    
    # Repository Maintenance: based on releases count
    releases = repo_metrics.get("releases_count", 0) or 0
    repository_maintenance = min((releases / 5.0) * 100, 100.0)
    if repository_maintenance == 0:
        # Default fallback to moderate if there are watchers and stars active
        repository_maintenance = 60.0 if repo_metrics.get("stars", 0) > 50 else 30.0
    
    health_score = int(
        (commit_activity * 0.15) +
        (pr_activity * 0.15) +
        (issue_resolution_rate * 0.20) +
        (contributor_participation * 0.15) +
        (repository_maintenance * 0.15) +
        (review_participation * 0.20)
    )
    health_score = max(0, min(health_score, 100))
    status = "Healthy" if health_score >= 75 else ("Moderate" if health_score >= 50 else "Critical")
    
    return {
        "health_score": health_score,
        "status": status,
        "commit_activity": round(commit_activity, 1),
        "pr_activity": round(pr_activity, 1),
        "issue_resolution_rate": round(issue_resolution_rate, 1),
        "contributor_participation": round(contributor_participation, 1),
        "repository_maintenance": round(repository_maintenance, 1),
        "review_participation": round(review_participation, 1)
    }

def generate_recommendations(contributors, health_score_data):
    """Generate engineering insights and recommendations from real repo metrics."""
    recs = []
    
    resolution_rate = health_score_data.get("issue_resolution_rate", 100)
    commit_act = health_score_data.get("commit_activity", 100)
    pr_act = health_score_data.get("pr_activity", 100)
    review_part = health_score_data.get("review_participation", 100)
    
    if resolution_rate < 70:
        recs.append("Issue resolution rate is declining. The issue backlog is increasing, please allocate resources to bug squashing.")
    if commit_act < 40:
        recs.append("Repository commit velocity has decreased. Scheduled feature velocity is slowing down.")
    if pr_act < 45:
        recs.append("PR activity is declining. Contributor throughput is dropping.")
    if review_part < 50:
        recs.append("Review participation is dropping. Increase code reviews to ensure design and code quality.")
        
    avg_active = sum(c.get("active_days", 0) for c in contributors) / max(len(contributors), 1)
    if avg_active < 3.5:
        recs.append("Several contributors are inactive or active days are dropping. Check for developer blockers.")
        
    if not recs:
        recs.append("Engineering pace is stable. Healthy reviews, code commits, and PR merges detected.")
        
    return recs

def detect_top_performer(profiles: list):
    """Detect top performers using combined metric evaluation."""
    if not profiles:
        return {}
        
    best = max(profiles, key=lambda p: p.get("score", 0) or p.get("contribution_score", 0))
    consistent = max(profiles, key=lambda p: p.get("active_days", 0))
    most_active = max(profiles, key=lambda p: (p.get("commits", 0) or 0) + (p.get("pull_requests", 0) or p.get("prs", 0) or p.get("merged_prs", 0) or 0))
    
    return {
        "best_contributor": {
            "name": best.get("username") or best.get("employee"),
            "score": best.get("score") or best.get("contribution_score", 0),
            "reason": f"Elite performance: composite engineering score of {best.get('score') or best.get('contribution_score', 0)}/100."
        },
        "most_consistent": {
            "name": consistent.get("username") or consistent.get("employee"),
            "score": consistent.get("score") or consistent.get("contribution_score", 0),
            "reason": f"Active contribution made across {consistent.get('active_days')} separate active days."
        },
        "most_active": {
            "name": most_active.get("username") or most_active.get("employee"),
            "score": most_active.get("score") or most_active.get("contribution_score", 0),
            "reason": f"Authored {most_active.get('commits')} commits and {(most_active.get('pull_requests') or most_active.get('prs') or most_active.get('merged_prs', 0))} pull requests."
        }
    }

def detect_risk(profiles: list):
    """Detect contributors at risk of underperformance or burnout."""
    warnings = []
    for p in profiles:
        score = p.get("score", 0) or p.get("contribution_score", 0)
        active_days = p.get("active_days", 0)
        username = p.get("username") or p.get("employee")
        
        if score < 45:
            warnings.append({
                "employee": username,
                "risk": "Low contribution score",
                "warning": f"Low contribution score detected ({score}/100). Check blockages or task distribution."
            })
        elif active_days < 2:
            warnings.append({
                "employee": username,
                "risk": "Reduced active days",
                "warning": f"Contributions made on less than 2 active days. Review progress blockers."
            })
    return warnings