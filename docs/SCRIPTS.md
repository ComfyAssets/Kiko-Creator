# 🛠️ Kiko Creator Scripts Guide

Convenient shell scripts for managing the Kiko Creator application.

---

## 📋 Available Scripts

### **./start.sh** - Start Application
Starts both frontend and backend servers in the background.

**Features**:
- ✅ Checks dependencies and installs if needed
- ✅ Creates `.env` files from templates if missing
- ✅ Runs in background (daemon mode)
- ✅ Creates log file: `kiko-creator.log`
- ✅ Saves process ID to `.kiko-creator.pid`
- ✅ Shows network access URLs

**Usage**:
```bash
./start.sh
```

**Output**:
```
🚀 Starting Kiko Creator...
🎨 Starting servers...

✅ Kiko Creator started successfully!

   Process ID: 12345
   Log file: kiko-creator.log

🌐 Access URLs:
   Local:   http://localhost:5173
   Network: http://10.0.140.30:5173

📝 View logs: tail -f kiko-creator.log
🛑 Stop server: ./stop.sh
```

---

### **./stop.sh** - Stop Application
Stops the running Kiko Creator instance gracefully.

**Features**:
- ✅ Reads PID from `.kiko-creator.pid`
- ✅ Graceful shutdown (SIGTERM)
- ✅ Force kill after 10 seconds if needed (SIGKILL)
- ✅ Cleans up PID file
- ✅ Searches for processes if PID file missing

**Usage**:
```bash
./stop.sh
```

**Output**:
```
🛑 Stopping Kiko Creator...
Stopping process 12345...
✅ Kiko Creator stopped successfully
```

---

### **./restart.sh** - Restart Application
Stops and then starts the application.

**Usage**:
```bash
./restart.sh
```

**Output**:
```
🔄 Restarting Kiko Creator...
🛑 Stopping Kiko Creator...
✅ Kiko Creator stopped successfully
🚀 Starting Kiko Creator...
✅ Kiko Creator started successfully!
```

---

### **./status.sh** - Check Status
Shows detailed status of the running application.

**Features**:
- ✅ Process status (running/stopped)
- ✅ Process ID and resource usage
- ✅ Network port status (3000, 5173)
- ✅ Recent log entries (last 10 lines)

**Usage**:
```bash
./status.sh
```

**Output**:
```
📊 Kiko Creator Status
=======================
Status: ✅ Running
PID: 12345

Process Info:
  PID   PPID  %CPU %MEM     ELAPSED CMD
12345  1234   5.2  2.1       00:15:30 npm run dev:all

Network Status:
Port 3000 (Backend):
  tcp   LISTEN   0   511   0.0.0.0:3000   0.0.0.0:*
Port 5173 (Frontend):
  tcp   LISTEN   0   511   0.0.0.0:5173   0.0.0.0:*

Recent Logs (last 10 lines):
[2024-01-15T10:30:00] GET /api/setup/test-connection
[2024-01-15T10:30:01] POST /api/setup/discover-models
...
```

---

## 🔧 Advanced Usage

### View Live Logs
```bash
# Follow logs in real-time
tail -f kiko-creator.log

# View last 50 lines
tail -n 50 kiko-creator.log

# Search logs for errors
grep ERROR kiko-creator.log
```

### Background vs Foreground

**Background Mode** (using scripts):
- ✅ Runs as daemon
- ✅ Survives terminal closure
- ✅ Logs to file
- ✅ Easy start/stop management

**Foreground Mode** (using npm):
```bash
npm run dev:all  # Runs in terminal, stops when you close it
```

### Multiple Instances
Scripts prevent running multiple instances:
```bash
./start.sh
# Output: ⚠️  Kiko Creator is already running (PID: 12345)
```

To start a new instance:
```bash
./stop.sh   # Stop first
./start.sh  # Then start new
```

---

## 🐛 Troubleshooting

### Script Won't Execute
**Error**: `Permission denied`

**Solution**:
```bash
chmod +x *.sh
```

### Can't Stop Application
**Error**: Process won't stop

**Solution**:
```bash
# Find process manually
ps aux | grep "vite\|nodemon"

# Kill by PID
kill -9 <PID>

# Or kill all
pkill -f "vite"
pkill -f "nodemon"

# Clean up PID file
rm .kiko-creator.pid
```

### Logs Not Showing
**Issue**: `kiko-creator.log` is empty

**Solution**:
1. Check if servers started:
   ```bash
   ./status.sh
   ```

2. Check for errors in log:
   ```bash
   cat kiko-creator.log
   ```

3. Try foreground mode to see errors:
   ```bash
   npm run dev:all
   ```

### Stale PID File
**Issue**: Script says running but application isn't

**Solution**:
```bash
# Check status
./status.sh

# Will automatically clean stale PID
# Then start again
./start.sh
```

---

## 📝 Log File Management

### Location
- **File**: `kiko-creator.log`
- **Format**: Combined stdout and stderr

### Rotation
Logs append indefinitely. To rotate:

**Manual Rotation**:
```bash
# Backup old log
mv kiko-creator.log kiko-creator.log.$(date +%Y%m%d)

# Or clear log
> kiko-creator.log
```

**Automatic Rotation** (using logrotate):
```bash
# Create /etc/logrotate.d/kiko-creator
/home/vito/ai-apps/kiko-creator/kiko-creator.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
}
```

---

## 🔐 Production Considerations

### systemd Service (Linux)

For production deployment, create a systemd service:

**File**: `/etc/systemd/system/kiko-creator.service`
```ini
[Unit]
Description=Kiko Creator
After=network.target

[Service]
Type=simple
User=vito
WorkingDirectory=/home/vito/ai-apps/kiko-creator
ExecStart=/usr/bin/npm run dev:all
Restart=on-failure
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

**Commands**:
```bash
# Enable service
sudo systemctl enable kiko-creator

# Start service
sudo systemctl start kiko-creator

# Check status
sudo systemctl status kiko-creator

# View logs
sudo journalctl -u kiko-creator -f
```

### Docker Alternative
For containerized deployment, use Docker instead of these scripts.

---

## 🎯 Quick Reference

| Task | Command | Output Location |
|------|---------|----------------|
| Start | `./start.sh` | Background |
| Stop | `./stop.sh` | - |
| Restart | `./restart.sh` | Background |
| Status | `./status.sh` | Terminal |
| Logs | `tail -f kiko-creator.log` | Terminal |
| Foreground | `npm run dev:all` | Terminal |

---

## 💡 Best Practices

1. **Use start.sh for daily development**: Keeps terminal clean
2. **Check status before operations**: Avoid conflicts
3. **Monitor logs regularly**: Catch issues early
4. **Restart after updates**: Ensure changes take effect
5. **Stop cleanly**: Use stop.sh, not kill -9
6. **Rotate logs weekly**: Prevent disk space issues

---

## 🚀 Automation Examples

### Auto-start on Boot (cron)
```bash
# Edit crontab
crontab -e

# Add line:
@reboot cd /home/vito/ai-apps/kiko-creator && ./start.sh
```

### Watchdog Script
Keep Kiko Creator running even if it crashes:

**File**: `watchdog.sh`
```bash
#!/bin/bash
while true; do
    if ! ./status.sh | grep -q "Running"; then
        echo "$(date): Kiko Creator crashed, restarting..."
        ./start.sh
    fi
    sleep 60
done
```

---

**Scripts make managing Kiko Creator easy! Start coding, not managing servers! 🎨**
