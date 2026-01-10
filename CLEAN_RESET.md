# HAPIE Clean Reset Procedure

This script performs a complete environment reset for the Qwen system model architecture.

**WARNING**: This will delete all existing models, database, and Docker volumes. Use with caution!

## What This Does

1. Stops all HAPIE services
2. Deletes all downloaded models
3. Deletes the SQLite database
4. Removes Docker containers, volumes, and images
5. Rebuilds and restarts with clean state
6. Downloads fresh Qwen system model

## Prerequisites

- Docker and Docker Compose installed
- Running from project root directory

## Manual Steps

### 1. Stop Services

```powershell
docker-compose down
```

### 2. Delete Models

```powershell
# Delete models directory
Remove-Item -Recurse -Force $env:USERPROFILE\.hapie\models -ErrorAction SilentlyContinue

# If models are in project directory:
Remove-Item -Recurse -Force .hapie\models -ErrorAction SilentlyContinue
```

### 3. Delete Database

```powershell
# Delete database file
Remove-Item -Force $env:USERPROFILE\.hapie\hapie.db -ErrorAction SilentlyContinue

# If DB is in project directory:
Remove-Item -Force .hapie\hapie.db -ErrorAction SilentlyContinue
```

### 4. Clean Docker State (Optional - Full Reset)

```powershell
# Remove all HAPIE containers, volumes, and images
docker-compose down --volumes --rmi all

# Prune unused volumes
docker volume prune -f

# Prune unused images (careful - this affects ALL Docker images)
# docker image prune -a -f
```

### 5. Rebuild and Start

```powershell
# Rebuild backend image
docker-compose build

# Start services
docker-compose up -d
```

### 6. Run Setup (Download Qwen System Model)

```powershell
# Wait for backend to be ready (check health endpoint)
Start-Sleep -Seconds 10

# Run setup script inside container
docker-compose exec backend python setup.py
```

### 7. Verify System Model Registration

```powershell
# Check models API
curl http://localhost:8000/api/models

# Should show:
# - One model: Qwen2.5 1.5B Instruct
# - is_base_model: true
# - metadata.role: "system_intent"
# - is_active: false (NOT set as active chat model)
```

### 8. Test Chat Endpoint (No User Model)

```powershell
# Test onboarding message
curl -X POST http://localhost:8000/api/chat/single `
  -H "Content-Type: application/json" `
  -d '{"prompt": "Hello!"}'

# Should return onboarding message about downloading a model
# model_id should be "SYSTEM_ONBOARDING"
```

### 9. Monitor Response Log

```powershell
# Watch the response log file
Get-Content -Path $env:USERPROFILE\.hapie\logs\response_log.txt -Wait

# Or view recent entries
Get-Content -Path $env:USERPROFILE\.hapie\logs\response_log.txt -Tail 20
```

## Expected Behavior After Reset

| User Action | Intent Classified | Handler | Model Used |
|-------------|-------------------|---------|------------|
| "Hello" | `chat` | Onboarding message | `SYSTEM_ONBOARDING` |
| "Recommend a model" | `recommend` | Recommendation API | `SYSTEM_RECOMMEND` |
| "System status" | `system_status` | System API | `SYSTEM_STATUS` |
| "Pull phi3" | `pull` | Pull model API | `SYSTEM_PULL` |
| "List models" | `model_list` | Model manager | `SYSTEM_LIST` |

After pulling a model (e.g., `pull phi3`):

| User Action | Intent Classified | Handler | Model Used |
|-------------|-------------------|---------|------------|
| "Hello" | `chat` | Normal inference | `phi3-mini` |
| "What is 2+2?" | `chat` | Normal inference | `phi3-mini` |
| "System status" | `system_status` | System API | `SYSTEM_STATUS` |

## Troubleshooting

### Qwen Model Not Downloaded

```powershell
# Manually run setup again
docker-compose exec backend python setup.py
```

### Port Already in Use

```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Docker Volume Issues

```powershell
# List volumes
docker volume ls

# Remove specific volume
docker volume rm happie_hapie-data
```

### Intent Classification Not Working

Check Qwen model is loaded:
```powershell
# View backend logs
docker-compose logs backend

# Should see "Loading model: qwen2.5-1.5b-instruct"
```

### Response Log Not Creating

```powershell
# Manually create logs directory
New-Item -Path $env:USERPROFILE\.hapie\logs -ItemType Directory -Force
```

## Next Steps

After successful reset:

1. Test intent classification with various prompts
2. Pull a user model: `curl -X POST http://localhost:8000/api/chat/single -H "Content-Type: application/json" -d '{"prompt": "pull phi3"}'`
3. Test normal chat with user model
4. Verify response log shows correct model names
5. Test model switching functionality
