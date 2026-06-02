import os
import uuid
import random
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "copilot_usage")

MULTIPLIERS = {
    "Claude Haiku 4.5": 0.33,
    " Claude Opus 4.6": 27.0,
    "Claude Sonnet 4": 9.0,
    "Claude Sonnet 4.6": 9.0,
    "GPT-4o": 0.33,
    "GPT-4.1": 0.33,
    "GPT-5.4": 6.0,
    "GPT-5.3-Codex": 6.0
}

PRICING_MAP = {
    'GPT-4.1': {'input': 2.00, 'output': 8.00},
    'GPT-4o': {'input': 2.50, 'output': 10.00},
    'GPT-5.4': {'input': 2.50, 'output': 15.00},
    'GPT-5.3-Codex': {'input': 1.75, 'output': 14.00},
    'Claude Haiku 4.5': {'input': 1.00, 'output': 5.00},
    'Claude Sonnet 4': {'input': 3.00, 'output': 15.00},
    'Claude Sonnet 4.6': {'input': 3.00, 'output': 15.00},
    ' Claude Opus 4.6': {'input': 5.00, 'output': 25.00},
}

# Create 50 unique session IDs
SESSION_IDS = [str(uuid.uuid4()) for _ in range(30)]

def generate_dummy_data():
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    users_col = db["users"]
    dash_col = db[MONGO_COLLECTION]
    
    # 1. Create or get dummy user "Jake Parolta" with role "viewer"
    user = users_col.find_one({"role": "viewer", "name": "Jake Parolta"})
    if not user:
        user_id = str(uuid.uuid4())
        user = {
            "user_id": user_id,
            "name": "Jake Parolta",
            "role": "viewer",
            "created_at": datetime.now(timezone.utc)
        }
        users_col.insert_one(user)
        print(f"Created dummy user: {user_id}")
    else:
        user_id = user["user_id"]
        print(f"Found existing dummy user: {user_id}")
        
    # Clear existing dummy data for this user
    dash_col.delete_many({"user_id": user_id})
    print("Cleared existing dummy data.")

    # 2. Generate comprehensive dummy data
    records = []
    
    # Generate data over the past 90 days
    start_date = datetime.now() - timedelta(days=90)
    
    # Generate 800-1000 records
    num_records = random.randint(800, 1000)
    
    for _ in range(num_records):
        # Pick a random model
        model = random.choice(list(MULTIPLIERS.keys()))
        
        # Random time within the 90 days
        days_offset = random.randint(0, 90)
        hours_offset = random.randint(0, 23)
        mins_offset = random.randint(0, 59)
        
        # Create timestamp
        record_time = start_date + timedelta(days=days_offset, hours=hours_offset, minutes=mins_offset)
        
        multiplier = MULTIPLIERS.get(model, 1.0)
        complexity = 0.5 + (multiplier ** 0.5) * 0.5
        
        # Token usage scaled by model complexity
        input_tokens = int(random.randint(50000, 150000) * complexity)
        output_tokens = int(random.randint(100, 10000) * complexity)
        
        # Thinking tokens and execution time dependent on model family and complexity
        model_lower = model.lower().strip()
        if "claude" in model_lower:
            if multiplier >= 9.0:
                thinking_tokens = int(random.randint(100, 5000) * complexity)
            else:
                thinking_tokens = 0
            time_taken = random.uniform(30.0, 120.0) * complexity
        elif "gpt" in model_lower:
            if multiplier >= 6.0:
                thinking_tokens = int(random.randint(100, 400) * complexity)
            else:
                thinking_tokens = 0
            time_taken = random.uniform(20.0, 90.0) * complexity
        else:
            thinking_tokens = int(random.randint(50, 300) * complexity)
            time_taken = random.uniform(40.0, 100.0) * complexity
        
        # Session ID grouping (simulate coding session)
        session_id = random.choice(SESSION_IDS)
        
        # Either credits or credit_rate based on date boundary of June 1, 2026
        # Before June 1: only credit_rates apply. On or after June 1: only credits apply.
        cutoff_date = datetime(2026, 6, 1)
        if record_time < cutoff_date:
            credit_rate = multiplier
            credits = None
        else:
            credit_rate = None
            # Calculate credits dynamically based on actual token consumption (price per 1M tokens)
            pricing = PRICING_MAP.get(model, {'input': 1.0, 'output': 5.0})
            input_cost = (input_tokens / 1_000_000.0) * pricing['input']
            output_cost = ((output_tokens + thinking_tokens) / 1_000_000.0) * pricing['output']
            credits = round(input_cost + output_cost, 2)
            if credits < 0.01:
                credits = 0.1
            
        record = {
            "user_id": user_id,
            "model": model,
            "timestamp": record_time.strftime("%Y-%m-%d %H:%M:%S"),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "thinking_tokens": thinking_tokens,
            "time_taken": time_taken,
            "session_id": session_id,
            "credits": credits,
            "credit_rate": credit_rate
        }
        records.append(record)
        
    # Sort by timestamp
    records.sort(key=lambda x: x["timestamp"])
    
    # Insert batch
    if records:
        dash_col.insert_many(records)
        print(f"Inserted {len(records)} dummy records for user {user_id}")
    
if __name__ == "__main__":
    generate_dummy_data()
