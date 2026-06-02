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
            if 'promptTokens' in result['metadata']:
                chat_analysis_input_tokens.append(result['metadata']['promptTokens'])
            else:
                chat_analysis_input_tokens.append(0)
            if 'outputTokens' in result['metadata']:
                chat_analysis_output_tokens.append(result['metadata']['outputTokens'])
            else:
                chat_analysis_output_tokens.append(0)

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
            else:
                chat_analysis_timestamps.append(0)
            return True
    return False


def extract_chat_data(obj_v):
    details = obj_v['details']
    if details:
        if DEBUG: print(details)
        chat_analysis_models.append(details)
        if DEBUG: print(f"session_id : {obj_v['metadata']['sessionId']}")
        chat_analysis_sessions.append(obj_v['metadata']['sessionId'])
        if 'totalElapsed' in obj_v['timings']:
            chat_analysis_elapsed.append(float(obj_v['timings']['totalElapsed']) / 1000)
        else:
            chat_analysis_elapsed.append(0)

        if 'promptTokens' in obj_v['metadata']:
            chat_analysis_input_tokens.append(obj_v['metadata']['promptTokens'])
        else:
            chat_analysis_input_tokens.append(0)

        if 'outputTokens' in obj_v['metadata']:
            chat_analysis_output_tokens.append(obj_v['metadata']['outputTokens'])
        else:
            chat_analysis_output_tokens.append(0)

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

        # if jsonl_file.name != '77f00474-1f2a-4bdf-aab5-281577394744.jsonl': continue

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

                json_objs = list(enumerate(f, 1))
                total_lines = len(json_objs)
                for line_no, line in json_objs:

                    try:
                        obj = json.loads(line)

                        ## Request route
                        if type(obj['v']) == list:
                            for obj_v in obj['v']:
                                completed = extract_data(obj_v, chat_analysis_models, chat_analysis_elapsed,
                                             chat_analysis_input_tokens, chat_analysis_output_tokens,
                                             chat_analysis_thinking_tokens, chat_analysis_timestamps)
                                if completed and 'sessionId' in obj_v['result']['metadata']:
                                    if DEBUG: print(f"session_id : {obj_v['result']['metadata']['sessionId']}")
                                    chat_analysis_sessions.append(obj_v['result']['metadata']['sessionId'])
                        else:
                            if 'requests' in obj['v']:
                                for request in obj['v']['requests']:
                                    completed = extract_data(request, chat_analysis_models, chat_analysis_elapsed,
                                                 chat_analysis_input_tokens, chat_analysis_output_tokens,
                                                 chat_analysis_thinking_tokens, chat_analysis_timestamps)
                                    if DEBUG: print(f"session_id : {obj['v']['sessionId']}")
                                    if completed: chat_analysis_sessions.append(obj['v']['sessionId'])

                        ## Chat route
                        if 'details' in obj['v']:
                            extract_chat_data(obj['v'])
                            # print(f'{line_no} chat_model')
                            if 'maxToolCallsExceeded' in obj['v']['metadata']:
                                max_timestamp = 0
                                if 'toolCallRounds' in obj['v']['metadata']:
                                    for tool_response in obj['v']['metadata']['toolCallRounds']:
                                        if max_timestamp < tool_response['timestamp']:
                                            max_timestamp = float(tool_response['timestamp'])

                                if max_timestamp == 0:
                                    chat_analysis_timestamps.append("")
                                else:
                                    completed_time = datetime.fromtimestamp(max_timestamp / 1000).strftime(
                                        "%Y-%m-%d %H:%M:%S")
                                    chat_analysis_timestamps.append(completed_time)

                        if 'completedAt' in obj['v']:
                            completed_at = obj['v']['completedAt']
                            completed_time = datetime.fromtimestamp(completed_at / 1000).strftime("%Y-%m-%d %H:%M:%S")
                            chat_analysis_timestamps.append(completed_time)
                            # print(f'{line_no} completedAt')

                    except Exception:
                        continue

        except Exception as e:
            print(
                f"Failed reading {jsonl_file}: {e}"
            )

        assert len(chat_analysis_models) == len(chat_analysis_sessions) == len(chat_analysis_timestamps) \
               == len(chat_analysis_elapsed) == len(chat_analysis_input_tokens) == len(chat_analysis_output_tokens) \
               == len(chat_analysis_thinking_tokens), \
            print(f"Workspace {workspace.name} Session: {jsonl_file.name}\t "
                f"Models :{len(chat_analysis_models)}, Sessions: {len(chat_analysis_sessions)}, "+
                  f"TimeStamps: {len(chat_analysis_timestamps)}, Duration: {len(chat_analysis_elapsed)}, "+
                  f"Input Tokens: {len(chat_analysis_input_tokens)}, "+
                  f"Output Tokens: {len(chat_analysis_output_tokens)}, Thinking Tokens: {len(chat_analysis_thinking_tokens)}")

        for i in range(len(chat_analysis_models)):
            record = {}
            model, raw_credits = chat_analysis_models[i].split(" • ")
            record["model"] = model
            
            raw_credits_str = raw_credits.strip().lower()
            if raw_credits_str.endswith("x"):
                try:
                    record["credit_rate"] = float(raw_credits_str[:-1])
                except ValueError:
                    record["credit_rate"] = ""
                record["credits"] = ""
            else:
                cleaned = raw_credits_str.replace(" credits", "")
                try:
                    record["credits"] = float(cleaned)
                except ValueError:
                    record["credits"] = raw_credits
                record["credit_rate"] = ""

            record["time_taken"] = chat_analysis_elapsed[i]
            record["timestamp"] = chat_analysis_timestamps[i]
            record["input_tokens"] = chat_analysis_input_tokens[i]
            record["output_tokens"] = chat_analysis_output_tokens[i]
            record["thinking_tokens"] = chat_analysis_thinking_tokens[i]
            record["workspace"] = workspace.name
            record["file"] = jsonl_file.name
            record["session_id"] = chat_analysis_sessions[i]
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
            "credit_rate",
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