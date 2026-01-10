"""Response logging utility for observability"""

import os
from pathlib import Path
from datetime import datetime


def log_response(intent: str, model_id: str, response_text: str) -> None:
    """
    Log every chat response to a text file for observability.
    
    Args:
        intent: The classified intent (chat, recommend, system_status, etc.)
        model_id: Model ID that generated the response (or SYSTEM_*)
        response_text: The actual response text
    
    Format:
        timestamp | intent=xxx | model=xxx | "response snippet..."
    
    Example:
        2026-01-10T20:55:03Z | intent=chat | model=phi3-mini | "Sure, 2+2 is 4..."
    """
    try:
        # Get log file path: ~/.hapie/logs/response_log.txt
        hapie_dir = Path.home() / ".hapie" / "logs"
        hapie_dir.mkdir(parents=True, exist_ok=True)
        log_file = hapie_dir / "response_log.txt"
        
        # Format timestamp in ISO 8601
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        # Truncate response to first 200 chars for brevity
        snippet = response_text.replace("\n", " ")[:200]
        if len(response_text) > 200:
            snippet += "..."
        
        # Format log line
        log_line = f'{timestamp} | intent={intent} | model={model_id} | "{snippet}"\n'
        
        # Append to log file
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(log_line)
            
    except Exception as e:
        # Fail silently - logging should never break chat
        # Could optionally log to stderr for debugging
        pass
