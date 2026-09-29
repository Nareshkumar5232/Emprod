import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib
import mlflow
import mlflow.sklearn

# Constants / configuration
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "employee_productivity.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "productivity_model.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")

TEST_SIZE = 0.2
RANDOM_SEED = 42
N_ESTIMATORS = 200
MAX_DEPTH = None

def main():
    # Ensure model directory exists
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Load dataset
    df = pd.read_csv(DATA_PATH)
    
    # Map old targets to modern performance categories
    df["productivity"] = df["productivity"].map({
        "High": "High Performer",
        "Medium": "Medium Performer",
        "Low": "Needs Improvement"
    })
    
    # Separate features and target
    X = df[["commits", "prs", "issues", "reviews"]]
    y = df["productivity"]

    # Encode target labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    # Train‑test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=TEST_SIZE, random_state=RANDOM_SEED, stratify=y_encoded
    )

    # Initialize and train Random Forest
    clf = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        max_depth=MAX_DEPTH,
        random_state=RANDOM_SEED,
    )
    clf.fit(X_train, y_train)

    # Evaluate
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Test Accuracy: {accuracy:.4f}")

    # MLflow tracking
    os.environ["MLFLOW_ALLOW_FILE_STORE"] = "true"
    tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment("employee_productivity")
    
    with mlflow.start_run():
        mlflow.log_param("n_estimators", N_ESTIMATORS)
        mlflow.log_param("max_depth", MAX_DEPTH)
        mlflow.log_param("random_state", RANDOM_SEED)
        mlflow.log_param("test_size", TEST_SIZE)
        mlflow.log_metric("accuracy", accuracy)
        # Log model artifact
        mlflow.sklearn.log_model(clf, "model")
        # Also log the label encoder as a generic artifact
        joblib.dump(label_encoder, ENCODER_PATH)
        mlflow.log_artifact(ENCODER_PATH, "encoder")

    # Persist model and encoder for FastAPI usage
    joblib.dump(clf, MODEL_PATH)
    joblib.dump(label_encoder, ENCODER_PATH)
    print(f"Model saved to {MODEL_PATH}")
    print(f"Label encoder saved to {ENCODER_PATH}")

if __name__ == "__main__":
    main()

