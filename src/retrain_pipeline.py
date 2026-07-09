from src.train import train_and_log

def retrain_model():
    """Trigger the Random Forest retraining pipeline using database history records."""
    try:
        results = train_and_log()
        return results
    except Exception as e:
        return {
            "status": "Error",
            "message": f"Retraining failed: {str(e)}"
        }

if __name__ == "__main__":
    print(retrain_model())
