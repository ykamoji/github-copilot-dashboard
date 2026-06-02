import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_caching import Cache

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure caching
cache = Cache(app, config={
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 300  # 5 minutes
})

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "copilot_usage")

# Global client for connection pooling
db_client = None



def get_collection():
    global db_client
    if not MONGO_URI or not MONGO_DB:
        raise ValueError(
            "MONGO_URI and MONGO_DB must be set in the environment or .env file."
        )
    if db_client is None:
        db_client = MongoClient(MONGO_URI)
    return db_client[MONGO_DB][MONGO_COLLECTION]


def parse_credit(raw):
    """Return (credit_rate, credits_absolute) from the raw credits field.

    - If the value is a string ending with 'x' (e.g. '0.33x'), it is a rate
      multiplier.  credit_rate = 0.33, credits_absolute = None.
    - If the value is already numeric, it is an absolute credit count.
      credit_rate = None, credits_absolute = <value>.
    """
    if raw is None or raw == "":
        return None, None
    if isinstance(raw, str):
        cleaned = raw.strip().lower()
        if cleaned.endswith("x"):
            try:
                return float(cleaned[:-1]), None
            except ValueError:
                return None, None
        # Try to parse as a plain number string
        try:
            return None, float(cleaned)
        except ValueError:
            return None, None
    # Already numeric
    try:
        return None, float(raw)
    except (TypeError, ValueError):
        return None, None


@app.route("/api/models")
@cache.cached(query_string=True)
def models():
    """Return distinct model names."""
    try:
        collection = get_collection()
        model_list = sorted(collection.distinct("model"))
        # Filter out None / empty
        model_list = [m for m in model_list if m]
        return jsonify({"status": "success", "data": model_list})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/usage")
@cache.cached(query_string=True)
def usage():
    """Return usage records with filtering and optional session grouping.

    Query params:
        models      – comma-separated model names
        start       – ISO date string YYYY-MM-DD (inclusive)
        end         – ISO date string YYYY-MM-DD (inclusive)
        group_by_session – 'true' to aggregate per (session_id, model)
    """
    try:
        collection = get_collection()

        # --- Build base query (filter out records missing key fields) ---
        query = {
            "model": {"$exists": True, "$ne": None, "$ne": ""},
            "timestamp": {"$exists": True, "$ne": None, "$ne": ""},
            "$or": [
                {"credits": {"$exists": True, "$ne": None, "$ne": ""}},
                {"credit_rate": {"$exists": True, "$ne": None, "$ne": ""}},
            ]
        }

        # Model filter
        models_param = request.args.get("models")
        if models_param:
            model_list = [m.strip() for m in models_param.split(",") if m.strip()]
            if model_list:
                query["model"] = {"$in": model_list}

        # Date range filter
        start = request.args.get("start")
        end = request.args.get("end")
        if start or end:
            date_filter = {}
            if start:
                date_filter["$gte"] = start
            if end:
                # Make end inclusive: timestamps are "YYYY-MM-DD HH:MM:SS"
                date_filter["$lte"] = end + " 23:59:59"
            query["timestamp"] = {**query.get("timestamp", {}), **date_filter}

        group_by_session = request.args.get("group_by_session", "false").lower() == "true"

        if group_by_session:
            # Aggregate per (session_id, model), summing credits and tokens
            pipeline = [
                {"$match": query},
                {
                    "$addFields": {
                        "date": {"$substr": ["$timestamp", 0, 10]},
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "session_id": "$session_id",
                            "model": "$model",
                        },
                        "credits": {"$push": "$credits"},
                        "credit_rate": {"$push": "$credit_rate"},
                        "input_tokens": {"$sum": {"$ifNull": ["$input_tokens", 0]}},
                        "output_tokens": {"$sum": {"$ifNull": ["$output_tokens", 0]}},
                        "thinking_tokens": {"$sum": {"$ifNull": ["$thinking_tokens", 0]}},
                        "time_taken": {"$sum": {"$ifNull": ["$time_taken", 0]}},
                        "timestamp": {"$first": "$timestamp"},
                        "date": {"$first": "$date"},
                    }
                },
                {"$sort": {"timestamp": 1}},
            ]
            raw_results = list(collection.aggregate(pipeline))

            data = []
            for r in raw_results:
                # Separate rate vs absolute credits and sum them
                total_rate = 0.0
                total_absolute = 0.0
                has_rate = False
                has_absolute = False

                # Check credit_rate array
                if "credit_rate" in r:
                    for cr in r["credit_rate"]:
                        if cr is not None and cr != "":
                            try:
                                total_rate += float(cr)
                                has_rate = True
                            except (ValueError, TypeError):
                                pass

                # Check credits array
                if "credits" in r:
                    for c in r["credits"]:
                        if c is not None and c != "":
                            if isinstance(c, str) and c.strip().lower().endswith("x"):
                                try:
                                    total_rate += float(c.strip().lower()[:-1])
                                    has_rate = True
                                except ValueError:
                                    pass
                            else:
                                try:
                                    total_absolute += float(c)
                                    has_absolute = True
                                except (ValueError, TypeError):
                                    pass

                data.append({
                    "session_id": r["_id"]["session_id"],
                    "model": r["_id"]["model"],
                    "credit_rate": round(total_rate, 4) if has_rate else None,
                    "credits": round(total_absolute, 4) if has_absolute else None,
                    "input_tokens": r["input_tokens"],
                    "output_tokens": r["output_tokens"],
                    "thinking_tokens": r["thinking_tokens"],
                    "time_taken": round(r["time_taken"], 3),
                    "timestamp": r["timestamp"],
                    "date": r.get("date", r["timestamp"][:10] if r.get("timestamp") else ""),
                })

        else:
            # Return individual records
            cursor = collection.find(query, {"_id": 0}).sort("timestamp", 1)
            data = []
            for doc in cursor:
                rate = doc.get("credit_rate")
                absolute = doc.get("credits")

                # If they are legacy (e.g. credits has string value and credit_rate is not set)
                if rate is None and absolute is not None and isinstance(absolute, str):
                    rate, absolute = parse_credit(absolute)

                # Ensure correct types are returned to frontend (e.g. tokens/time as numbers)
                def to_int(v):
                    if v is None or v == "": return 0
                    try: return int(float(v))
                    except: return 0

                def to_float(v):
                    if v is None or v == "": return 0.0
                    try: return float(v)
                    except: return 0.0

                ts = doc.get("timestamp", "")
                data.append({
                    "model": doc.get("model"),
                    "credit_rate": rate,
                    "credits": absolute,
                    "input_tokens": to_int(doc.get("input_tokens")),
                    "output_tokens": to_int(doc.get("output_tokens")),
                    "thinking_tokens": to_int(doc.get("thinking_tokens")),
                    "time_taken": to_float(doc.get("time_taken")),
                    "session_id": doc.get("session_id"),
                    "timestamp": ts,
                    "date": ts[:10] if ts else "",
                })

        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/credits-per-model")
@cache.cached(query_string=True)
def credits_per_model():
    """Aggregate total credits per model."""
    try:
        collection = get_collection()
        pipeline = [
            {"$group": {"_id": "$model", "total_credits": {"$sum": "$credits"}}},
            {"$sort": {"total_credits": -1}},
        ]
        results = list(collection.aggregate(pipeline))
        data = [{"model": r["_id"], "credits": r["total_credits"]} for r in results]
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5328, debug=True)
