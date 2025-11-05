# 🎨 Kiko Creator

A modern, web-based AI image generation interface for ComfyUI with character selection, real-time progress tracking, and gallery management.

![Kiko Creator](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![ComfyUI](https://img.shields.io/badge/ComfyUI-Required-orange.svg)

## 🌟 Features

### Core Functionality

- **🎨 Real-Time Generation**: WebSocket-based progress tracking with live step updates
- **👤 Character Selection**: Browse and search 5328+ anime characters with thumbnails
- **🎯 Smart Model Management**: Auto-sync checkpoints and LoRAs from ComfyUI
- **🖼️ Gallery System**: Persistent gallery with favorites, batch operations, and metadata
- **📱 Responsive Design**: Mobile-first UI with touch-optimized controls
- **🌙 Dark Mode**: Beautiful dark theme optimized for extended use

### Character System

- **5328+ Characters**: Pre-loaded character database from WAI dataset
- **Custom Characters**: Create and manage your own custom characters with images
- **Smart Search**: Real-time search with fuzzy matching
- **Infinite Scroll**: Smooth browsing with virtual scrolling
- **Thumbnail Gallery**: Character previews with metadata
- **Right-Click Menu**: Quick actions (send to prompt, delete, edit)

### Generation Features

- **Advanced Settings**: Steps, CFG, sampler, scheduler, resolution presets
- **LoRA Management**: Drag-and-drop LoRA slots with strength controls
- **🎯 LoRA Trigger Words**: Active trigger words displayed beneath prompt as clickable tags
  - Click individual tags to add to prompt
  - "Add All" button for quick insertion
  - Automatically reads from LoRA Manager `.metadata.json` and safetensors metadata
  - Shows combined trigger words from all selected LoRAs
- **Tag Autocomplete**: Danbooru/E621 tag suggestions (ready for integration)
- **Wildcard Support**: Random prompt generation from text files
- **View Tags**: Angle, camera, background, and style tags
- **Batch Generation**: Generate multiple images at once
- **Seed Control**: Random or fixed seeds with manual override
- **Real-Time Progress**: WebSocket connection shows actual step progress

### Gallery & Organization

- **Persistent Storage**: Images saved with full metadata in localStorage
- **Grid View**: Adjustable 2-6 column layouts
- **Lightbox**: Fullscreen viewer with keyboard navigation (ESC, arrows)
- **Favorites**: Star important generations
- **Batch Operations**: Multi-select for download/delete
- **Metadata Display**: View all generation parameters

### Models Management

- **Checkpoint Browser**: View all available checkpoints with thumbnails
- **LoRA Browser**: Browse LoRA library with metadata
- **CivitAI Integration**: 🌐 Globe links to CivitAI model pages (uses LoRA Manager metadata)
- **🔄 Model Re-scanning**: One-click re-scan to discover new models and update metadata
  - Professional modal UI with loading/success/error states
  - Shows detailed statistics (checkpoints, LoRAs, embeddings, cached count, duration)
  - Automatically reloads trigger words and metadata after scan
  - Preserves previous scan settings (YAML path, CivitAI integration)
- **Quick Send**: One-click send models to generation page
- **Folder Organization**: Models grouped by directory structure
- **Auto-Sync**: Real-time model list from ComfyUI API
- **Extra Model Paths**: Automatically discovers models from `extra_model_paths.yaml`
- **Database Management**: Vacuum, optimize, and backup database operations

## 📋 Prerequisites

### Required

- **Node.js** 18+ (with npm)
- **ComfyUI** with [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) v0.4.9.2+
- **Python** 3.10+ (for ComfyUI)

### Optional (Recommended)

- **Python 3.8+** (for enhanced safetensors metadata reading - see [Python Helper Setup](#-python-helper-setup-optional-but-recommended))
- **[ComfyUI-Lora-Manager](https://github.com/willmiao/ComfyUI-Lora-Manager)** by willmiao (for CivitAI metadata and 🌐 globe links)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone git clone https://github.com/yourusername/kiko-creator.git
cd kiko-creator
```

### 2. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Configure Environment

Create a `.env` file in the root directory:

```env
# Frontend Environment Variables
VITE_API_URL=http://localhost:3001

# ComfyUI API URL
# For local ComfyUI:
VITE_COMFYUI_URL=http://127.0.0.1:8188

# For remote ComfyUI with HTTPS:
# VITE_COMFYUI_URL=https://your-comfyui-server.com
```

Create a `server/.env` file:

```env
# Backend Environment Variables
PORT=3001
COMFYUI_API_URL=http://127.0.0.1:8188

# Optional: For CivitAI metadata and extra model paths support
# Requires ComfyUI-LoRA-Manager for enhanced metadata extraction
COMFYUI_MODELS_PATH=/path/to/ComfyUI/models
COMFYUI_DIR=/path/to/ComfyUI
```

### 4. Start the Application

```bash
# Development mode (frontend only - backend runs separately)
npm run dev

# In another terminal, start the backend:
cd server
npm run dev

# Or use convenience scripts:
./start.sh     # Start both servers in background
./status.sh    # Check server status
./stop.sh      # Stop all servers
```

### 5. Access the Application

Open your browser to `http://localhost:5173`

## 🔧 ComfyUI Setup

### Required Custom Nodes

1. **ComfyUI_Mira** (v0.4.9.2 or higher)

   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/mirabarukaso/ComfyUI_Mira.git
   ```

2. **Install Dependencies**

   ```bash
   cd ComfyUI_Mira
   pip install -r requirements.txt
   ```

3. **Enable DEV Mode** in ComfyUI settings

### Optional: CivitAI Metadata Support

For enhanced CivitAI integration with 🌐 globe links to model pages:

1. **Install ComfyUI-LoRA-Manager** (recommended)

   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/willmiao/ComfyUI-Lora-Manager.git
   ```

2. **How it works**:
   - Kiko Creator reads metadata from LoRA Manager's `.metadata.json` files
   - When you download models via LoRA Manager, it stores CivitAI model IDs
   - Globe icons (🌐) appear next to models with CivitAI metadata
   - Click the globe to view model details on CivitAI

3. **Configuration**:
   - Set `COMFYUI_MODELS_PATH` in `server/.env` to enable metadata reading
   - Set `COMFYUI_DIR` to parse ComfyUI's `extra_model_paths.yaml`
   - Works for checkpoints, LoRAs, and embeddings

### Workflow Configuration

Kiko Creator generates ComfyUI workflows programmatically. The workflow builder supports:

- **Text-to-Image**: Standard SD/SDXL generation
- **LoRA Integration**: Multi-LoRA support with strength controls
- **Hires Fix**: Upscaling with customizable denoise
- **Refiner Support**: SDXL refiner integration
- **Custom Resolutions**: SDXL presets and custom sizes

The workflow is built in `server/services/workflowBuilder.js` and follows ComfyUI_Mira's node structure.

### Example Workflow Nodes

The generated workflow includes these key nodes:

- `KikoPromptNode`: Prompt processing with character injection
- `CheckpointLoaderSimple`: Model loading
- `LoraLoader`: LoRA application (multiple chained)
- `KSampler`: Generation with progress tracking
- `VAEDecode`: Latent to image conversion
- `SaveImage`: Output with metadata

## 🌐 Remote ComfyUI Setup

### WebSocket Requirements

**Important**: If you're running ComfyUI on a remote server and need WebSocket support for real-time progress tracking, the WebSocket connection must originate from localhost due to browser security policies.

### Option 1: Using socat (Linux/Mac)

Create a local proxy that forwards WebSocket connections to your remote ComfyUI:

```bash
# Install socat
sudo apt-get install socat  # Ubuntu/Debian
brew install socat          # macOS

# Create WebSocket proxy (replace with your remote IP/domain)
socat TCP-LISTEN:8188,bind=127.0.0.1,fork TCP:10.0.140.30:8188

# Or for a remote domain:
socat TCP-LISTEN:8188,bind=127.0.0.1,fork TCP:comfy.yourdomain.com:443
```

This creates a local proxy at `127.0.0.1:8188` that forwards all traffic to your remote ComfyUI server.

Then configure your `.env`:

```env
VITE_COMFYUI_URL=http://127.0.0.1:8188
```

### Option 2: Using SSH Tunnel

```bash
# Forward remote ComfyUI to localhost
ssh -L 8188:localhost:8188 user@remote-comfyui-server

# Keep this terminal open while using Kiko Creator
```

Then configure your `.env`:

```env
VITE_COMFYUI_URL=http://127.0.0.1:8188
```

### Option 3: Nginx Reverse Proxy with SSL

If you control the remote server, set up Nginx to handle both HTTP and WebSocket with SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name comfy.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8188;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings for long-running generations
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

Then configure your `.env`:

```env
VITE_COMFYUI_URL=https://comfy.yourdomain.com
```

### Why is this needed?

Modern browsers enforce **Mixed Content Policy** and **Content Security Policy (CSP)**:

- If your app is served over `http://`, WebSocket connections must use `ws://`
- If your app is served over `https://`, WebSocket connections must use `wss://`
- The WebSocket connection must be to an allowed origin in the CSP

By proxying through localhost or using proper SSL, you ensure the WebSocket connection meets these security requirements.

## 🐍 Python Helper Setup (Optional but Recommended)

Kiko Creator includes an optional Python helper for robust safetensors metadata reading. The app **works perfectly without Python** using a JavaScript fallback, but the Python helper provides better compatibility with large model files and edge cases.

### Why Use Python Helper?

**With Python Helper:**

- ✅ Uses the official `safetensors` library (same as ComfyUI)
- ✅ Handles all format variations and edge cases automatically
- ✅ Efficient reading of 7GB+ model files
- ✅ Future-proof with library updates

**Without Python Helper (JavaScript Fallback):**

- ✅ Still fully functional - no Python required!
- ✅ Works for 99% of model files
- ✅ 700,000x faster than old code (reads only 10KB vs entire file)
- ⚠️ Manual format parsing (may miss rare edge cases)

### Installation

#### Option 1: Virtual Environment (Recommended)

```bash
# Navigate to project root
cd kiko-creator

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate    # Linux/Mac
# OR
venv\Scripts\activate       # Windows

# Install Python dependencies
pip install -r requirements.txt
```

#### Option 2: Global Installation

```bash
# Install directly (not recommended for production)
pip install -r requirements.txt
```

### Verifying Setup

After installation, restart the server and check the logs:

```bash
npm run dev:all
```

Look for one of these messages in the terminal:

- ✅ `[Safetensors] Using Python helper at /path/to/python` - Python helper active!
- ⚠️ `[Safetensors] Python not found, using JavaScript fallback` - JS fallback mode (still works!)
- ⚠️ `[Safetensors] Python found but safetensors library not installed` - Need to run `pip install`

### What Gets Improved?

The Python helper enhances:

- **LoRA Metadata Reading**: Trigger words, base model info, descriptions
- **CivitAI Integration**: Model/version IDs for 🌐 globe links
- **Large Model Support**: Reads 7GB+ files without memory issues
- **Edge Case Handling**: Unusual format variations handled automatically

### Deactivating Virtual Environment

When you're done working with the project:

```bash
# Deactivate virtual environment
deactivate
```

Next time you work on the project, remember to activate the venv again:

```bash
source venv/bin/activate  # or venv\Scripts\activate on Windows
```

### More Information

For detailed troubleshooting and testing instructions, see [PYTHON_SETUP.md](PYTHON_SETUP.md).

## 📁 Project Structure

```
kiko-creator/
├── src/                          # Frontend source
│   ├── components/
│   │   ├── layout/              # Layout components
│   │   ├── wizard/              # Setup wizard
│   │   ├── ImageLightbox.jsx    # Image viewer
│   │   ├── TagAutocomplete.jsx  # Tag suggestions
│   │   └── WildcardMenu.jsx     # Wildcard selector
│   ├── pages/
│   │   ├── CharactersPage.jsx   # Character browser
│   │   ├── GeneratePage.jsx     # Main generation UI
│   │   ├── GalleryPage.jsx      # Image gallery
│   │   ├── ModelsPage.jsx       # Model management
│   │   └── SettingsPage.jsx     # App settings
│   ├── stores/
│   │   ├── settingsStore.js     # App configuration
│   │   ├── generationStore.js   # Generation state
│   │   ├── charactersStore.js   # Character data
│   │   └── galleryStore.js      # Gallery persistence
│   └── styles/
│       └── index.css            # Global styles & Tailwind
├── server/                       # Backend API
│   ├── routes/
│   │   ├── setup.js             # Setup endpoints
│   │   ├── generation.js        # Generation API
│   │   ├── comfyui.js          # ComfyUI proxy
│   │   ├── characters.js        # Character data
│   │   └── models.js            # Model scanning
│   ├── services/
│   │   └── workflowBuilder.js   # ComfyUI workflow generation
│   ├── utils/
│   │   ├── safetensors.js       # Safetensors metadata (hybrid JS/Python)
│   │   ├── safetensors_reader.py # Python safetensors helper
│   │   └── python_bridge.js     # Node.js ↔ Python bridge
│   └── index.js                 # Express server
├── data/                         # Data files (git-ignored)
│   ├── wai_characters.csv       # Character database
│   ├── wai_character_thumbs.json # Character thumbnails
│   └── danbooru_e621_merged.csv # Tag autocomplete
├── venv/                         # Python virtual environment (optional)
├── requirements.txt              # Python dependencies
├── PYTHON_SETUP.md              # Python helper documentation
└── referance/                    # Reference application
    └── character_select_stand_alone_app/
```

## 🎯 Usage

### First-Time Setup

1. **Launch the App**: Navigate to `http://localhost:5173`
2. **Setup Wizard**: Configure ComfyUI connection and scan models
3. **Verify Connection**: Green indicator shows ComfyUI is connected

### Generating Images

1. **Select Character** (optional): Browse characters page and click to send to prompt
2. **Configure Settings**:
   - Choose checkpoint model from dropdown (synced from ComfyUI)
   - Adjust steps, CFG, sampler
   - Select resolution preset
   - Add LoRAs if desired
3. **Enter Prompts**: Common prompt + character-specific prompt
4. **Generate**: Click generate and watch **real-time progress**
   - Progress bar shows actual steps (e.g., "15/20 - 75%")
   - WebSocket provides instant updates
5. **View Results**: Images appear in preview and are saved to gallery

### Managing Gallery

- **View All Images**: Navigate to Gallery page
- **Adjust Grid**: Use slider for 2-6 column layouts
- **Filter Favorites**: Click "⭐ Favorites" to show starred images
- **Batch Operations**: Enable selection mode for multi-delete/download
- **Lightbox**: Click any image for fullscreen view
  - Press `ESC` to close
  - Use arrow keys to navigate
  - View full metadata

### Model Management

- **Browse Models**: Navigate to Models page
- **Switch Tabs**: Toggle between Checkpoints and LoRAs
- **Search**: Filter by name or folder
- **Send to Generation**: Click "➤ Generate" on any model card
- **CivitAI Links**: Click 🌐 globe icon to view model details on CivitAI (requires LoRA Manager)
- **View Details**: Click "ℹ️ Info" for CivitAI metadata (when available)
- **Auto-Refresh**: Models sync automatically from ComfyUI on page load
- **Dropdowns**: Globe icons also appear in model/LoRA/embedding selection dropdowns for quick access

### Using LoRA Trigger Words

1. **Select a LoRA**: Add any LoRA to a slot in the generation page
2. **Trigger Words Appear**: Tags automatically display beneath the positive prompt
3. **Click to Add**: Click individual trigger word tags to add them to your prompt
4. **Add All**: Use the "Add All" button to insert all trigger words at once
5. **Multiple LoRAs**: Trigger words from all selected LoRAs are combined and deduplicated

**Note**: Trigger words are automatically extracted from:

- LoRA Manager `.metadata.json` files (if installed)
- Safetensors metadata embedded in model files
- CivitAI metadata (if previously scanned with API key)

### Re-scanning Models

When you add new models to ComfyUI or update existing ones:

1. **Navigate to Settings**: Go to Settings page
2. **Find Model Management**: Scroll to the "Model Management" section
3. **Click Re-scan**: Press the "Re-scan Models" button
4. **Watch Progress**: A modal shows the scanning progress with a spinner
5. **View Results**: When complete, see statistics:
   - Checkpoints discovered
   - LoRAs discovered (with trigger words)
   - Embeddings discovered
   - Cached vs new models
   - Scan duration
6. **Automatic Reload**: Models and trigger words update automatically after scan

## 🙏 Credits & Acknowledgments

### Reference Application

Kiko Creator is inspired by and builds upon concepts from:

**[Character Select Stand Alone App](https://github.com/mirabarukaso/character_select_stand_alone_app)** by [@mirabarukaso](https://github.com/mirabarukaso)

This reference application provided invaluable patterns and concepts:

- Character database structure and selection system
- Tag autocomplete mechanism from Danbooru/E621
- LoRA slot management patterns
- ComfyUI workflow generation logic
- CSV data file formats and processing

### CivitAI Integration

**[ComfyUI-Lora-Manager](https://github.com/willmiao/ComfyUI-Lora-Manager)** by willmiao

Kiko Creator reads CivitAI metadata from LoRA Manager's `.metadata.json` files to provide:

- Direct links to model pages on CivitAI
- Model version information
- Seamless integration with CivitAI's download workflow

### Key Differences

While inspired by the reference app, Kiko Creator is a complete reimplementation with significant architectural changes:

#### Architecture

- **Web-First**: React SPA instead of Electron desktop app
- **Modern Stack**: React + Express instead of vanilla JS + Electron IPC
- **No Bundling**: Vite HMR instead of Electron build process

#### Features

- **Real-Time Updates**: WebSocket progress instead of HTTP polling
- **Persistent Gallery**: localStorage with full metadata instead of temp preview
- **Responsive Design**: Mobile-optimized UI with touch support
- **Model Browser**: Visual model management vs filesystem scanning only
- **Dark Mode Only**: Optimized single-theme design
- **Auto-Sync**: Models sync from ComfyUI API vs manual file scanning

#### Technical Implementation

- **State Management**: Zustand with persist vs vanilla state
- **API Layer**: REST + WebSocket vs Electron IPC
- **Component System**: React hooks vs vanilla DOM manipulation
- **Styling**: Tailwind CSS + Framer Motion vs custom CSS

### Data Sources

- **Character Database**: WAI Characters dataset (5328+ characters)
- **Tag Database**: Danbooru/E621 merged tag collection
- **Character Thumbnails**: Curated thumbnail collection from reference app

### Technologies

#### Frontend

- **React** 18.3 - UI framework with hooks
- **Vite** 5.x - Build tool and dev server
- **Tailwind CSS** 3.x - Utility-first CSS
- **Framer Motion** - Animation library
- **Zustand** - Lightweight state management
- **React Router** 6.x - Client-side routing

#### Backend

- **Node.js** 18+ - JavaScript runtime
- **Express** 4.x - Web server framework
- **Axios** - HTTP client for ComfyUI API
- **YAML** - Configuration file parsing

#### Integration

- **ComfyUI** - Stable Diffusion backend
- **ComfyUI_Mira** - Essential extension for workflow support
- **WebSocket** - Real-time progress tracking

## 🐛 Known Issues & Limitations

### Current Limitations

- Tag autocomplete requires CSV data files (auto-download planned)
- CivitAI metadata requires ComfyUI-LoRA-Manager to be installed (see [Setup](#optional-civitai-metadata-support))
- WebSocket requires proxy for remote ComfyUI without HTTPS (see [Remote Setup](#-remote-comfyui-setup))
- Gallery stored in browser localStorage (limited to ~10MB)

### Workarounds

- **Remote WebSocket**: Use socat or SSH tunnel (documented above)
- **Storage Limits**: Clear old images when approaching browser limits
- **Model Sync**: Refresh Models page if new models don't appear

## 🚧 Roadmap

### Completed ✅

- [x] Setup wizard with ComfyUI validation
- [x] Character selection with 5328+ characters
- [x] Custom character creation
- [x] Real-time generation with WebSocket progress
- [x] Persistent gallery with metadata
- [x] Model management (checkpoints + LoRAs)
- [x] LoRA slot system
- [x] **LoRA trigger words display** - Clickable tags beneath prompt with "Add All" button
- [x] **Model re-scanning** - One-click re-scan with professional modal UI
- [x] **LoRA Manager integration** - Reads trigger words from `.metadata.json` files
- [x] **Metadata preservation** - ComfyUI sync preserves database metadata
- [x] Mobile-responsive design
- [x] Batch operations
- [x] Favorites system
- [x] CivitAI metadata integration with 🌐 globe links
- [x] Extra model paths support (parses `extra_model_paths.yaml`)
- [x] Embeddings browser with recursive directory scanning
- [x] Database maintenance tools (vacuum, optimize, backup)

### In Progress 🚧

- [ ] Tag autocomplete with weight adjustment
- [ ] Wildcard browser and editor

### Planned 📋

- [ ] Image-to-Image support
- [ ] ControlNet integration
- [ ] Prompt templates and presets
- [ ] Batch character generation
- [ ] Export/import settings
- [ ] Generation history timeline
- [ ] Image comparison tools
- [ ] Multi-language support

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Test on both desktop and mobile
- Update documentation as needed

## 📧 Support

For issues and questions:

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/yourusername/kiko-creator/issues)
- **Documentation**: Check this README and inline code comments
- **Reference App**: Check the [Character Select Stand Alone App](https://github.com/mirabarukaso/character_select_stand_alone_app) for original patterns

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🌟 Show Your Support

If you find this project useful:

- ⭐ Star the repository
- 🐛 Report bugs and suggest features
- 📢 Share with the ComfyUI community
- 🤝 Contribute improvements

---

**Made with ❤️ for the ComfyUI community**

_Inspired by and grateful to the [Character Select Stand Alone App](https://github.com/mirabarukaso/character_select_stand_alone_app) team for their excellent reference implementation._

---

## 🔗 Quick Links

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - Main SD backend
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) - Required extension
- [ComfyUI-Lora-Manager](https://github.com/willmiao/ComfyUI-Lora-Manager) - LoRA metadata provider by willmiao
- [Character Select App](https://github.com/mirabarukaso/character_select_stand_alone_app) - Reference implementation
- [Tailwind CSS](https://tailwindcss.com) - CSS framework
- [React](https://react.dev) - UI library
