import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '../stores/settingsStore'
import { useGenerationStore } from '../stores/generationStore'
import { useGalleryStore } from '../stores/galleryStore'
import SearchableModelDropdown from '../components/wizard/SearchableModelDropdown'
import TagAutocomplete from '../components/TagAutocomplete'
import WildcardMenu from '../components/WildcardMenu'
import EmbeddingsMenu from '../components/EmbeddingsMenu'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function GeneratePage() {
  const {
    models,
    defaults,
    comfyui,
    setCheckpoints,
    favoriteCheckpoints,
    toggleFavoriteCheckpoint,
  } = useSettingsStore();
  const { prompt, negativePrompt, setPrompt, setNegativePrompt } =
    useGenerationStore();
  const { addImage } = useGalleryStore();

  // Quality tags state (prepended to positive prompt)
  const [qualityTags, setQualityTags] = useState(
    "masterpiece, best quality, ultra-detailed, 8k resolution, high dynamic range, absurdres, stunningly beautiful, intricate details, sharp focus, detailed eyes, cinematic color grading, high-resolution texture, "
  );

  // Lightbox state for current preview
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Generation settings state
  const [settings, setSettings] = useState({
    checkpoint: defaults.checkpoint || "",
    steps: defaults.steps || 20,
    cfg: defaults.cfg || 7,
    sampler: defaults.sampler || "euler_ancestral",
    scheduler: defaults.scheduler || "normal",
    width: defaults.width || 512,
    height: defaults.height || 512,
    seed: -1,
    randomSeed: true,
    batchSize: 1,
    // Hires Fix settings
    hiresFix: {
      enabled: false,
      model: "4x-UltraSharp",
      scale: 2.0,
      denoise: 0.5,
      steps: 20,
      randomSeed: false,
    },
    // Refiner settings
    refiner: {
      enabled: false,
      model: "",
      addNoise: false,
      ratio: 0.8,
    },
  });

  // LoRA slots state
  const [loraSlots, setLoraSlots] = useState([]);

  // View tags state
  const [viewTags, setViewTags] = useState({
    angle: [],
    camera: [],
    background: [],
    style: [],
  });
  const [viewSelections, setViewSelections] = useState({
    angle: "none",
    camera: "none",
    background: "none",
    style: "none",
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [generationError, setGenerationError] = useState(null);
  const [progressDetails, setProgressDetails] = useState({
    current: 0,
    max: 0,
  }); // Current step / Max steps
  const wsRef = useRef(null); // WebSocket reference
  const resultsRef = useRef(null); // Results section reference for auto-scroll
  const processedPromptIds = useRef(new Set()); // Track processed prompt IDs to prevent duplicates

  const samplers = [
    "euler",
    "euler_ancestral",
    "heun",
    "dpm_2",
    "dpm_2_ancestral",
    "lms",
    "dpm_fast",
    "dpm_adaptive",
    "dpmpp_2s_ancestral",
    "dpmpp_sde",
    "dpmpp_2m",
    "ddim",
    "uni_pc",
  ];

  const schedulers = ["normal", "karras", "exponential", "simple"];

  // SDXL and additional resolutions from KikoTools
  const resolutions = [
    // SDXL Square
    {
      label: "1024×1024 - 1:1 (SDXL)",
      width: 1024,
      height: 1024,
      category: "SDXL Square",
    },

    // SDXL Landscape
    {
      label: "1152×896 - 9:7 (SDXL)",
      width: 1152,
      height: 896,
      category: "SDXL Landscape",
    },
    {
      label: "1216×832 - 19:13 (SDXL)",
      width: 1216,
      height: 832,
      category: "SDXL Landscape",
    },
    {
      label: "1344×768 - 7:4 (SDXL Wide)",
      width: 1344,
      height: 768,
      category: "SDXL Landscape",
    },
    {
      label: "1536×640 - 12:5 (SDXL Ultra-Wide)",
      width: 1536,
      height: 640,
      category: "SDXL Landscape",
    },
    {
      label: "1024×960 - 16:15 (SDXL)",
      width: 1024,
      height: 960,
      category: "SDXL Landscape",
    },
    {
      label: "1728×576 - 3:1 (SDXL Panoramic)",
      width: 1728,
      height: 576,
      category: "SDXL Landscape",
    },

    // SDXL Portrait
    {
      label: "896×1152 - 7:9 (SDXL)",
      width: 896,
      height: 1152,
      category: "SDXL Portrait",
    },
    {
      label: "832×1216 - 13:19 (SDXL)",
      width: 832,
      height: 1216,
      category: "SDXL Portrait",
    },
    {
      label: "768×1344 - 4:7 (SDXL Tall)",
      width: 768,
      height: 1344,
      category: "SDXL Portrait",
    },
    {
      label: "640×1536 - 5:12 (SDXL Ultra-Tall)",
      width: 640,
      height: 1536,
      category: "SDXL Portrait",
    },
    {
      label: "960×1024 - 15:16 (SDXL)",
      width: 960,
      height: 1024,
      category: "SDXL Portrait",
    },
    {
      label: "704×1408 - 1:2 (SDXL)",
      width: 704,
      height: 1408,
      category: "SDXL Portrait",
    },

    // 16:9 Widescreen HD
    {
      label: "1280×720 - 16:9 (HD)",
      width: 1280,
      height: 720,
      category: "HD Widescreen",
    },
    {
      label: "1600×900 - 16:9 (HD+)",
      width: 1600,
      height: 900,
      category: "HD Widescreen",
    },
    {
      label: "1920×1088 - 16:9 (Full HD)",
      width: 1920,
      height: 1088,
      category: "HD Widescreen",
    },

    // Legacy SD resolutions
    { label: "512×512 - 1:1 (SD)", width: 512, height: 512, category: "SD" },
    { label: "768×768 - 1:1 (SD)", width: 768, height: 768, category: "SD" },
    {
      label: "512×768 - 2:3 (SD Portrait)",
      width: 512,
      height: 768,
      category: "SD",
    },
    {
      label: "768×512 - 3:2 (SD Landscape)",
      width: 768,
      height: 512,
      category: "SD",
    },
  ];

  // Fetch view tags on component mount
  useEffect(() => {
    const fetchViewTags = async () => {
      try {
        const response = await fetch(`${API_URL}/api/view-tags`);
        const data = await response.json();
        if (data.success && data.viewTags) {
          setViewTags(data.viewTags);
        }
      } catch (error) {
        console.error("Failed to load view tags:", error);
      }
    };
    fetchViewTags();
  }, []);

  // Sync checkpoints and upscalers from ComfyUI API on mount
  useEffect(() => {
    const syncCheckpoints = async () => {
      try {
        const comfyURL = comfyui.apiUrl || "http://127.0.0.1:8188";
        const response = await fetch(
          `${API_URL}/api/comfyui/checkpoints?comfyUIUrl=${encodeURIComponent(comfyURL)}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.checkpoints && data.checkpoints.length > 0) {
            // Transform checkpoints into model objects that SearchableModelDropdown expects
            const checkpointModels = data.checkpoints.map((ckpt) => {
              // ckpt is now an object with { name, path, description, baseModel, civitai }
              const parts = (ckpt.path || ckpt.name).split("/");
              const name = parts[parts.length - 1]; // "model.safetensors"
              const folder =
                parts.length > 1 ? parts.slice(0, -1).join("/") : ""; // "Illustrious/reijlita"

              return {
                type: "checkpoint",
                name: ckpt.name || ckpt.path, // Full path for ComfyUI
                folder: folder,
                path: ckpt.path || ckpt.name,
                description: ckpt.description,
                baseModel: ckpt.baseModel,
                civitai: ckpt.civitai || {},
                metadata: null,
              };
            });

            setCheckpoints(checkpointModels);
            console.log(
              "✅ Synced checkpoints from ComfyUI:",
              checkpointModels.length,
              "models",
            );
          }
        } else {
          console.warn("⚠️ Failed to fetch checkpoints from ComfyUI");
        }
      } catch (error) {
        console.error("❌ Error syncing checkpoints:", error);
      }
    };

    const syncUpscalers = async () => {
      try {
        const comfyURL = comfyui.apiUrl || "http://127.0.0.1:8188";
        const response = await fetch(
          `${API_URL}/api/comfyui/upscalers?comfyUIUrl=${encodeURIComponent(comfyURL)}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.upscalers && data.upscalers.length > 0) {
            // Store upscalers in models store
            useSettingsStore.setState((state) => ({
              models: { ...state.models, upscalers: data.upscalers },
            }));
            console.log(
              "✅ Synced upscalers from ComfyUI:",
              data.upscalers.length,
              "models",
            );
          }
        } else {
          console.warn("⚠️ Failed to fetch upscalers from ComfyUI");
        }
      } catch (error) {
        console.error("❌ Error syncing upscalers:", error);
      }
    };

    const syncEmbeddings = async () => {
      try {
        // Note: This requires COMFYUI_MODELS_PATH to be configured on the server
        const comfyURL = comfyui.apiUrl || "http://127.0.0.1:8188";
        const response = await fetch(
          `${API_URL}/api/comfyui/embeddings?comfyUIUrl=${encodeURIComponent(comfyURL)}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.embeddings && data.embeddings.length > 0) {
            // Store embeddings in models store
            useSettingsStore.setState((state) => ({
              models: { ...state.models, embeddings: data.embeddings },
            }));
            console.log(
              "✅ Synced embeddings:",
              data.embeddings.length,
              "found",
            );
          } else {
            console.log(
              "ℹ️ No embeddings found (COMFYUI_MODELS_PATH may not be configured)",
            );
          }
        }
      } catch (error) {
        console.error("❌ Error syncing embeddings:", error);
      }
    };

    const syncLoras = async () => {
      try {
        const comfyURL = comfyui.apiUrl || "http://127.0.0.1:8188";
        const response = await fetch(
          `${API_URL}/api/comfyui/loras?comfyUIUrl=${encodeURIComponent(comfyURL)}`,
        );

        if (response.ok) {
          const data = await response.json();
          if (data.loras && data.loras.length > 0) {
            // Get existing LoRAs from state (loaded from database with trigger words)
            const existingLoras = useSettingsStore.getState().models.loras || [];

            // Create a map of existing LoRAs by name for quick lookup
            const existingLorasMap = new Map();
            existingLoras.forEach(lora => {
              existingLorasMap.set(lora.name, lora);
            });

            // Transform loras into model objects that SearchableModelDropdown expects
            // Merge with existing data to preserve trigger words from database
            const loraModels = data.loras.map((lora) => {
              const parts = (lora.path || lora.name).split("/");
              const name = parts[parts.length - 1];
              const folder =
                parts.length > 1 ? parts.slice(0, -1).join("/") : "";

              // Check if we have this LoRA in our database
              const existingLora = existingLorasMap.get(lora.name || lora.path) ||
                                   existingLorasMap.get(name);

              return {
                type: "lora",
                name: lora.name || lora.path,
                folder: folder,
                path: lora.path || lora.name,
                // Preserve trigger words from database, fall back to ComfyUI data
                triggerWords: existingLora?.triggerWords || lora.triggerWords || [],
                description: existingLora?.description || lora.description,
                baseModel: existingLora?.baseModel || lora.baseModel,
                civitai: existingLora?.civitai || lora.civitai || {},
                metadata: existingLora?.metadata || null,
              };
            });

            useSettingsStore.setState((state) => ({
              models: { ...state.models, loras: loraModels },
            }));
            console.log(
              "✅ Synced LoRAs from ComfyUI:",
              loraModels.length,
              "models (preserving database metadata)",
            );
          }
        } else {
          console.warn("⚠️ Failed to fetch LoRAs from ComfyUI");
        }
      } catch (error) {
        console.error("❌ Error syncing LoRAs:", error);
      }
    };

    syncCheckpoints();
    syncUpscalers();
    syncEmbeddings();
    syncLoras();
  }, [setCheckpoints, comfyui.apiUrl]); // Run when setCheckpoints or apiUrl changes

  const handleAddLoraSlot = () => {
    setLoraSlots([...loraSlots, { id: Date.now(), lora: "", strength: 1.0 }]);
  };

  const handleRemoveLoraSlot = (id) => {
    setLoraSlots(loraSlots.filter((slot) => slot.id !== id));
  };

  const handleLoraSlotChange = (id, field, value) => {
    setLoraSlots(
      loraSlots.map((slot) =>
        slot.id === id ? { ...slot, [field]: value } : slot,
      ),
    );
  };

  const handleRandomSeed = () => {
    setSettings({ ...settings, seed: Math.floor(Math.random() * 4294967295) });
  };

  const handleSwapDimensions = () => {
    setSettings({
      ...settings,
      width: settings.height,
      height: settings.width,
    });
  };

  // Connect to ComfyUI WebSocket for real-time progress
  const connectToComfyUIWebSocket = (clientId) => {
    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      // ComfyUI WebSocket URL (replace http with ws)
      const wsUrl =
        comfyui.apiUrl
          .replace("http://", "ws://")
          .replace("https://", "wss://") + "/ws";

      console.log("🔌 Connecting to ComfyUI WebSocket");

      const ws = new WebSocket(`${wsUrl}?clientId=${clientId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");
      };

      let currentPromptId = null;

      ws.onmessage = async (event) => {
        // Check if this is binary data (preview image) or JSON message
        if (event.data instanceof Blob) {
          // This is a preview image from ComfyUI - skip for now
          // TODO: Could display these as real-time previews in the future
          return;
        }

        try {
          const message = JSON.parse(event.data);

          // Handle different message types
          if (message.type === "executing") {
            const msgPromptId = message.data?.prompt_id;

            // Store the promptId from the first executing message
            if (msgPromptId && !currentPromptId) {
              currentPromptId = msgPromptId;
            }

            if (msgPromptId && message.data.node === null) {
              // Execution finished - fetch final images
              console.log("🎉 Generation complete");
              await fetchGeneratedImages(msgPromptId);
            }
          }

          // Progress update - NOTE: ComfyUI progress messages don't have prompt_id!
          // Just update progress for any generation in progress
          if (message.type === "progress") {
            const { value, max } = message.data;
            if (value !== undefined && max !== undefined) {
              setProgressDetails({ current: value, max });
              const progress = Math.floor((value / max) * 100);
              setGenerationProgress(progress);

              // If we reach 100%, fetch images after a short delay (fallback)
              if (progress === 100 && currentPromptId) {
                setTimeout(async () => {
                  console.log("🎉 Progress reached 100%, fetching images...");
                  await fetchGeneratedImages(currentPromptId);
                }, 1000);
              }
            }
          }

          // Status messages (check for queue completion)
          if (message.type === "status") {
            const execInfo = message.data?.status?.exec_info;
            if (execInfo?.queue_remaining === 0 && currentPromptId) {
              // Check if we've already processed this prompt ID
              if (!processedPromptIds.current.has(currentPromptId)) {
                console.log("🎉 Queue empty, fetching images...");
                processedPromptIds.current.add(currentPromptId);
                await fetchGeneratedImages(currentPromptId);
              }
            }
          }

          // Execution cached (instant result)
          if (message.type === "execution_cached") {
            const msgPromptId = message.data?.prompt_id;
            console.log(`⚡ Execution cached - promptId: ${msgPromptId}`);

            // Check if we've already processed this prompt ID
            if (msgPromptId && !processedPromptIds.current.has(msgPromptId)) {
              processedPromptIds.current.add(msgPromptId);
              await fetchGeneratedImages(msgPromptId);
            }
          }

          // Error handling
          if (message.type === "execution_error") {
            const msgPromptId = message.data?.prompt_id;
            console.log(`❌ Execution error - promptId: ${msgPromptId}`);

            if (msgPromptId) {
              console.error("Error details:", message.data);
              setGenerationError(
                message.data.exception_message || "Generation failed",
              );
              setIsGenerating(false);
              ws.close();
            }
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setGenerationError("WebSocket connection failed");
        setIsGenerating(false);
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket closed");
      };
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      setGenerationError("Failed to connect to ComfyUI WebSocket");
      setIsGenerating(false);
    }
  };

  // Fetch generated images from ComfyUI history
  const fetchGeneratedImages = async (promptId) => {
    try {
      const historyResponse = await fetch(
        `${API_URL}/api/generation/history?comfyUIUrl=${encodeURIComponent(comfyui.apiUrl)}`,
      );

      if (!historyResponse.ok) {
        throw new Error("Failed to fetch generation history");
      }

      const history = await historyResponse.json();

      if (history[promptId]) {
        const promptHistory = history[promptId];
        const outputs = promptHistory.outputs || {};
        const images = [];

        Object.values(outputs).forEach((output) => {
          if (output.images) {
            output.images.forEach((img) => {
              images.push({
                filename: img.filename,
                subfolder: img.subfolder || "",
                type: img.type || "output",
                url: `${API_URL}/api/generation/image/${encodeURIComponent(
                  img.filename,
                )}?comfyUIUrl=${encodeURIComponent(
                  comfyui.apiUrl,
                )}&subfolder=${encodeURIComponent(
                  img.subfolder || "",
                )}&type=${img.type || "output"}`,
              });
            });
          }
        });

        // Save images to gallery with metadata
        const imagesWithMetadata = images.map((img) => ({
          ...img,
          metadata: {
            prompt,
            negativePrompt,
            model: settings.checkpoint,
            seed: settings.seed,
            steps: settings.steps,
            cfg: settings.cfg,
            sampler: settings.sampler,
            scheduler: settings.scheduler,
            width: settings.width,
            height: settings.height,
            batchSize: settings.batchSize,
            hiresFix: settings.hiresFix.enabled ? settings.hiresFix : null,
            refiner: settings.refiner.enabled ? settings.refiner : null,
            loras: loraSlots
              .filter((slot) => slot.lora)
              .map((slot) => ({
                lora: slot.lora,
                strength: slot.strength,
              })),
          },
        }));

        imagesWithMetadata.forEach((img) => addImage(img));
        setGeneratedImages(imagesWithMetadata);
        setGenerationProgress(100);
        setIsGenerating(false);

        // Close WebSocket
        if (wsRef.current) {
          wsRef.current.close();
        }
      }
    } catch (error) {
      console.error("Error fetching images:", error);
      setGenerationError(error.message);
      setIsGenerating(false);
    }
  };

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!settings.checkpoint) {
      alert("Please select a checkpoint model");
      return;
    }

    if (!prompt.trim()) {
      alert("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationError(null);
    setGeneratedImages([]);

    // Clear processed prompt IDs for this new generation
    processedPromptIds.current.clear();

    // Generate client_id ONCE for both backend submission and WebSocket
    const clientId = `kiko-creator-${Date.now()}`;

    try {
      console.log("🚀 Starting generation...");

      // Build view tags string
      const viewTagsArray = [];
      Object.keys(viewSelections).forEach((category) => {
        const selection = viewSelections[category];
        if (selection !== "none") {
          if (selection === "random") {
            // Pick a random tag from this category
            const tags = viewTags[category];
            if (tags && tags.length > 0) {
              const randomTag = tags[Math.floor(Math.random() * tags.length)];
              viewTagsArray.push(randomTag);
            }
          } else {
            viewTagsArray.push(selection);
          }
        }
      });

      // Build final prompt with quality tags and view tags
      const viewTagsString =
        viewTagsArray.length > 0 ? viewTagsArray.join(", ") : "";

      // Prepend quality tags to the prompt
      const promptWithQuality = qualityTags.trim()
        ? `${qualityTags.trim()}${prompt.trim() ? ' ' + prompt.trim() : ''}`
        : prompt;

      const finalPrompt = viewTagsString
        ? `${promptWithQuality}, ${viewTagsString}`.trim()
        : promptWithQuality;

      // Connect to WebSocket BEFORE submitting (so we don't miss any messages)
      connectToComfyUIWebSocket(clientId);

      // Submit generation request with the SAME client_id
      const response = await fetch(`${API_URL}/api/generation/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: { ...settings, prompt: finalPrompt, negativePrompt },
          loraSlots,
          comfyUIUrl: comfyui.apiUrl,
          clientId: clientId, // Pass our client_id to backend
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Generation failed");
      }

      const result = await response.json();
      console.log("✅ Generation submitted");
    } catch (error) {
      console.error("❌ Generation error:", error);
      setGenerationError(error.message);
      setIsGenerating(false);
    }
  };

  // Collect all trigger words from selected LoRAs
  const activeTriggerWords = useMemo(() => {
    const words = [];
    loraSlots.forEach((slot) => {
      if (slot.lora) {
        const selectedLora = models.loras.find(
          (l) => l.name === slot.lora || l.path === slot.lora
        );
        if (selectedLora && selectedLora.triggerWords && selectedLora.triggerWords.length > 0) {
          selectedLora.triggerWords.forEach((word) => {
            if (!words.includes(word)) {
              words.push(word);
            }
          });
        }
      }
    });
    return words;
  }, [loraSlots, models.loras]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-full w-full flex flex-col bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary"
    >
      {/* Hero Header with Animated Gradient */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-to-r from-ocean-500/20 via-ocean-600/20 to-ocean-700/20 backdrop-blur-xl border-b border-border-primary/50 p-6"
      >
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-ocean-300 via-ocean-300 to-ocean-300 bg-clip-text text-transparent mb-2">
            ✨ AI Image Generation
          </h1>
          <p className="text-text-secondary text-sm md:text-base">Create stunning images with advanced diffusion models</p>
        </div>
        
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-r from-ocean-400 to-ocean-500 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-r from-ocean-600 to-ocean-400 rounded-full blur-3xl"
          />
        </div>
      </motion.div>

      {/* Main Content with Glass Morphism */}
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        
        {/* Prompt Section with Floating Animation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          whileHover={{ scale: 1.01 }}
          className="bg-gradient-to-br from-bg-secondary/80 to-bg-tertiary/80 backdrop-blur-xl rounded-2xl border border-ocean-400/20 shadow-2xl shadow-ocean-400/10 p-6 md:p-8 relative z-30"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-ocean-400 to-ocean-500 flex items-center justify-center">
                <span className="text-xl">📝</span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary">Creative Prompt</h2>
            </div>
            <motion.button
              onClick={() => {
                handleGenerate();
                // Scroll to results section after generation starts and WebSocket connects
                setTimeout(() => {
                  resultsRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  });
                }, 1000);
              }}
              disabled={isGenerating}
              className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg shadow-lg shadow-green-500/30 transition-all duration-200 flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Generate</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Quality Tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              <span>⭐</span> Quality Tags
            </label>
            <TagAutocomplete
              value={qualityTags}
              onChange={(value) => setQualityTags(value)}
              placeholder="Quality enhancers..."
              rows={2}
              className="bg-bg-primary/40 backdrop-blur-sm transition-shadow duration-300 hover:shadow-glow-blue"
            />
          </div>

          {/* Positive Prompt */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              <span>➕</span> Positive Prompt
            </label>
            <TagAutocomplete
              value={prompt}
              onChange={(value) => setPrompt(value)}
              placeholder="Describe your vision..."
              rows={4}
              className="bg-bg-primary/50 backdrop-blur-sm transition-shadow duration-300 hover:shadow-glow-green"
            />
            
            {/* Active LoRA Trigger Words Display */}
            {activeTriggerWords.length > 0 && (
              <div className="mt-2 p-2 bg-bg-secondary/30 rounded border border-border-primary/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-text-tertiary">🎯 Active Trigger Words:</span>
                  <button
                    onClick={() => {
                      const words = activeTriggerWords.join(', ')
                      setPrompt(prompt + (prompt ? ', ' : '') + words)
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-ocean-600/80 hover:bg-ocean-600 text-white transition-colors"
                    title="Add all trigger words to prompt"
                  >
                    + Add All
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {activeTriggerWords.map((word, idx) => (
                    <span
                      key={idx}
                      onClick={() => {
                        setPrompt(prompt + (prompt ? ', ' : '') + word)
                      }}
                      className="text-xs px-2 py-0.5 rounded-full bg-ocean-500/20 text-ocean-300 border border-ocean-500/40 cursor-pointer hover:bg-ocean-500/30 hover:border-ocean-400/60 transition-all"
                      title="Click to add to prompt"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions with hover effects */}
          <div className="flex gap-2 mt-4 relative z-50">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <WildcardMenu onInsert={(wildcard) => setPrompt(prompt + wildcard)} />
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <EmbeddingsMenu onInsert={(embedding) => setPrompt(prompt + (prompt ? ', ' : '') + embedding)} />
            </motion.div>
          </div>

          {/* Negative Prompt */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              <span>🚫</span> Negative Prompt
            </label>
            <TagAutocomplete
              value={negativePrompt}
              onChange={(value) => setNegativePrompt(value)}
              placeholder="What to avoid..."
              rows={2}
              className="bg-bg-primary/30 transition-shadow duration-300 hover:shadow-glow-red"
            />

            {/* Quick Actions for Negative Prompt */}
            <div className="flex gap-2 mt-2 relative z-50">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <EmbeddingsMenu onInsert={(embedding) => setNegativePrompt(negativePrompt + (negativePrompt ? ', ' : '') + embedding)} />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Model & LoRA Section - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Model Selection Card */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-gradient-to-br from-ocean-600/10 to-ocean-400/10 backdrop-blur-xl rounded-2xl border border-ocean-600/20 p-6 relative z-20"
          >
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="text-2xl">🎯</span> Checkpoint Model
            </h3>
            
            <div className="relative z-50">
              <SearchableModelDropdown
                models={models.checkpoints}
                value={settings.checkpoint}
                onChange={(checkpointName) => setSettings({ ...settings, checkpoint: checkpointName })}
                placeholder="Search checkpoints..."
                modelType="checkpoint"
                favoriteCheckpoints={favoriteCheckpoints}
                onToggleFavorite={toggleFavoriteCheckpoint}
              />
            </div>
          </motion.div>

          {/* LoRA Section Card */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-gradient-to-br from-ocean-500/10 to-ocean-400/10 backdrop-blur-xl rounded-2xl border border-ocean-500/20 p-6 relative z-20"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <span className="text-2xl">🎛️</span> LoRA Enhancements
              </h3>
              <motion.button
                onClick={handleAddLoraSlot}
                className="px-3 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors text-sm font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                + Add LoRA
              </motion.button>
            </div>
            
            {loraSlots.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary text-sm">
                No LoRAs added. Click "Add LoRA" to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {loraSlots.map((slot, index) => (
                  <div 
                    key={slot.id} 
                    className="bg-bg-tertiary/50 backdrop-blur-sm rounded-lg p-4 border border-border-primary relative"
                    style={{ zIndex: 50 - index }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="relative" style={{ zIndex: 10 }}>
                          <SearchableModelDropdown
                            models={models.loras}
                            value={slot.lora}
                            onChange={(loraName) => handleLoraSlotChange(slot.id, 'lora', loraName)}
                            placeholder="Select LoRA..."
                            modelType="lora"
                          />
                        </div>

                        {/* Trigger Words */}
                        {(() => {
                          const selectedLora = models.loras.find(l => l.name === slot.lora || l.path === slot.lora)
                          if (selectedLora && selectedLora.triggerWords && selectedLora.triggerWords.length > 0) {
                            return (
                              <div className="bg-bg-primary/50 rounded border border-border-secondary p-2">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="text-xs font-medium text-text-tertiary">Trigger Words:</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        const words = selectedLora.triggerWords.join(', ')
                                        setPrompt(prompt + (prompt ? ', ' : '') + words)
                                      }}
                                      className="text-xs px-2 py-0.5 rounded bg-accent-secondary hover:bg-accent-secondary/80 text-white transition-colors"
                                    >
                                      + Add to Prompt
                                    </button>
                                    {selectedLora.civitai?.modelId && (
                                      <button
                                        onClick={() => {
                                          const modelId = selectedLora.civitai.modelId
                                          const versionId = selectedLora.civitai.id
                                          let url = `https://civitai.com/models/${modelId}`
                                          if (versionId) url += `?modelVersionId=${versionId}`
                                          window.open(url, '_blank', 'noopener,noreferrer')
                                        }}
                                        className="w-6 h-6 flex items-center justify-center rounded bg-bg-secondary hover:bg-bg-hover text-text-secondary hover:text-accent-primary border border-border-primary hover:border-accent-primary transition-all"
                                      >
                                        🌐
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {selectedLora.triggerWords.map((word, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                                    >
                                      {word}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          }
                          return null
                        })()}

                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1">
                            Strength: {slot.strength.toFixed(2)}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={slot.strength}
                            onChange={(e) => handleLoraSlotChange(slot.id, 'strength', parseFloat(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      </div>

                      <motion.button
                        onClick={() => handleRemoveLoraSlot(slot.id)}
                        className="p-2 text-accent-error hover:bg-accent-error/10 rounded-lg transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        ✕
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Generation Settings with Stagger Animation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-gradient-to-br from-bg-secondary/80 to-bg-tertiary/80 backdrop-blur-xl rounded-2xl border border-accent-primary/20 p-6 relative z-10"
        >
          <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
            <span className="text-2xl">⚙️</span> Generation Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Steps */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Steps: {settings.steps}
              </label>
              <input
                type="range"
                min="1"
                max="150"
                value={settings.steps}
                onChange={(e) => setSettings({ ...settings, steps: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* CFG Scale */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                CFG Scale: {settings.cfg}
              </label>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={settings.cfg}
                onChange={(e) => setSettings({ ...settings, cfg: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Sampler */}
            <div className="relative z-30">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Sampler
              </label>
              <select
                value={settings.sampler}
                onChange={(e) => setSettings({ ...settings, sampler: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm relative z-30"
              >
                {samplers.map((sampler) => (
                  <option key={sampler} value={sampler}>
                    {sampler}
                  </option>
                ))}
              </select>
            </div>

            {/* Scheduler */}
            <div className="relative z-30">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Scheduler
              </label>
              <select
                value={settings.scheduler}
                onChange={(e) => setSettings({ ...settings, scheduler: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm relative z-30"
              >
                {schedulers.map((scheduler) => (
                  <option key={scheduler} value={scheduler}>
                    {scheduler}
                  </option>
                ))}
              </select>
            </div>

            {/* Seed */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Seed
              </label>
              <div className="flex gap-2 items-center mb-2">
                <input
                  type="number"
                  value={settings.seed}
                  onChange={(e) => setSettings({ ...settings, seed: parseInt(e.target.value) })}
                  disabled={settings.randomSeed}
                  className="flex-1 px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm disabled:opacity-50"
                />
                <motion.button
                  onClick={handleRandomSeed}
                  className="px-4 py-2 bg-bg-tertiary hover:bg-bg-hover border border-border-primary hover:border-accent-primary rounded-lg transition-colors text-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🎲
                </motion.button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.randomSeed}
                  onChange={(e) => setSettings({ ...settings, randomSeed: e.target.checked })}
                  className="w-4 h-4 rounded border-border-primary bg-bg-tertiary text-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                />
                <span className="text-sm text-text-secondary">Random Seed</span>
              </label>
            </div>

            {/* Batch Size */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Batch Size: {settings.batchSize}
              </label>
              <input
                type="range"
                min="1"
                max="8"
                value={settings.batchSize}
                onChange={(e) => setSettings({ ...settings, batchSize: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Hires Fix */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="bg-gradient-to-br from-bg-secondary/80 to-bg-tertiary/80 backdrop-blur-xl rounded-2xl border border-ocean-600/20 p-6 relative z-10"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-2xl">🔍</span> Hires Fix
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.hiresFix.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  hiresFix: { ...settings.hiresFix, enabled: e.target.checked }
                })}
                className="w-4 h-4 rounded border-border-primary bg-bg-tertiary text-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              />
              <span className="text-sm text-text-secondary">Enable</span>
            </label>
          </div>

          {settings.hiresFix.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upscaler Model */}
              <div className="col-span-2 relative z-20">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Upscaler Model
                </label>
                <select
                  value={settings.hiresFix.model}
                  onChange={(e) => setSettings({
                    ...settings,
                    hiresFix: { ...settings.hiresFix, model: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm relative z-20"
                >
                  {Array.isArray(models?.upscalers) && models.upscalers.length > 0 ? (
                    models.upscalers.map((upscaler) => (
                      <option key={upscaler} value={upscaler}>
                        {upscaler}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="4x-UltraSharp">4x-UltraSharp</option>
                      <option value="R-ESRGAN 4x+">R-ESRGAN 4x+</option>
                    </>
                  )}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Scale: {settings.hiresFix.scale.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="4.0"
                  step="0.1"
                  value={settings.hiresFix.scale}
                  onChange={(e) => setSettings({
                    ...settings,
                    hiresFix: { ...settings.hiresFix, scale: parseFloat(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Denoise: {settings.hiresFix.denoise.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.hiresFix.denoise}
                  onChange={(e) => setSettings({
                    ...settings,
                    hiresFix: { ...settings.hiresFix, denoise: parseFloat(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Steps: {settings.hiresFix.steps}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={settings.hiresFix.steps}
                  onChange={(e) => setSettings({
                    ...settings,
                    hiresFix: { ...settings.hiresFix, steps: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.hiresFix.randomSeed}
                    onChange={(e) => setSettings({
                      ...settings,
                      hiresFix: { ...settings.hiresFix, randomSeed: e.target.checked }
                    })}
                    className="w-4 h-4 rounded border-border-primary bg-bg-tertiary text-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                  />
                  <span className="text-sm text-text-secondary">Random Seed</span>
                </label>
              </div>
            </div>
          )}
        </motion.div>

        {/* Refiner */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="bg-gradient-to-br from-bg-secondary/80 to-bg-tertiary/80 backdrop-blur-xl rounded-2xl border border-ocean-400/20 p-6 relative z-10"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <span className="text-2xl">✨</span> Refiner
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.refiner.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  refiner: { ...settings.refiner, enabled: e.target.checked }
                })}
                className="w-4 h-4 rounded border-border-primary bg-bg-tertiary text-accent-primary focus:ring-2 focus:ring-accent-primary/20"
              />
              <span className="text-sm text-text-secondary">Enable</span>
            </label>
          </div>

          {settings.refiner.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2 relative z-20">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Refiner Model
                </label>
                <div className="relative z-40">
                  <SearchableModelDropdown
                    models={models.checkpoints}
                    value={settings.refiner.model}
                    onChange={(modelName) => setSettings({
                      ...settings,
                      refiner: { ...settings.refiner, model: modelName }
                    })}
                    placeholder="Select refiner checkpoint..."
                    modelType="checkpoint"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Refiner Ratio: {settings.refiner.ratio.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.refiner.ratio}
                  onChange={(e) => setSettings({
                    ...settings,
                    refiner: { ...settings.refiner, ratio: parseFloat(e.target.value) }
                  })}
                  className="w-full"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.refiner.addNoise}
                    onChange={(e) => setSettings({
                      ...settings,
                      refiner: { ...settings.refiner, addNoise: e.target.checked }
                    })}
                    className="w-4 h-4 rounded border-border-primary bg-bg-tertiary text-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                  />
                  <span className="text-sm text-text-secondary">Add Noise</span>
                </label>
              </div>
            </div>
          )}
        </motion.div>

        {/* Resolution */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="bg-gradient-to-br from-bg-secondary/80 to-bg-tertiary/80 backdrop-blur-xl rounded-2xl border border-green-500/20 p-6 relative z-10"
        >
          <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="text-2xl">📐</span> Resolution
          </h3>

          <div className="mb-4 relative z-20">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Resolution Preset
            </label>
            <select
              value={resolutions.find(r => r.width === settings.width && r.height === settings.height)?.label || 'custom'}
              onChange={(e) => {
                const selected = resolutions.find(r => r.label === e.target.value)
                if (selected) {
                  setSettings({ ...settings, width: selected.width, height: selected.height })
                }
              }}
              className="w-full px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm relative z-20"
            >
              <option value="custom">Custom Resolution</option>
              <optgroup label="SDXL Square">
                {resolutions.filter(r => r.category === 'SDXL Square').map((res) => (
                  <option key={res.label} value={res.label}>{res.label}</option>
                ))}
              </optgroup>
              <optgroup label="SDXL Landscape">
                {resolutions.filter(r => r.category === 'SDXL Landscape').map((res) => (
                  <option key={res.label} value={res.label}>{res.label}</option>
                ))}
              </optgroup>
              <optgroup label="SDXL Portrait">
                {resolutions.filter(r => r.category === 'SDXL Portrait').map((res) => (
                  <option key={res.label} value={res.label}>{res.label}</option>
                ))}
              </optgroup>
              <optgroup label="HD Widescreen">
                {resolutions.filter(r => r.category === 'HD Widescreen').map((res) => (
                  <option key={res.label} value={res.label}>{res.label}</option>
                ))}
              </optgroup>
              <optgroup label="SD">
                {resolutions.filter(r => r.category === 'SD').map((res) => (
                  <option key={res.label} value={res.label}>{res.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Width
              </label>
              <input
                type="number"
                min="64"
                max="8192"
                step="8"
                value={settings.width}
                onChange={(e) => setSettings({ ...settings, width: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Height
              </label>
              <input
                type="number"
                min="64"
                max="8192"
                step="8"
                value={settings.height}
                onChange={(e) => setSettings({ ...settings, height: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex justify-center mt-3">
            <motion.button
              onClick={handleSwapDimensions}
              className="px-3 py-1.5 bg-bg-tertiary hover:bg-bg-hover border border-border-primary hover:border-accent-primary rounded-lg transition-all duration-200 flex items-center gap-2 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg
                className="w-4 h-4 text-text-secondary group-hover:text-accent-primary transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
              <span className="text-xs text-text-secondary group-hover:text-accent-primary transition-colors">
                Swap Dimensions
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* View Tags */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="bg-gradient-to-br from-bg-secondary/80 to-bg-tertiary/80 backdrop-blur-xl rounded-2xl border border-orange-500/20 p-6 relative z-10"
        >
          <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="text-2xl">👁️</span> View Tags
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative z-20">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Angle
              </label>
              <select
                value={viewSelections.angle}
                onChange={(e) => setViewSelections({ ...viewSelections, angle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm relative z-20"
              >
                <option value="none">None</option>
                <option value="random">Random</option>
                {viewTags.angle.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            <div className="relative z-20">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Camera
              </label>
              <select
                value={viewSelections.camera}
                onChange={(e) => setViewSelections({ ...viewSelections, camera: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm relative z-20"
              >
                <option value="none">None</option>
                <option value="random">Random</option>
                {viewTags.camera.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            <div className="relative z-20">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Background
              </label>
              <select
                value={viewSelections.background}
                onChange={(e) => setViewSelections({ ...viewSelections, background: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm relative z-20"
              >
                <option value="none">None</option>
                <option value="random">Random</option>
                {viewTags.background.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            <div className="relative z-20">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Style
              </label>
              <select
                value={viewSelections.style}
                onChange={(e) => setViewSelections({ ...viewSelections, style: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-bg-tertiary text-text-primary border border-border-primary focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all duration-200 outline-none text-sm relative z-20"
              >
                <option value="none">None</option>
                <option value="random">Random</option>
                {viewTags.style.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Generate Button - Hero Style */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <motion.button
            onClick={handleGenerate}
            disabled={isGenerating || !settings.checkpoint || !prompt.trim()}
            whileHover={{ scale: isGenerating || !settings.checkpoint || !prompt.trim() ? 1 : 1.02, boxShadow: "0 20px 60px rgba(168, 85, 247, 0.4)" }}
            whileTap={{ scale: isGenerating || !settings.checkpoint || !prompt.trim() ? 1 : 0.98 }}
            className={`w-full py-6 rounded-2xl font-bold text-xl shadow-2xl transition-all relative overflow-hidden ${
              isGenerating || !settings.checkpoint || !prompt.trim()
                ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                : 'bg-gradient-to-r from-ocean-500 via-ocean-600 to-ocean-700 text-white shadow-ocean-400/50 hover:shadow-ocean-400/70'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                />
                <span>Generating Magic... {generationProgress}%</span>
              </div>
            ) : (
              <span>✨ Generate Image</span>
            )}

            {/* Animated shine effect */}
            {!isGenerating && settings.checkpoint && prompt.trim() && (
              <motion.div
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            )}
          </motion.button>
        </motion.div>

        {/* Right Panel - Preview Section */}
        <div className="lg:col-span-1 space-y-4">
          <motion.div
            ref={resultsRef}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="bg-gradient-to-br from-bg-secondary/80 to-bg-tertiary/80 backdrop-blur-xl rounded-2xl border border-ocean-400/20 p-6 min-h-[600px] flex flex-col sticky top-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <span className="text-2xl">🎨</span> Preview
                {generatedImages.length > 0 && (
                  <span className="text-sm text-text-tertiary">
                    ({generatedImages.length})
                  </span>
                )}
              </h3>

              {generatedImages.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Clear current preview?')) {
                      setGeneratedImages([])
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-tertiary text-text-secondary hover:bg-bg-hover border border-border-primary"
                >
                  🗑️ Clear
                </button>
              )}
            </div>

            <div className="flex-1 bg-bg-tertiary/50 rounded-lg border border-border-primary overflow-auto">
              {generatedImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 p-3">
                  {generatedImages.map((image, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group rounded-lg overflow-hidden border border-border-primary bg-bg-primary aspect-square"
                    >
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          setLightboxImage(image)
                          setLightboxIndex(index)
                        }}
                      />

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setLightboxImage(image)
                              setLightboxIndex(index)
                            }}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs backdrop-blur-sm"
                          >
                            🔍
                          </button>
                          <button
                            onClick={() => {
                              const a = document.createElement('a')
                              a.href = image.url
                              a.download = image.filename
                              a.click()
                            }}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs backdrop-blur-sm"
                          >
                            ⬇️
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(image.url)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-xs backdrop-blur-sm"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full"
                      />
                      <div className="text-xl text-text-primary">
                        Generating... {generationProgress}%
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-6xl mb-4">🎨</div>
                      <p className="text-text-secondary">
                        No preview yet. Generate some images!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {generationError && (
              <div className="mt-4 p-4 bg-accent-error/10 border border-accent-error/30 rounded-lg">
                <p className="text-accent-error text-sm font-medium">⚠️ Error</p>
                <p className="text-accent-error text-sm mt-1">{generationError}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <PreviewLightbox
          image={lightboxImage}
          images={generatedImages}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxImage(null)}
          onNext={() => {
            const nextIndex = (lightboxIndex + 1) % generatedImages.length
            setLightboxIndex(nextIndex)
            setLightboxImage(generatedImages[nextIndex])
          }}
          onPrevious={() => {
            const prevIndex = (lightboxIndex - 1 + generatedImages.length) % generatedImages.length
            setLightboxIndex(prevIndex)
            setLightboxImage(generatedImages[prevIndex])
          }}
        />
      )}
    </motion.div>
  );
}

// Preview Lightbox Component
function PreviewLightbox({ image, images, currentIndex, onClose, onNext, onPrevious }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onPrevious && images.length > 1) onPrevious()
      if (e.key === 'ArrowRight' && onNext && images.length > 1) onNext()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrevious, images])

  if (!image) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="text-white text-sm">
          {images.length > 1 && (
            <span>{currentIndex + 1} / {images.length}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 transition-colors text-3xl leading-none"
        >
          ×
        </button>
      </div>

      {images.length > 1 && onPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPrevious()
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white text-2xl transition-all z-10"
        >
          ←
        </button>
      )}

      {images.length > 1 && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white text-2xl transition-all z-10"
        >
          →
        </button>
      )}

      <motion.img
        key={currentIndex}
        src={image.url}
        alt={image.filename}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {image.metadata && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white text-sm max-h-[30vh] overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-2">
            <div><strong>Filename:</strong> {image.filename}</div>
            {image.metadata.prompt && <div><strong>Prompt:</strong> {image.metadata.prompt}</div>}
            {image.metadata.negativePrompt && <div><strong>Negative:</strong> {image.metadata.negativePrompt}</div>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {image.metadata.model && <div><strong>Model:</strong> {image.metadata.model}</div>}
              {image.metadata.seed !== undefined && <div><strong>Seed:</strong> {image.metadata.seed}</div>}
              {image.metadata.steps && <div><strong>Steps:</strong> {image.metadata.steps}</div>}
              {image.metadata.cfg && <div><strong>CFG:</strong> {image.metadata.cfg}</div>}
              {image.metadata.sampler && <div><strong>Sampler:</strong> {image.metadata.sampler}</div>}
              {image.metadata.width && image.metadata.height && (
                <div><strong>Size:</strong> {image.metadata.width}×{image.metadata.height}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}