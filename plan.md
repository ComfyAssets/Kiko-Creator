# Kiko Creator - Project Plan

## Project Overview
Kiko Creator is a modern React-based web application for AI image generation with character selection and ComfyUI API integration. Inspired by the Electron-based reference app `character_select_stand_alone_app`, reimagined as a web-first, dark-mode-only application.

## Completed Features ✅

### 1. Setup Wizard
- **Location**: `src/pages/SetupWizard.jsx`
- **Features**:
  - 4-step wizard: Welcome → ComfyUI → Models → Complete
  - ComfyUI connection testing with real API validation
  - Model path configuration for checkpoints and LoRAs
  - Settings persistence to backend
  - Model scanning and validation
  - Progress indicators and error handling

### 2. Generation Settings UI
- **Location**: `src/pages/GeneratePage.jsx`
- **Features**:
  - ✅ Prompt input with tag autocomplete integration
  - ✅ Negative prompt with tag autocomplete
  - ✅ View tags dropdowns (Angle, Camera, Background, Style)
    - "None" and "Random" options
    - Random selection picks from category on generation
    - Auto-appends to prompt
  - ✅ Model selection with SearchableModelDropdown
    - Checkpoint selection with thumbnails
    - Search functionality
    - Model grouping by type
  - ✅ LoRA slot management
    - Add/remove slots dynamically
    - Searchable LoRA dropdown with thumbnails
    - Strength slider (0.0 - 2.0)
  - ✅ Resolution preset dropdown
    - SDXL resolutions from KikoTools
    - HD Widescreen (16:9) resolutions
    - Legacy SD resolutions
    - Custom resolution support
    - Swap width/height button
  - ✅ Generation parameters
    - Steps, CFG scale
    - Sampler and scheduler selection
    - Seed with random button
    - Batch size
  - ✅ Hires Fix toggle
    - Upscale model selection
    - Scale factor (1.0 - 4.0)
    - Denoise strength
    - Additional steps
    - Random seed option
  - ✅ Refiner toggle
    - Refiner model selection
    - Add noise option
    - Refinement ratio

### 3. Backend API
- **Location**: `server/`
- **Completed Routes**:
  - ✅ `/api/setup` - Setup wizard endpoints
  - ✅ `/api/comfyui` - ComfyUI connection testing
  - ✅ `/api/models` - Model scanning and management
  - ✅ `/api/generation` - Workflow generation and submission
  - ✅ `/api/tags` - Tag autocomplete database
  - ✅ `/api/wildcards` - Wildcard management
  - ✅ `/api/view-tags` - View tags (angle, camera, background, style)

### 4. Services
- **Tag Service**: CSV-based tag database (221,787 tags from Danbooru/E621)
- **Wildcard Service**: Text file-based wildcard system
- **Workflow Builder**: ComfyUI workflow JSON generation
  - Text-to-image workflows
  - LoRA integration via prompt syntax
  - Hires Fix with upscaling
  - Refiner support
  - Validation system

### 5. Components
- ✅ `TagAutocomplete` - Intelligent tag suggestions with categories
- ✅ `WildcardMenu` - Wildcard insertion menu
- ✅ `SearchableModelDropdown` - Model selection with search and thumbnails
- ✅ Setup wizard flow with step indicators

### 6. Data Files
- ✅ `data/danbooru_e621_merged.csv` - Tag database (6MB, 221K+ tags)
- ✅ `data/view_tags.json` - View tag categories
- ✅ `data/wildcards/` - Wildcard text files (MyFurries, Poses)

## Recent Changes (This Session)

### Removed Features
- ❌ **Color Transfer** - Removed from Hires Fix (checkbox and backend logic)

### Added Features
- ✅ **Resolution System Overhaul**
  - Replaced button grid with dropdown selector
  - Integrated SDXL resolutions from KikoTools presets
  - Added 16:9 HD resolutions (720p, 900p, 1088p)
  - Organized into optgroups (SDXL Square, Landscape, Portrait, HD, SD Legacy)
  - Updated dimension inputs (step: 8, max: 8192)
  - Maintained swap functionality

- ✅ **View Tags System**
  - Backend route: `server/routes/viewTags.js`
  - 4 dropdown selectors in UI
  - Categories: angle, camera, background, style
  - "None" and "Random" options per category
  - Random selection implementation
  - Auto-append to prompt on generation

### Bug Fixes
- ✅ Fixed React error: Refiner model dropdown using objects instead of strings
  - Replaced plain `<select>` with `SearchableModelDropdown` component

## Known Issues 🐛

### 1. Magic MCP API Key
- **Issue**: Magic MCP not recognizing `TWENTYFIRST_API_KEY` environment variable
- **Status**: Environment variable is set but MCP needs configuration
- **Workaround**: Manual UI improvements as fallback
- **Backup**: `GeneratePage.jsx.backup` created before attempted Magic redesign

### 2. Server Port Conflict
- **Issue**: Port 3000 already in use (`EADDRINUSE`)
- **Impact**: Server crashes on restart
- **Status**: Nodemon waiting for file changes
- **Solution**: Kill existing process on port 3000 or change port in `.env`

## Pending Features 🚧

### High Priority
1. **Test Generation Flow** ⭐ RECOMMENDED NEXT STEP
   - Test full workflow generation
   - Verify ComfyUI API submission
   - Test progress polling
   - Validate image retrieval
   - Error handling verification

2. **UI Polish** (Manual or Magic)
   - Modern glassmorphism effects
   - Smooth animations and transitions
   - Better spacing and visual hierarchy
   - Gradient accents
   - Micro-interactions on buttons
   - Premium visual feel

### Medium Priority
3. **Character Selection System**
   - Character database integration (5328+ characters)
   - Thumbnail gallery
   - Search and filtering
   - Character metadata display
   - Character-specific prompts

