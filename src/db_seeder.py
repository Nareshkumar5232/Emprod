import hashlib
from src.database import SessionLocal, engine
from src.models_db import Base, User

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def seed_db():
    """Seed production tables and default system user credentials."""
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
    db.close()
    print("Database initialization complete. Production users ready.")

if __name__ == "__main__":
    seed_db()
