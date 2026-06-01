#!/bin/bash
LOG_FILE="/Users/ykamoji/Documents/copilot-analysis.log"
(
    # Give VS Code time to flush Copilot chat data
    sleep 10
    echo "Analysis started: $(date)"
    conda run -p /Users/ykamoji/anaconda3/envs/ai-news-aggregator python3 /Users/ykamoji/Documents/github-copilot-dashboard/preprocess/github_copilot_usage_tracker.py
    conda run -p /Users/ykamoji/anaconda3/envs/ai-news-aggregator python3 /Users/ykamoji/Documents/github-copilot-dashboard/preprocess/push_to_mongodb.py
    echo "Analysis finished: $(date)"
) >> "$LOG_FILE" 2>&1 &