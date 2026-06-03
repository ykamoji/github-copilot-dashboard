import os
import uuid
from datetime import datetime, timezone
from functools import wraps
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_caching import Cache
from pymongo import MongoClient
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure caching
cache = Cache(app, config={
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 300  # 5 minutes
})

def make_user_cache_key(*args, **kwargs):
    user_id = getattr(g, 'user_id', 'anonymous')
    return f"{request.path}:{user_id}:{str(request.args)}"

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "copilot_usage")

# Global client for connection pooling
db_client = None

def get_db():
    global db_client
    if not MONGO_URI or not MONGO_DB:
        raise ValueError("MONGO_URI and MONGO_DB must be set in the environment or .env file.")
    if db_client is None:
        db_client = MongoClient(MONGO_URI)
    return db_client[MONGO_DB]

def get_collection():
    return get_db()[MONGO_COLLECTION]

def get_users_collection():
    db = get_db()
    collection = db["users"]
    # Ensure email is unique
    collection.create_index("email", unique=True)
    return collection

def get_sessions_collection():
    db = get_db()
    collection = db["sessions"]
    # TTL index on created_at (expire after 3600 seconds = 1 hour)
    collection.create_index("created_at", expireAfterSeconds=3600)
    return collection


def parse_credit(raw):
    """Return (credit_rate, credits_absolute) from the raw credits field."""
    if raw is None or raw == "":
        return None, None
    if isinstance(raw, str):
        cleaned = raw.strip().lower()
        if cleaned.endswith("x"):
            try:
                return float(cleaned[:-1]), None
            except ValueError:
                return None, None
        try:
            return None, float(cleaned)
        except ValueError:
            return None, None
    try:
        return None, float(raw)
    except (TypeError, ValueError):
        return None, None


# --- Authentication Middleware ---

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"status": "error", "message": "Missing or invalid authorization header"}), 401
        
        token = auth_header.split(" ")[1]
        session = get_sessions_collection().find_one({"token": token})
        if not session:
            return jsonify({"status": "error", "message": "Session expired or invalid"}), 401
        
        user = get_users_collection().find_one({"user_id": session["user_id"]})
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 401
        
        g.user_id = user["user_id"]
        g.role = user.get("role", "user")
        
        return f(*args, **kwargs)
    return decorated_function


# --- Auth Endpoints ---

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    
    if not name or not email or not password:
        return jsonify({"status": "error", "message": "Name, email, and password are required"}), 400
        
    users = get_users_collection()
    if users.find_one({"email": email}):
        return jsonify({"status": "error", "message": "Email already in use"}), 400
        
    user_id = str(uuid.uuid4())
    password_hash = generate_password_hash(password)
    
    # Always set role to "user" on registration
    new_user = {
        "user_id": user_id,
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    
    users.insert_one(new_user)
    
    # Auto-login after registration
    token = str(uuid.uuid4())
    get_sessions_collection().insert_one({
        "token": token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    return jsonify({
        "status": "success",
        "token": token,
        "user": {
            "user_id": user_id,
            "name": name,
            "email": email,
            "role": "user",
            "created_at": new_user["created_at"].isoformat() if new_user.get("created_at") else None,
            "ai_token_budget": new_user.get("ai_token_budget")
        }
    })


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"status": "error", "message": "Email and password are required"}), 400
        
    user = get_users_collection().find_one({"email": email})
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"status": "error", "message": "Invalid email or password"}), 401
        
    token = str(uuid.uuid4())
    get_sessions_collection().insert_one({
        "token": token,
        "user_id": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    })
    
    return jsonify({
        "status": "success",
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "user"),
            "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
            "ai_token_budget": user.get("ai_token_budget")
        }
    })

@app.route("/api/auth/demo", methods=["POST"])
def demo_login():
    users = get_users_collection()
    user = users.find_one({"role": "viewer", "name": "Jake Parolta"})
    
    if not user:
        # Create it if the seed script hasn't run
        user_id = str(uuid.uuid4())
        user = {
            "user_id": user_id,
            "name": "Jake Parolta",
            "role": "viewer",
            "created_at": datetime.now(timezone.utc)
        }
        users.insert_one(user)
    
    token = str(uuid.uuid4())
    get_sessions_collection().insert_one({
        "token": token,
        "user_id": user["user_id"],
        "created_at": datetime.now(timezone.utc)
    })
    
    return jsonify({
        "status": "success",
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user.get("email"),
            "role": user.get("role", "viewer"),
            "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
            "ai_token_budget": user.get("ai_token_budget")
        }
    })

@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def logout():
    auth_header = request.headers.get("Authorization")
    token = auth_header.split(" ")[1]
    get_sessions_collection().delete_one({"token": token})
    return jsonify({"status": "success", "message": "Logged out successfully"})


@app.route("/api/auth/session", methods=["GET"])
@require_auth
def session_info():
    user = get_users_collection().find_one({"user_id": g.user_id})
    return jsonify({
        "status": "success",
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user.get("email"),
            "role": user.get("role", "user"),
            "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
            "ai_token_budget": user.get("ai_token_budget")
        }
    })

