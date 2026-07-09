from src.database import engine
from src.models_db import Base
from src.db_seeder import seed_db

Base.metadata.create_all(bind=engine)
print("Database created successfully with all tables.")

seed_db()