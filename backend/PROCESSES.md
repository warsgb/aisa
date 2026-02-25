# Backend Process Management

## Overview

NestJS's `nest start` command creates a process chain:
```
shell → nest CLI → shell → node app
```

This causes issues with standard `pkill` commands. The scripts below solve this problem.

## Scripts

### 📜 start-backend.sh
Starts the backend cleanly with a single process (not 4).

**Features:**
- Detects and stops existing backend on port 3001
- Starts backend directly with `node` (bypassing nest wrapper)
- Reduces process chain from 4 → 1
- Saves PID for later management

### 🛑 stop-backend.sh
Stops ALL backend-related processes thoroughly.

**Features:**
- Kills by port (most reliable)
- Kills by process pattern (thorough)
- Shows process count before/after
- Verifies port is released

## Usage

### Method 1: Direct Scripts
```bash
cd /home/presales/aisa/backend

# Start backend
./start-backend.sh

# Stop backend
./stop-backend.sh
```

### Method 2: NPM Commands (Recommended)
```bash
cd /home/presales/aisa/backend

# Start backend
npm start

# Stop backend
npm run stop

# Restart backend (stop + start)
npm run restart

# Start with nest (creates 4 processes - NOT recommended)
npm run start:nest
```

## Process Comparison

### Before (using `nest start`):
```
PID 46452  sh -c nest start
PID 46453  node ...nest start
PID 46503  sh -c node ...dist/main
PID 46504  node ...dist/main  ← Actual app
```
Total: **4 processes**

### After (using `start-backend.sh`):
```
PID 47677  node ...dist/main  ← Actual app only
```
Total: **1 process** ✅

## Troubleshooting

### Port already in use
```bash
# Force stop all backend processes
npm run stop

# Or manually kill by port
lsof -ti :3001 | xargs kill -9
```

### Multiple processes detected
```bash
# Check what's running
ps aux | grep -E "(nest|backend)" | grep -v grep

# Stop everything and restart
npm run restart
```

## Files

- `start-backend.sh` - Startup script
- `stop-backend.sh` - Shutdown script
- `.backend.pid` - Stores running process PID (auto-created)