@app.route("/api/user/profile", methods=["PUT"])
@require_auth
def update_profile():
    data = request.json
    password = data.get("password")
    ai_token_budget = data.get("ai_token_budget")

    users = get_users_collection()
    update_fields = {}

    if password:
        update_fields["password_hash"] = generate_password_hash(password)
    
    if ai_token_budget is None or ai_token_budget == "":
        update_fields["ai_token_budget"] = None
    elif ai_token_budget is not None:
        try:
            update_fields["ai_token_budget"] = int(ai_token_budget)
        except ValueError:
            return jsonify({"status": "error", "message": "Invalid ai_token_budget"}), 400

    if not update_fields:
        return jsonify({"status": "error", "message": "No fields to update"}), 400

    users.update_one({"user_id": g.user_id}, {"$set": update_fields})
    
    user = users.find_one({"user_id": g.user_id})
    return jsonify({
        "status": "success",
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user.get("email"),
            "role": user.get("role", "user"),
            "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
            "ai_token_budget": user.get("ai_token_budget")
        }
    })


# --- Admin Endpoints ---

@app.route("/api/admin/users", methods=["GET"])
@require_auth
def admin_users():
    if g.role != "admin":
        return jsonify({"status": "error", "message": "Forbidden"}), 403
        
    users = list(get_users_collection().find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1))
    return jsonify({"status": "success", "data": users})


@app.route("/api/admin/users/<target_user_id>/reset-password", methods=["PUT"])
@require_auth
def admin_reset_password(target_user_id):
    if g.role != "admin":
        return jsonify({"status": "error", "message": "Forbidden"}), 403
        
    data = request.json
    new_password = data.get("new_password")
    if not new_password:
        return jsonify({"status": "error", "message": "New password is required"}), 400
        
    users_col = get_users_collection()
    target_user = users_col.find_one({"user_id": target_user_id})
    if not target_user:
        return jsonify({"status": "error", "message": "User not found"}), 404
        
    password_hash = generate_password_hash(new_password)
    users_col.update_one(
        {"user_id": target_user_id},
        {"$set": {"password_hash": password_hash}}
    )
    
    # Optionally, clear existing sessions for this user so they must log in again
    get_sessions_collection().delete_many({"user_id": target_user_id})
    
    return jsonify({"status": "success", "message": "Password reset successfully"})


# --- Dashboard Endpoints ---

@app.route("/api/models")
@require_auth
@cache.cached(query_string=True, key_prefix=make_user_cache_key)
def models():
    """Return distinct model names for the user."""
    try:
        collection = get_collection()
        target_user_id = g.user_id
        
        # Admin can pass ?target_user_id to view someone else's models
        admin_target = request.args.get("target_user_id")
        if g.role == "admin" and admin_target:
            target_user_id = admin_target
            
        model_list = sorted(collection.distinct("model", {"user_id": target_user_id}))
        model_list = [m for m in model_list if m]
        return jsonify({"status": "success", "data": model_list})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500



@app.route("/api/available-months")
@require_auth
@cache.cached(query_string=True, key_prefix=make_user_cache_key)
def available_months():
    try:
        collection = get_collection()
        target_user_id = g.user_id
        admin_target = request.args.get("target_user_id")
        if g.role == "admin" and admin_target:
            target_user_id = admin_target

        pipeline = [
            {"$match": {"user_id": target_user_id, "timestamp": {"$exists": True, "$ne": None, "$ne": ""}}},
            {"$addFields": {"month": {"$substr": ["$timestamp", 0, 7]}}},
            {"$group": {"_id": "$month"}},
            {"$sort": {"_id": -1}}
        ]
        results = collection.aggregate(pipeline)
        
        import re
        month_pattern = re.compile(r"^\d{4}-\d{2}$")
        months = [r["_id"] for r in results if r["_id"] and month_pattern.match(str(r["_id"]))]
        
        return jsonify({"status": "success", "data": months}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/usage")
@require_auth
@cache.cached(query_string=True, key_prefix=make_user_cache_key)
def usage():
    """Return usage records with filtering and optional session grouping."""
    try:
        collection = get_collection()
        target_user_id = g.user_id
        
        admin_target = request.args.get("target_user_id")
        if g.role == "admin" and admin_target:
            target_user_id = admin_target

        # Build base query
        query = {
            "user_id": target_user_id,
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
                date_filter["$lte"] = end + " 23:59:59"
            query["timestamp"] = {**query.get("timestamp", {}), **date_filter}

        group_by_session = request.args.get("group_by_session", "false").lower() == "true"

        if group_by_session:
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
                total_rate = 0.0
                total_absolute = 0.0
                has_rate = False
                has_absolute = False

                if "credit_rate" in r:
                    for cr in r["credit_rate"]:
                        if cr is not None and cr != "":
                            try:
                                total_rate += float(cr)
                                has_rate = True
                            except (ValueError, TypeError):
                                pass

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
            cursor = collection.find(query, {"_id": 0}).sort("timestamp", 1)
            data = []
            for doc in cursor:
                rate = doc.get("credit_rate")
                absolute = doc.get("credits")

                if rate is None and absolute is not None and isinstance(absolute, str):
                    rate, absolute = parse_credit(absolute)

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

@app.route("/api/cache/clear", methods=["POST"])
@require_auth
def clear_cache():
    cache.clear()
    return jsonify({"status": "success", "message": "Cache cleared successfully"})



if __name__ == "__main__":
    app.run(port=5328, debug=True)
