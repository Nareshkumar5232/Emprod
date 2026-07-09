import hashlib
import datetime
import random
import json
from src.database import SessionLocal, engine
from src.models_db import (
    Base, User, Repository, Contributor,
    RepositoryAnalysis, ContributorAnalysis,
    RepositoryHealth, Recommendation, History, Prediction
)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def seed_db():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if users already exist
    if db.query(User).first() is not None:
        print("Database already seeded. Skipping seeder.")
        db.close()
        return

    print("Seeding Users...")
    users = [
        User(username="admin", password_hash=hash_password("admin123"), role="Admin"),
        User(username="leader", password_hash=hash_password("leader123"), role="Team Leader"),
        User(username="viewer", password_hash=hash_password("viewer123"), role="Viewer")
    ]
    db.add_all(users)
    db.commit()

    print("Seeding Repositories and Contributors...")
    print("Seeding Repositories and Contributors...")
    repos = [
        Repository(
            repo_url="https://github.com/facebook/react",
            name="facebook/react",
            owner="facebook",
            description="The library for web and native user interfaces.",
            stars=223000,
            forks=45200,
            watchers=1600,
            languages=json.dumps({"JavaScript": 45, "TypeScript": 50, "HTML": 3, "CSS": 2}),
            default_branch="main",
            branches_count=52,
            releases_count=180,
            repo_created_at=datetime.datetime(2013, 5, 24, 16, 15, 54),
            repo_updated_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
        ),
        Repository(
            repo_url="https://github.com/tensorflow/tensorflow",
            name="tensorflow/tensorflow",
            owner="tensorflow",
            description="An Open Source Machine Learning Framework for Everyone.",
            stars=182000,
            forks=89000,
            watchers=3500,
            languages=json.dumps({"C++": 62, "Python": 35, "HTML": 2, "Shell": 1}),
            default_branch="master",
            branches_count=145,
            releases_count=240,
            repo_created_at=datetime.datetime(2015, 11, 7, 23, 1, 40),
            repo_updated_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
        ),
        Repository(
            repo_url="https://github.com/naresh/mlops-platform",
            name="naresh/mlops-platform",
            owner="naresh",
            description="Custom MLOps and Repository analytics demo workspace.",
            stars=120,
            forks=24,
            watchers=5,
            languages=json.dumps({"Python": 70, "JavaScript": 25, "HTML": 3, "CSS": 2}),
            default_branch="main",
            branches_count=8,
            releases_count=6,
            repo_created_at=datetime.datetime(2023, 1, 15, 8, 30, 0),
            repo_updated_at=datetime.datetime.utcnow() - datetime.timedelta(days=5)
        )
    ]
    db.add_all(repos)
    db.commit()

    # Create Contributors
    react_contrib_names = ["dan_abramov", "gaearon", "sophiebits", "sebmarkbage", "bvaughn"]
    tf_contrib_names = ["mrry", "keveman", "jart", "martinwicke", "gunan"]
    mlops_contrib_names = ["naresh", "mlops-bot", "dev-ai", "reviewer-1"]

    all_contribs = {}
    for name in react_contrib_names + tf_contrib_names + mlops_contrib_names:
        c = Contributor(username=name, avatar_url=f"https://github.com/{name}.png")
        db.add(c)
        all_contribs[name] = c
    db.commit()

    # Generate 4 weeks of historical data
    # We will generate RepositoryAnalysis and ContributorAnalysis for Week 1, Week 2, Week 3, Week 4
    # Week 4 is the current week.
    print("Generating 4 weeks of repository health & contributor metrics history...")
    
    start_date = datetime.datetime.utcnow() - datetime.timedelta(days=28)
    
    for repo in repos:
        contrib_names = []
        if "react" in repo.name:
            contrib_names = react_contrib_names
        elif "tensorflow" in repo.name:
            contrib_names = tf_contrib_names
        else:
            contrib_names = mlops_contrib_names

        for week in range(1, 5):
            week_date = start_date + datetime.timedelta(days=(week - 1) * 7)
            
            # Base health metrics that improve/vary week by week
            commit_act = random.uniform(50, 95) + (week * 2.0)
            pr_act = random.uniform(60, 90) + (week * 1.5)
            issue_res = random.uniform(55, 88) + (week * 2.2)
            partic = random.uniform(70, 95)
            maint = random.uniform(60, 90)
            rev_partic = random.uniform(50, 85) + (week * 2.0)
            
            health_score = int((commit_act * 0.15) + (pr_act * 0.15) + (issue_res * 0.2) + (partic * 0.15) + (maint * 0.15) + (rev_partic * 0.2))
            health_score = max(30, min(100, health_score))
            
            status = "Healthy" if health_score >= 75 else ("Moderate" if health_score >= 50 else "Critical")

            analysis = RepositoryAnalysis(
                repo_id=repo.id,
                analyzed_at=week_date,
                commit_activity=round(commit_act, 1),
                pr_activity=round(pr_act, 1),
                issue_resolution_rate=round(issue_res, 1),
                contributor_participation=round(partic, 1),
                repository_maintenance=round(maint, 1),
                review_participation=round(rev_partic, 1),
                health_score=float(health_score),
                health_status=status,
                open_issues=random.randint(15, 80),
                closed_issues=random.randint(40, 200),
                recent_commits=random.randint(30, 150),
                pull_requests=random.randint(10, 45)
            )
            db.add(analysis)
            db.commit() # flush to get analysis.id

            # Add detailed health record
            health = RepositoryHealth(
                repo_analysis_id=analysis.id,
                commit_activity=round(commit_act, 1),
                pr_activity=round(pr_act, 1),
                issue_resolution_rate=round(issue_res, 1),
                contributor_participation=round(partic, 1),
                repository_maintenance=round(maint, 1),
                review_participation=round(rev_partic, 1),
                health_score=float(health_score),
                status=status
            )
            db.add(health)

            # Contributor metrics per week
            for name in contrib_names:
                contrib = all_contribs[name]
                
                # Metrics that change over time to simulate realistic development trends
                # e.g., dan_abramov is improving, bvaughn is declining slightly, etc.
                trend_factor = 1.0
                if name in ["dan_abramov", "naresh", "mrry"]:
                    trend_factor = 1.0 + (week * 0.15)  # Improving
                elif name in ["bvaughn", "gunan"]:
                    trend_factor = 1.2 - (week * 0.1)   # Declining
                
                commits = max(2, int(random.randint(5, 20) * trend_factor))
                prs = max(0, int(random.randint(1, 4) * trend_factor))
                issues = max(0, int(random.randint(1, 5) * trend_factor))
                reviews = max(1, int(random.randint(2, 10) * trend_factor))
                active_days = max(1, min(7, int(random.randint(2, 5) * (1.0 if trend_factor >= 1.0 else trend_factor))))
                consistency = round(active_days / 5.0, 2)
                
                # Contribution Score Formula:
                # Commits 30%, Merged PRs 25%, Issues Closed 15%, Code Reviews 15%, Consistency 15%
                c_norm = min((commits / 25.0) * 100, 100)
                p_norm = min((prs / 5.0) * 100, 100)
                i_norm = min((issues / 5.0) * 100, 100)
                r_norm = min((reviews / 10.0) * 100, 100)
                con_norm = min(consistency * 100, 100)
                
                score = int(
                    (c_norm * 0.3) +
                    (p_norm * 0.25) +
                    (i_norm * 0.15) +
                    (r_norm * 0.15) +
                    (con_norm * 0.15)
                )
                score = max(0, min(100, score))
                
                if score >= 90:
                    perf = "Elite Contributor"
                elif score >= 75:
                    perf = "Excellent"
                elif score >= 60:
                    perf = "Good"
                elif score >= 45:
                    perf = "Average"
                else:
                    perf = "Needs Attention"
                
                ca = ContributorAnalysis(
                    repo_analysis_id=analysis.id,
                    contributor_id=contrib.id,
                    commits=commits,
                    merged_prs=prs,
                    issues_closed=issues,
                    code_reviews=reviews,
                    consistency=float(consistency),
                    active_days=active_days,
                    contribution_score=float(score),
                    performance_category=perf,
                    timestamp=week_date
                )
                db.add(ca)
                db.commit() # Flush for ca.id

                # Add some simulated predictions for each week's analyses
                if week == 4:
                    # Current week predictions (ML targets: future score, trend, risk)
                    future_score = min(100, max(0, int(score + (random.randint(-8, 8) if trend_factor == 1.0 else (random.randint(2, 10) if trend_factor > 1.0 else random.randint(-12, -2))))))
                    
                    if future_score > score + 3:
                        trend = "Improving"
                    elif future_score < score - 3:
                        trend = "Declining"
                    else:
                        trend = "Stable"
                        
                    if future_score < 45 or active_days < 2:
                        risk = "High"
                    elif future_score < 60:
                        risk = "Medium"
                    else:
                        risk = "Low"
                        
                    pred = Prediction(
                        repo_analysis_id=analysis.id,
                        contributor_analysis_id=ca.id,
                        prediction_type="contributor_future",
                        future_contribution_score=float(future_score),
                        contributor_risk=risk,
                        performance_trend=trend,
                        predicted_at=datetime.datetime.utcnow()
                    )
                    db.add(pred)

            # Recommendations for Week 4 (Heuristic)
            if week == 4:
                recs = []
                if health_score < 70:
                    recs.append(Recommendation(
                        repo_analysis_id=analysis.id,
                        recommendation_text=f"Increase code review participation. Average PR review coverage is currently below 60%.",
                        category="reviews"
                    ))
                if health_score < 80:
                    recs.append(Recommendation(
                        repo_analysis_id=analysis.id,
                        recommendation_text=f"Address issue backlog: The resolution velocity of open issues is dropping.",
                        category="health"
                    ))
                if len(recs) == 0:
                    recs.append(Recommendation(
                        repo_analysis_id=analysis.id,
                        recommendation_text="Maintain currently excellent commit velocity and contribution consistency.",
                        category="general"
                    ))
                db.add_all(recs)

            # Add History Entry
            hist = History(
                repo_id=repo.id,
                repo_analysis_id=analysis.id,
                timestamp=week_date,
                action_type="analysis",
                summary=f"Weekly repository analysis completed. Health score evaluated at {health_score}% ({status})."
            )
            db.add(hist)
            
        db.commit()

    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_db()
