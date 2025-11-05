# 🚀 Quick Start Guide

Get Kiko Creator running in 5 minutes!

---

## ✅ Prerequisites Check

Before starting, ensure you have:
- [ ] Node.js 20.x or higher installed
- [ ] ComfyUI running at `http://127.0.0.1:8188`
- [ ] ComfyUI_Mira extension installed (v0.4.9.2+)
- [ ] Terminal/Command Prompt open

---

## 📦 Installation (One-Time Setup)

### Step 1: Install Dependencies

```bash
# In the project root directory
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

---

## ⚙️ Configuration

### Step 2: Setup Environment Variables

**For Local Access Only** (same computer):
```bash
# Copy environment templates
cp .env.example .env
cp server/.env.example server/.env

# Edit server/.env to set ComfyUI URL (if different from default)
nano server/.env  # or use your favorite editor
```

**For Network Access** (access from phone/tablet/other devices):

1. **Find your local IP**:
   ```bash
   # Linux/Mac
   ip addr show | grep "inet " | grep -v 127.0.0.1
   # or
   hostname -I | awk '{print $1}'

   # Example output: 192.168.1.100
   ```

2. **Update `.env`** in project root:
   ```env
   VITE_API_URL=http://192.168.1.100:3000
   ```
   *(Replace 192.168.1.100 with your actual IP)*

3. **Update `server/.env`**:
   ```env
   COMFYUI_API_URL=http://127.0.0.1:8188
   PORT=3000
   NODE_ENV=development
   ```

---

## 🎬 Start the Application

### Step 3: Launch Both Servers

**Option A: One Command (Recommended)**
```bash
npm run dev:all
```

**Option B: Separate Terminals**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
npm run server
```

### Step 4: Verify Servers Started

You should see:

**Backend Output**:
```
🚀 Kiko Creator API Server Started!

   Local:    http://localhost:3000
   Network:  http://192.168.1.100:3000

📡 ComfyUI API URL: http://127.0.0.1:8188

✨ Server is accessible from other devices on your network!
```

**Frontend Output**:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
```

---

## 🌐 Access the Application

### On the Same Computer:
```
http://localhost:5173
```

### From Another Device (phone/tablet):
```
http://192.168.1.100:5173
```
*(Replace with your actual IP from Step 2)*

---

## 🎯 First-Time Setup Wizard

When you first open the app, you'll see a 3-step setup wizard:

### **Step 1: Connect to ComfyUI**
1. Enter ComfyUI API URL: `http://127.0.0.1:8188`
2. Click "Test Connection"
3. Wait for green checkmark ✅
4. Click "Continue to Model Discovery →"

### **Step 2: Discover Models**
1. Enter YAML path: `/home/vito/ai-apps/ComfyUI/extra_model_paths.yaml`
   *(Adjust if your ComfyUI is in a different location)*
2. Click "Scan for Models"
3. Review discovered checkpoints, LoRAs, embeddings
4. Click "Continue to Configuration →"

### **Step 3: Configure Defaults**
1. Select default checkpoint from dropdown
2. Adjust generation settings:
   - Steps: 20 (default)
   - CFG Scale: 7 (default)
   - Sampler: euler_ancestral (default)
   - Scheduler: normal (default)
   - Resolution: 512x512 (default)
3. Click "Complete Setup ✓"

**You're done!** 🎉

---

## 🛠️ Common Issues

### ❌ "Cannot GET /"

**Cause**: Backend not running or CORS issue

**Fix**:
```bash
# Stop any running servers (Ctrl+C)
# Restart with:
npm run dev:all
```

### ❌ "Connection Failed" in Setup Wizard

**Cause**: ComfyUI not running or wrong URL

**Fix**:
1. Start ComfyUI: `python main.py` (in ComfyUI directory)
2. Verify it's accessible: Open `http://127.0.0.1:8188` in browser
3. Retry connection test in wizard

### ❌ "Failed to discover models"

**Cause**: Wrong YAML path or file permissions

**Fix**:
1. Verify YAML file exists:
   ```bash
   ls /home/vito/ai-apps/ComfyUI/extra_model_paths.yaml
   ```
2. Check file permissions:
   ```bash
   chmod 644 /home/vito/ai-apps/ComfyUI/extra_model_paths.yaml
   ```
3. Try full absolute path (no ~)

### ❌ Can't access from phone/tablet

**Cause**: Firewall or wrong IP

**Fix**:
1. Verify same WiFi network
2. Check firewall (see [Network Access Guide](NETWORK_ACCESS.md))
3. Ping test from other device:
   ```bash
   ping 192.168.1.100
   ```

---

## 🔄 Stopping the Application

Press `Ctrl+C` in the terminal running the servers.

---

## 🔄 Restarting After First Setup

Next time you want to use Kiko Creator:

```bash
# Just start the servers (no setup wizard needed)
npm run dev:all
```

Setup wizard only runs on first launch. Your settings are saved!

---

## 📚 Next Steps

- **Character Selection** - Coming soon in Phase 1
- **Prompt Builder** - Coming soon in Phase 1
- **Generation Gallery** - Coming soon in Phase 1

---

## 💡 Pro Tips

1. **Bookmark the URL**: Add `http://YOUR_IP:5173` to your phone's home screen
2. **Keep terminals open**: Don't close the terminal windows while using the app
3. **Check logs**: Backend terminal shows API requests and errors
4. **Browser DevTools**: Press F12 to see frontend errors

---

## 📞 Getting Help

If you're still stuck:

1. Check backend terminal for errors
2. Check browser console (F12 → Console)
3. Verify ComfyUI is running: `http://127.0.0.1:8188`
4. Test backend health: `http://localhost:3000/health`
5. See [Network Access Guide](NETWORK_ACCESS.md) for detailed troubleshooting

---

**Congratulations! You're ready to create amazing AI art with Kiko Creator! 🎨✨**
