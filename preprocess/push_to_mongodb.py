import os
import csv
import pymongo
from dotenv import load_dotenv


# Load configuration from .env file
load_dotenv()

USER_ID = os.getenv("USER_ID")
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "copilot_usage")
CSV_FILE = os.getenv("CSV_FILE")

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
        if row.get("credits") is not None and row.get("credits") != "":
            try:
                row["credits"] = float(row["credits"])
            except ValueError:
                pass
        else:
            row["credits"] = None

        if row.get("credit_rate") is not None and row.get("credit_rate") != "":
            try:
                row["credit_rate"] = float(row["credit_rate"])
            except ValueError:
                pass
        else:
            row["credit_rate"] = None

        if row.get("time_taken") is not None and row.get("time_taken") != "":
            try:
                row["time_taken"] = float(row["time_taken"])
            except ValueError:
                pass

        if row.get("input_tokens") is not None and row.get("input_tokens") != "":
            try:
                row["input_tokens"] = int(row["input_tokens"])
            except ValueError:
                pass

        if row.get("output_tokens") is not None and row.get("output_tokens") != "":
            try:
                row["output_tokens"] = int(row["output_tokens"])
            except ValueError:
                pass

        if row.get("thinking_tokens") is not None and row.get("thinking_tokens") != "":
            try:
                row["thinking_tokens"] = int(row["thinking_tokens"])
            except ValueError:
                pass

        rows.append(row)

if rows:
    try:
        print(f"Connecting to MongoDB cluster...")
        client = pymongo.MongoClient(MONGO_URI)
        db = client[MONGO_DB]
        collection = db[MONGO_COLLECTION]

        # Upsert new records based on timestamp and model
        print(f"Upserting {len(rows)} records into collection '{MONGO_COLLECTION}' for user {USER_ID}...")
        operations = []
        for row in rows:
            # Stamp record with user_id
            row["user_id"] = USER_ID
            
            filter_query = {
                "timestamp": row.get("timestamp"),
                "model": row.get("model"),
                "user_id": USER_ID
            }
            operations.append(pymongo.UpdateOne(filter_query, {"$set": row}, upsert=True))
        
        if operations:
            result = collection.bulk_write(operations)
            print(f"Successfully upserted/modified records (Upserted: {result.upserted_count}, Modified: {result.modified_count}).")
    except Exception as e:
        print(f"Failed to push data to MongoDB: {e}")
        raise
else:
    print("No records found in CSV to push to MongoDB.")
