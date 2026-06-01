import csv
import json
from datetime import datetime
import re
from pathlib import Path

ROOT = Path(
    "/Users/ykamoji/Library/Application Support/Code/User/workspaceStorage"
)

OUTPUT = "/Users/ykamoji/Documents/copilot_credit_usage.csv"

DETAILS_RE = re.compile(
    r"^(.*?)\s*•\s*([\d.]+)(?:x|\s*credits?)?$",
    re.IGNORECASE,
)


rows = []
DEBUG = False

def extract_data(request, chat_analysis_models, chat_analysis_elapsed, chat_analysis_input_tokens,
                 chat_analysis_output_tokens, chat_analysis_thinking_tokens, chat_analysis_timestamps):
    if 'result' in request and 'details' in request['result']:
        result = request['result']
        details = result['details']
        if details:
            if DEBUG: print(details)
            chat_analysis_models.append(details)
            chat_analysis_elapsed.append(float(result['timings']['totalElapsed']) / 1000)
            chat_analysis_input_tokens.append(result['metadata']['promptTokens'])
            chat_analysis_output_tokens.append(result['metadata']['outputTokens'])
            thinking_tokens = 0
            if "toolCallRounds" in result['metadata']:
                for toolobj in result['metadata']['toolCallRounds']:
                    if "thinking" in toolobj and "tokens" in toolobj["thinking"]:
                        thinking_tokens += toolobj['thinking']["tokens"]

            chat_analysis_thinking_tokens.append(thinking_tokens)

            if 'modelState' in request and 'completedAt' in request['modelState']:
                completed_at = request['modelState']['completedAt']
                completed_time = datetime.fromtimestamp(completed_at / 1000).strftime("%Y-%m-%d %H:%M:%S")
                chat_analysis_timestamps.append(completed_time)


def extract_chat_data(obj_v):
    details = obj_v['details']
    if details:
        if DEBUG: print(details)
        chat_analysis_models.append(details)
        if DEBUG: print(f"session_id : {obj_v['metadata']['sessionId']}")
        chat_analysis_sessions.append(obj_v['metadata']['sessionId'])
        chat_analysis_elapsed.append(float(obj_v['timings']['totalElapsed']) / 1000)
        chat_analysis_input_tokens.append(obj_v['metadata']['promptTokens'])
        chat_analysis_output_tokens.append(obj_v['metadata']['outputTokens'])

        thinking_tokens = 0
        if "toolCallRounds" in obj_v['metadata']:
            for toolobj in obj_v['metadata']['toolCallRounds']:
                if "thinking" in toolobj and "tokens" in toolobj["thinking"]:
                    thinking_tokens += toolobj['thinking']["tokens"]

        chat_analysis_thinking_tokens.append(thinking_tokens)

for workspace in ROOT.iterdir():

    chat_sessions = workspace / "chatSessions"

    if not chat_sessions.is_dir():
        continue

    for jsonl_file in chat_sessions.glob("*.jsonl"):

        # if jsonl_file.name != '7ba6cf4d-a4ea-4d70-bb8b-de7fee2185a4.jsonl': continue

        try:

            chat_analysis_models = []
            chat_analysis_sessions = []
            chat_analysis_timestamps = []
            chat_analysis_elapsed = []
            chat_analysis_input_tokens = []
            chat_analysis_output_tokens = []
            chat_analysis_thinking_tokens = []
            with open(
                jsonl_file,
                encoding="utf-8"
            ) as f:

                for line_no, line in enumerate(f, 1):

                    try:
                        obj = json.loads(line)

                        ## Request route
                        if type(obj['v']) == list:
                            for obj_v in obj['v']:
                                if 'sessionId' in obj_v['result']['metadata']:
                                    if DEBUG: print(f"session_id : {obj_v['result']['metadata']['sessionId']}")
                                    chat_analysis_sessions.append(obj_v['result']['metadata']['sessionId'])
                                extract_data(obj_v, chat_analysis_models, chat_analysis_elapsed,
                                             chat_analysis_input_tokens, chat_analysis_output_tokens,
                                             chat_analysis_thinking_tokens, chat_analysis_timestamps)
                        else:
                            if 'requests' in obj['v']:
                                if DEBUG : print(f"session_id : {obj['v']['sessionId']}")
                                chat_analysis_sessions.append(obj['v']['sessionId'])
                                for request in obj['v']['requests']:
                                    extract_data(request, chat_analysis_models, chat_analysis_elapsed,
                                                 chat_analysis_input_tokens, chat_analysis_output_tokens,
                                                 chat_analysis_thinking_tokens, chat_analysis_timestamps)

                        ## Chat route
                        if 'details' in obj['v']:
                            extract_chat_data(obj['v'])

                        if 'completedAt' in obj['v']:
                            completed_at = obj['v']['completedAt']
                            completed_time = datetime.fromtimestamp(completed_at / 1000).strftime("%Y-%m-%d %H:%M:%S")
                            chat_analysis_timestamps.append(completed_time)
                    except Exception:
                        continue

        except Exception as e:
            print(
                f"Failed reading {jsonl_file}: {e}"
            )

        # assert len(chat_analysis_models) == len(chat_analysis_sessions) == len(chat_analysis_timestamps) == len(chat_analysis_elapsed), print(len(chat_analysis_models),len(chat_analysis_sessions), len(chat_analysis_timestamps), len(chat_analysis_elapsed))

        for i in range(len(chat_analysis_models)):
            record = {}
            model, credits = chat_analysis_models[i].split(" • ")
            record["model"] = model
            record["credits"] = float(credits.replace(" credits", "")) if "credits" in credits else credits
            record["time_taken"] = chat_analysis_elapsed[i]
            if i < len(chat_analysis_timestamps):
                record["timestamp"] = chat_analysis_timestamps[i]
            else:
                record["timestamp"] = ""
            if i < len(chat_analysis_input_tokens):
                record["input_tokens"] = chat_analysis_input_tokens[i]
                record["output_tokens"] = chat_analysis_output_tokens[i]
                record["thinking_tokens"] = chat_analysis_thinking_tokens[i]
            record["workspace"] = workspace.name
            record["file"] = jsonl_file.name
            if i< len(chat_analysis_sessions):
                record["session_id"] = chat_analysis_sessions[i]
            else:
                record["session_id"] = ""
            rows.append(record)     


rows.sort(
    key=lambda r: (
        r["timestamp"] or "",
        r["session_id"] or "",
    )
)

with open(
    OUTPUT,
    "w",
    newline="",
    encoding="utf-8"
) as csvfile:

    writer = csv.DictWriter(
        csvfile,
        fieldnames=[
            "timestamp",
            "model",
            "credits",
            "time_taken",
            "input_tokens",
            "output_tokens",
            "thinking_tokens",
            "session_id",
            "workspace",
            "file",
        ]
    )

    writer.writeheader()
    writer.writerows(rows)

print(
    f"Extracted {len(rows)} records to {OUTPUT}"
)