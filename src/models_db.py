from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="Viewer") # "Admin", "Team Leader", "Viewer"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    repo_url = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    owner = Column(String, nullable=True)
    description = Column(String, nullable=True)
    stars = Column(Integer, default=0)
    forks = Column(Integer, default=0)
    watchers = Column(Integer, default=0)
    languages = Column(String, default="{}") # JSON encoded string of language metrics
    default_branch = Column(String, default="main")
    branches_count = Column(Integer, default=1)
    releases_count = Column(Integer, default=0)
    repo_created_at = Column(DateTime, nullable=True)
    repo_updated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    analyses = relationship("RepositoryAnalysis", back_populates="repo", cascade="all, delete-orphan")
    history_entries = relationship("History", back_populates="repo", cascade="all, delete-orphan")

class Contributor(Base):
    __tablename__ = "contributors"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    analyses = relationship("ContributorAnalysis", back_populates="contributor", cascade="all, delete-orphan")

class RepositoryAnalysis(Base):
    __tablename__ = "repository_analyses"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False, index=True)
    analyzed_at = Column(DateTime, default=datetime.datetime.utcnow)
    commit_activity = Column(Float, default=0.0)
    pr_activity = Column(Float, default=0.0)
    issue_resolution_rate = Column(Float, default=0.0)
    contributor_participation = Column(Float, default=0.0)
    repository_maintenance = Column(Float, default=0.0)
    review_participation = Column(Float, default=0.0)
    health_score = Column(Float, default=0.0)
    health_status = Column(String, default="Healthy") # "Healthy", "Moderate", "Critical"
    
    # Raw counts collected from GitHub
    open_issues = Column(Integer, default=0)
    closed_issues = Column(Integer, default=0)
    recent_commits = Column(Integer, default=0)
    pull_requests = Column(Integer, default=0)

    repo = relationship("Repository", back_populates="analyses")
    contributor_analyses = relationship("ContributorAnalysis", back_populates="repo_analysis", cascade="all, delete-orphan")
    health = relationship("RepositoryHealth", back_populates="repo_analysis", uselist=False, cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="repo_analysis", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="repo_analysis", cascade="all, delete-orphan")
    history_entries = relationship("History", back_populates="repo_analysis", cascade="all, delete-orphan")

class ContributorAnalysis(Base):
    __tablename__ = "contributor_analyses"

    id = Column(Integer, primary_key=True, index=True)
    repo_analysis_id = Column(Integer, ForeignKey("repository_analyses.id"), nullable=False, index=True)
    contributor_id = Column(Integer, ForeignKey("contributors.id"), nullable=False, index=True)
    commits = Column(Integer, default=0)
    merged_prs = Column(Integer, default=0)
    issues_closed = Column(Integer, default=0)
    code_reviews = Column(Integer, default=0)
    consistency = Column(Float, default=0.0)
    active_days = Column(Integer, default=0)
    contribution_score = Column(Float, default=0.0)
    performance_category = Column(String, default="Good") # "Elite Contributor", "Excellent", "Good", "Average", "Needs Attention"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    repo_analysis = relationship("RepositoryAnalysis", back_populates="contributor_analyses")
    contributor = relationship("Contributor", back_populates="analyses")
    predictions = relationship("Prediction", back_populates="contributor_analysis", cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    repo_analysis_id = Column(Integer, ForeignKey("repository_analyses.id"), nullable=True, index=True)
    contributor_analysis_id = Column(Integer, ForeignKey("contributor_analyses.id"), nullable=True, index=True)
    prediction_type = Column(String, nullable=False) # "contributor_future", "repository_future"
    future_contribution_score = Column(Float, nullable=True)
    future_repository_health = Column(Float, nullable=True)
    contributor_risk = Column(String, default="Low") # "Low", "Medium", "High"
    performance_trend = Column(String, default="Stable") # "Improving", "Stable", "Declining"
    predicted_at = Column(DateTime, default=datetime.datetime.utcnow)

    repo_analysis = relationship("RepositoryAnalysis", back_populates="predictions")
    contributor_analysis = relationship("ContributorAnalysis", back_populates="predictions")

class RepositoryHealth(Base):
    __tablename__ = "repository_health"

    id = Column(Integer, primary_key=True, index=True)
    repo_analysis_id = Column(Integer, ForeignKey("repository_analyses.id"), nullable=False, index=True)
    commit_activity = Column(Float, default=0.0)
    pr_activity = Column(Float, default=0.0)
    issue_resolution_rate = Column(Float, default=0.0)
    contributor_participation = Column(Float, default=0.0)
    repository_maintenance = Column(Float, default=0.0)
    review_participation = Column(Float, default=0.0)
    health_score = Column(Float, default=0.0)
    status = Column(String, default="Healthy")

    repo_analysis = relationship("RepositoryAnalysis", back_populates="health")

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    repo_analysis_id = Column(Integer, ForeignKey("repository_analyses.id"), nullable=False, index=True)
    recommendation_text = Column(String, nullable=False)
    category = Column(String, default="general") # "health", "contribution", "reviews", "maintenance"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    repo_analysis = relationship("RepositoryAnalysis", back_populates="recommendations")

class MLExperiment(Base):
    __tablename__ = "ml_experiments"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String, unique=True, index=True, nullable=False)
    experiment_name = Column(String, nullable=False)
    accuracy = Column(Float, nullable=True)
    dataset_size = Column(Integer, nullable=True)
    parameters = Column(String, default="{}") # JSON string
    metrics = Column(String, default="{}") # JSON string
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    repo_id = Column(Integer, ForeignKey("repositories.id"), nullable=False, index=True)
    repo_analysis_id = Column(Integer, ForeignKey("repository_analyses.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    action_type = Column(String, default="analysis") # "analysis", "prediction", "retrain"
    summary = Column(String, nullable=False)

    repo = relationship("Repository", back_populates="history_entries")
    repo_analysis = relationship("RepositoryAnalysis", back_populates="history_entries")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_role = Column(String, default="Viewer")
    action = Column(String, nullable=False)
    endpoint = Column(String, nullable=False)
    details = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)