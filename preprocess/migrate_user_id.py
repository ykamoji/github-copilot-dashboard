import os
import argparse
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "copilot_usage")

def migrate(user_id):
    if not MONGO_URI or not MONGO_DB:
        print("Error: MONGO_URI and MONGO_DB must be set in .env")
        return

    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    collection = db[MONGO_COLLECTION]
    
    print(f"Checking for records without user_id...")
    count = collection.count_documents({"user_id": {"$exists": False}})
    
    if count == 0:
        print("No records found that need migration.")
        return
        
    print(f"Found {count} records. Updating with user_id: {user_id}...")
    
    result = collection.update_many(
        {"user_id": {"$exists": False}},
        {"$set": {"user_id": user_id}}
    )
    
    print(f"Migration complete! Modified {result.modified_count} records.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate existing dashboard records to a specific user.")
    parser.add_argument("--user-id", required=True, help="The UUID of the user to assign existing records to.")
    args = parser.parse_args()
    
    migrate(args.user_id)
