import os
import csv
import pymongo
from dotenv import load_dotenv

# Load configuration from .env file
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "copilot_usage")
CSV_FILE = "copilot_credit_usage.csv"

if not MONGO_URI or not MONGO_DB:
    raise ValueError("MONGO_URI and MONGO_DB must be set in the environment or .env file.")

if not os.path.exists(CSV_FILE):
    raise FileNotFoundError(f"CSV file '{CSV_FILE}' not found. Please run the tracker script first.")

rows = []
print(f"Reading records from {CSV_FILE}...")
with open(CSV_FILE, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Convert numeric fields back to their proper types
        try:
            if row.get("credits"):
                row["credits"] = float(row["credits"])
            if row.get("time_taken"):
                row["time_taken"] = float(row["time_taken"])
            if row.get("input_tokens"):
                row["input_tokens"] = int(row["input_tokens"])
            if row.get("output_tokens"):
                row["output_tokens"] = int(row["output_tokens"])
            if row.get("thinking_tokens"):
                row["thinking_tokens"] = int(row["thinking_tokens"])
        except ValueError as ve:
            # Fallback to raw string if conversion fails
            pass
        rows.append(row)

if rows:
    try:
        print(f"Connecting to MongoDB cluster...")
        client = pymongo.MongoClient(MONGO_URI)
        db = client[MONGO_DB]
        collection = db[MONGO_COLLECTION]

        # Clear existing records to avoid duplicates across runs
        print(f"Clearing collection '{MONGO_COLLECTION}' in database '{MONGO_DB}'...")
        collection.delete_many({})

        # Insert new records
        print(f"Inserting {len(rows)} records into collection '{MONGO_COLLECTION}'...")
        result = collection.insert_many(rows)
        print(f"Successfully pushed {len(result.inserted_ids)} records to MongoDB.")
    except Exception as e:
        print(f"Failed to push data to MongoDB: {e}")
        raise
else:
    print("No records found in CSV to push to MongoDB.")