4. **Generation Gallery**
   - Real-time generation preview
   - Image metadata display
   - Save/download functionality
   - Generation history
   - Image comparison

5. **Advanced Features**
   - ControlNet integration
   - IP Adapter support
   - Regional conditioning
   - Image-to-image generation
   - Inpainting/outpainting

### Low Priority
6. **Quality of Life**
   - Prompt templates/presets
   - Generation queue
   - Batch generation UI
   - Settings profiles
   - Keyboard shortcuts

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS (dark mode only)
- **Animations**: Framer Motion
- **State**: React Context API (`useSettingsStore`)
- **Routing**: React Router

### Backend Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **File Processing**: CSV parsing, JSON handling
- **API Integration**: ComfyUI REST API + WebSocket

### Data Flow
```
User Input (React Component)
  ↓
State Update (React State)
  ↓
API Request (fetch)
  ↓
Express Route Handler
  ↓
Service Layer (workflowBuilder, etc.)
  ↓
ComfyUI API Call
  ↓
WebSocket Progress Updates
  ↓
React State Update
  ↓
UI Refresh
```

### Key Files
```
kiko-creator/
├── src/
│   ├── pages/
│   │   ├── GeneratePage.jsx (MAIN UI)
│   │   ├── GeneratePage.jsx.backup (BACKUP)
│   │   └── SetupWizard.jsx
│   ├── components/
│   │   ├── TagAutocomplete.jsx
│   │   ├── WildcardMenu.jsx
│   │   └── wizard/SearchableModelDropdown.jsx
│   └── stores/
│       └── settingsStore.js
├── server/
│   ├── index.js (MAIN SERVER)
│   ├── routes/
│   │   ├── setup.js
│   │   ├── generation.js
│   │   ├── models.js
│   │   ├── tags.js
│   │   ├── wildcards.js
│   │   └── viewTags.js (NEW)
│   └── services/
│       ├── workflowBuilder.js
│       ├── tagService.js
│       └── wildcardService.js
├── data/
│   ├── danbooru_e621_merged.csv
│   ├── view_tags.json (NEW)
│   └── wildcards/
└── referance/
    └── character_select_stand_alone_app/ (REFERENCE APP)
```

## Environment Setup

### Required Environment Variables
```bash
# ComfyUI Configuration
VITE_API_URL=http://localhost:3000
COMFYUI_API_URL=http://127.0.0.1:8188

# Server Configuration
PORT=3000

# Magic MCP (Optional, not working yet)
TWENTYFIRST_API_KEY=9480bf0ea2511cad1a08e9a99a9407fc2fccbad234a15e222ef6bada1e1be0e0
```

### ComfyUI Requirements
- ComfyUI instance running on port 8188
- [ComfyUI_Mira](https://github.com/mirabarukaso/ComfyUI_Mira) v0.4.9.2+ installed
- DEV mode enabled in ComfyUI settings
- Models available in configured paths

## Development Commands

```bash
# Install dependencies
npm install

# Start development servers (both frontend and backend)
npm run dev

# Start only backend
npm run server

# Start only frontend
cd .. && npm run dev

# Build for production
npm run build
```

## Next Session Checklist

When picking up this project:

1. **Resolve Port Conflict**
   ```bash
   # Find process on port 3000
   lsof -i :3000
   # Kill it or change PORT in .env
   ```

2. **Test Generation Flow** ⭐
   - Ensure ComfyUI is running
   - Try a simple generation
   - Verify workflow submission
   - Check progress polling
   - Confirm image retrieval

3. **UI Improvements** (Choose one)
   - **Option A**: Fix Magic MCP configuration and try automated redesign
   - **Option B**: Manual improvements with glassmorphism and modern styling

4. **Character Selection** (After generation works)
   - Integrate character database
   - Build gallery component
   - Add search functionality

## Reference Patterns to Port

From `referance/character_select_stand_alone_app/`:

### Character Selection
- `scripts/renderer/customThumbGallery.js` - Gallery UX patterns
- `data/wai_characters.csv` - Character database structure
- `data/wai_character_thumbs.json` - Thumbnail data

### Tag System
- `scripts/renderer/tagAutoComplete.js` - Already adapted ✅
- Weight adjustment (Ctrl+Up/Down) - Not yet implemented

### LoRA Management
- `scripts/renderer/myLoRASlot.js` - Slot system adapted ✅
- Drag-and-drop - Not yet implemented

### Generation
- `scripts/main/generate_backend_comfyui.js` - Workflow patterns used ✅
- WebSocket progress updates - Polling implementation in place ✅

## Notes

### Design Decisions
- **Dark mode only**: No light mode toggle, optimized for dark UI
- **Web-first**: No Electron, no desktop packaging
- **Modern React**: Hooks, functional components, no class components
- **Backend proxy**: Never expose ComfyUI directly to frontend

### Important Reminders
- Always backup before major changes (like Magic MCP attempts)
- Test with real ComfyUI instance before deploying
- Validate all user inputs before sending to ComfyUI
- Handle WebSocket disconnections gracefully
- Log generation settings for debugging

### Known Limitations
- No image tagging (ONNX models - reference app feature)
- No SAAC browser mode (WebSocket service - reference app feature)
- No remote AI prompt generation (reference app feature)
- No model metadata reading from safetensors (not yet implemented)

## Success Criteria

Project will be considered "MVP Complete" when:
- ✅ Setup wizard works end-to-end
- ✅ Generation settings UI is complete
- 🚧 Full generation workflow tested and working
- 🚧 Character selection functional
- 🚧 Generation gallery displays results
- 🚧 UI is polished and modern

Current Progress: **~60% Complete**
