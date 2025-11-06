/**
 * ComfyUI_Mira Workflow Builder Service
 * Generates workflow JSON for ComfyUI API using ComfyUI_Mira custom nodes
 *
 * REQUIRES: ComfyUI_Mira v0.4.9.2+ (https://github.com/mirabarukaso/ComfyUI_Mira)
 *
 * This workflow provides superior quality compared to vanilla ComfyUI through:
 * - LoRAfromText: Better LoRA handling from text syntax
 * - CanvasCreatorAdvanced: Proper resolution + HiRes multiplier management
 * - VAEDecodeTiled/VAEEncodeTiled: Tiled processing for quality + VRAM efficiency
 * - UpscaleImageByModelThenResize: Superior upscaling method
 * - ImageColorTransferMira: Color consistency between stages
 * - ImageSaverMira: Rich metadata embedding
 * - StepsAndCfg: Centralized configuration
 */

import wildcardService from './wildcardService.js'

/**
 * Generate a ComfyUI_Mira workflow for text-to-image generation
 * @param {Object} settings - Generation settings
 * @param {Array} loraSlots - Array of LoRA configurations
 * @returns {Object} - ComfyUI workflow JSON
 */
export function buildTextToImageWorkflow(settings, loraSlots = []) {
  const {
    checkpoint,
    prompt,
    negativePrompt,
    steps,
    cfg,
    sampler,
    scheduler,
    width,
    height,
    seed,
    randomSeed,
    batchSize,
    clipSkip,
    hiresFix,
    refiner
  } = settings

  // Process wildcards in prompts
  let processedPrompt = wildcardService.processPrompt(prompt)
  let processedNegativePrompt = wildcardService.processPrompt(negativePrompt)

  // Build prompt with LoRA syntax for LoRAfromText node
  let finalPrompt = processedPrompt
  loraSlots.forEach((slot) => {
    if (slot.lora && slot.strength) {
      // ComfyUI_Mira's LoRAfromText node needs the full filename with extension
      const loraName = slot.lora
      finalPrompt += ` <lora:${loraName}:${slot.strength}>`
    }
  })

  // Generate random seed if needed
  const actualSeed = (randomSeed || seed === -1) ? Math.floor(Math.random() * 2147483647) : seed

  // Determine HiRes multiplier
  const hiresMultiplier = hiresFix?.enabled ? (hiresFix.scale || 1.5) : 1.0

  // ComfyUI_Mira workflow structure
  const workflow = {
    // ==================== Core Configuration ====================

    // Steps & CFG (Centralized)
    '13': {
      inputs: {
        steps: steps,
        cfg: cfg
      },
      class_type: 'StepsAndCfg',
      _meta: {
        title: 'Steps & Cfg'
      }
    },

    // Canvas Creator Advanced (Handles resolution + HiRes multiplier)
    '17': {
      inputs: {
        Width: width,
        Height: height,
        Batch: batchSize,
        // CRITICAL: ComfyUI_Mira's Landscape parameter is buggy
        // Setting to false makes it obey width/height correctly regardless of orientation
        Landscape: false,
        HiResMultiplier: hiresMultiplier
      },
      class_type: 'CanvasCreatorAdvanced',
      _meta: {
        title: 'Create Canvas Advanced'
      }
    },

    // ==================== Prompts (Text Boxes) ====================

    // Positive Prompt TextBox
    '32': {
      inputs: {
        text: finalPrompt
      },
      class_type: 'TextBoxMira',
      _meta: {
        title: 'Positive Prompt'
      }
    },

    // Negative Prompt TextBox
    '33': {
      inputs: {
        text: processedNegativePrompt
      },
      class_type: 'TextBoxMira',
      _meta: {
        title: 'Negative Prompt'
      }
    },

    // ==================== Base Checkpoint Loading ====================

    // Load Base Checkpoint
    '43': {
      inputs: {
        ckpt_name: checkpoint
      },
      class_type: 'CheckpointLoaderSimple',
      _meta: {
        title: 'Load Checkpoint (Base)'
      }
    },

    // Model Sampling Discrete (Base)
    '44': {
      inputs: {
        sampling: 'eps',
        zsnr: false,
        model: ['43', 0]
      },
      class_type: 'ModelSamplingDiscrete',
      _meta: {
        title: 'Model Sampling Discrete (Base)'
      }
    },

    // CLIP Set Last Layer (Base)
    '46': {
      inputs: {
        stop_at_clip_layer: clipSkip || -2,
        clip: ['43', 1]
      },
      class_type: 'CLIPSetLastLayer',
      _meta: {
        title: 'CLIP Set Last Layer (Base)'
      }
    },

    // ==================== LoRA Loading ====================

    // LoRA from Text (Refiner - will be used for base if no refiner)
    '39': {
      inputs: {
        text: ['32', 0],
        model: ['44', 0],
        clip: ['46', 0] // Use CLIP from CLIPSetLastLayer
      },
      class_type: 'LoRAfromText',
      _meta: {
        title: 'LoRA Loader (Base)'
      }
    },

    // ==================== Base Generation CLIP Encoding ====================

    // Positive Prompt Encoding (Base)
    '41': {
      inputs: {
        text: ['39', 4], // Text output from LoRAfromText
        clip: ['39', 1]
      },
      class_type: 'CLIPTextEncode',
      _meta: {
        title: 'CLIP Text Encode (Positive - Base)'
      }
    },

    // Negative Prompt Encoding (Base)
    '40': {
      inputs: {
        text: ['33', 0],
        clip: ['39', 1]
      },
      class_type: 'CLIPTextEncode',
      _meta: {
        title: 'CLIP Text Encode (Negative - Base)'
      }
    },

    // ==================== Latent Image ====================

    // Empty Latent Image
    '5': {
      inputs: {
        width: ['17', 0],
        height: ['17', 1],
        batch_size: batchSize
      },
      class_type: 'EmptyLatentImage',
      _meta: {
        title: 'Empty Latent Image'
      }
    },

    // ==================== Base Generation KSampler ====================

    // KSampler Advanced (Base Generation)
    '36': {
      inputs: {
        add_noise: 'enable',
        noise_seed: actualSeed,
        steps: ['13', 0],
        cfg: ['13', 1],
        sampler_name: sampler,
        scheduler: scheduler,
        start_at_step: 0,
        end_at_step: 10000,
        return_with_leftover_noise: 'disable',
        model: ['39', 0],
        positive: ['41', 0],
        negative: ['40', 0],
        latent_image: ['5', 0]
      },
      class_type: 'KSamplerAdvanced',
      _meta: {
        title: 'KSampler (Base Generation)'
      }
    },

    // ==================== Base VAE Decode ====================

    // VAE Decode (Base)
    '6': {
      inputs: {
        samples: ['36', 0],
        vae: ['43', 2]
      },
      class_type: 'VAEDecode',
      _meta: {
        title: 'VAE Decode (Base)'
      }
    }
  }

  // ==================== Upscale Model Loader ====================
  const upscaleModel = hiresFix?.model || 'RealESRGAN_x4.pth'

  workflow['27'] = {
    inputs: {
      model_name: upscaleModel
    },
    class_type: 'UpscaleModelLoader',
    _meta: {
      title: 'Load Upscale Model'
    }
  }

  // ==================== Upscale Image By Model Then Resize ====================
  workflow['25'] = {
    inputs: {
      resize_scale: ['17', 5], // HiRes multiplier from CanvasCreatorAdvanced
      resize_method: 'nearest',
      upscale_model: ['27', 0],
      image: ['6', 0]
    },
    class_type: 'UpscaleImageByModelThenResize',
    _meta: {
      title: 'Upscale Image By Model Then Resize'
    }
  }

  // ==================== Hires Fix (if enabled) ====================
  if (hiresFix?.enabled) {
    const hiresSteps = hiresFix.steps || Math.ceil(steps * 0.7)
    const hiresDenoise = hiresFix.denoise || 0.4
    const hiresFixSeed = hiresFix.randomSeed ? Math.floor(Math.random() * 2147483647) : actualSeed

    // Load Refiner Checkpoint (if specified, otherwise use base)
    if (refiner?.enabled && refiner?.model) {
      workflow['45'] = {
        inputs: {
          ckpt_name: refiner.model
        },
        class_type: 'CheckpointLoaderSimple',
        _meta: {
          title: 'Load Checkpoint (Refiner)'
        }
      }

      // Model Sampling Discrete (Refiner)
      workflow['35'] = {
        inputs: {
          sampling: 'eps',
          zsnr: false,
          model: ['45', 0]
        },
        class_type: 'ModelSamplingDiscrete',
        _meta: {
          title: 'Model Sampling Discrete (Refiner)'
        }
      }

      // CLIP Set Last Layer (Refiner)
      workflow['47'] = {
        inputs: {
          stop_at_clip_layer: clipSkip || -2,
          clip: ['45', 1]
        },
        class_type: 'CLIPSetLastLayer',
        _meta: {
          title: 'CLIP Set Last Layer (Refiner)'
        }
      }

      // LoRA from Text (Refiner)
      workflow['34'] = {
        inputs: {
          text: ['32', 0],
          model: ['35', 0],
          clip: ['47', 0] // Use CLIP from CLIPSetLastLayer
        },
        class_type: 'LoRAfromText',
        _meta: {
          title: 'LoRA Loader (Refiner)'
        }
      }

      // CLIP Text Encode (Positive - Refiner)
      workflow['2'] = {
        inputs: {
          text: ['34', 4],
          clip: ['34', 1]
        },
        class_type: 'CLIPTextEncode',
        _meta: {
          title: 'CLIP Text Encode (Positive - Refiner)'
        }
      }

      // CLIP Text Encode (Negative - Refiner)
      workflow['3'] = {
        inputs: {
          text: ['33', 0],
          clip: ['34', 1]
        },
        class_type: 'CLIPTextEncode',
        _meta: {
          title: 'CLIP Text Encode (Negative - Refiner)'
        }
      }

      // Use refiner model for hires fix
      var hiresModel = ['34', 0]
      var hiresModelVAE = ['45', 2]
      var hiresPositive = ['2', 0]
      var hiresNegative = ['3', 0]
    } else {
      // Use base model for hires fix
      var hiresModel = ['39', 2] // Use processed model from LoRAfromText
      var hiresModelVAE = ['43', 2]
      var hiresPositive = ['41', 0]
      var hiresNegative = ['40', 0]
    }

    // VAE Encode Tiled (for hires fix)
    workflow['19'] = {
      inputs: {
        tile_size: 512,
        overlap: 64,
        temporal_size: 64,
        temporal_overlap: 8,
        pixels: ['25', 0],
        vae: hiresModelVAE
      },
      class_type: 'VAEEncodeTiled',
      _meta: {
        title: 'VAE Encode (Tiled)'
      }
    }

    // KSampler (Hires Fix)
    workflow['20'] = {
      inputs: {
        seed: hiresFixSeed,
        steps: hiresSteps,
        cfg: ['13', 1],
        sampler_name: sampler,
        scheduler: scheduler,
        denoise: hiresDenoise,
        model: hiresModel,
        positive: hiresPositive,
        negative: hiresNegative,
        latent_image: ['19', 0]
      },
      class_type: 'KSampler',
      _meta: {
        title: 'KSampler (Hires Fix)'
      }
    }

    // VAE Decode Tiled (Final)
    workflow['18'] = {
      inputs: {
        tile_size: 512,
        overlap: 64,
        temporal_size: 64,
        temporal_overlap: 8,
        samples: ['20', 0],
        vae: hiresModelVAE
      },
      class_type: 'VAEDecodeTiled',
      _meta: {
        title: 'VAE Decode (Tiled - Final)'
      }
    }

    // Image Color Transfer (maintain color consistency)
    workflow['28'] = {
      inputs: {
        method: 'Mean',
        src_image: ['18', 0],
        ref_image: ['6', 0]
      },
      class_type: 'ImageColorTransferMira',
      _meta: {
        title: 'Color Transfer'
      }
    }

    // Final image is from color transfer
    var finalImage = ['28', 0]
  } else {
    // No hires fix - use base generation
    var finalImage = ['6', 0]
  }

  // ==================== Image Saver (ComfyUI_Mira) ====================

  workflow['29'] = {
    inputs: {
      filename: '%time_%seed',
      path: '%date',
      extension: 'png',
      steps: ['13', 0],
      cfg: ['13', 1],
      modelname: checkpoint,
      sampler_name: sampler,
      scheduler: scheduler,
      positive: ['32', 0],
      negative: ['33', 0],
      seed_value: actualSeed,
      width: ['17', 0],
      height: ['17', 1],
      lossless_webp: true,
      quality_jpeg_or_webp: 100,
      optimize_png: false,
      counter: 0,
      denoise: hiresFix?.enabled ? hiresFix.denoise : 1.0,
      clip_skip: -2,
      time_format: '%Y-%m-%d-%H%M%S',
      save_workflow_as_json: false,
      embed_workflow: true,
      additional_hashes: '',
      images: finalImage
    },
    class_type: 'ImageSaverMira',
    _meta: {
      title: 'Image Saver'
    }
  }

  return workflow
}

/**
 * Validate generation settings
 * @param {Object} settings - Generation settings to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateSettings(settings) {
  const errors = []

  if (!settings.checkpoint) {
    errors.push('Checkpoint model is required')
  }

  if (!settings.prompt || !settings.prompt.trim()) {
    errors.push('Prompt is required')
  }

  if (settings.steps < 1 || settings.steps > 150) {
    errors.push('Steps must be between 1 and 150')
  }

  if (settings.cfg < 1 || settings.cfg > 30) {
    errors.push('CFG scale must be between 1 and 30')
  }

  if (settings.width < 64 || settings.width > 4096) {
    errors.push('Width must be between 64 and 4096')
  }

  if (settings.height < 64 || settings.height > 4096) {
    errors.push('Height must be between 64 and 4096')
  }

  if (settings.batchSize < 1 || settings.batchSize > 8) {
    errors.push('Batch size must be between 1 and 8')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get friendly names for workflow nodes to display execution progress
 * @param {Object} settings - Generation settings (used to determine which nodes are active)
 * @returns {Object} - Mapping of node IDs to friendly names
 */
export function getWorkflowNodeNames(settings) {
  const { hiresFix, refiner } = settings

  // Base workflow nodes (always present)
  const nodeNames = {
    '13': 'Configuring steps & CFG',
    '17': 'Creating canvas',
    '32': 'Processing positive prompt',
    '33': 'Processing negative prompt',
    '43': 'Loading base checkpoint',
    '44': 'Configuring model sampling',
    '46': 'Setting CLIP layers',
    '39': 'Loading LoRAs',
    '41': 'Encoding positive prompt',
    '40': 'Encoding negative prompt',
    '5': 'Creating latent image',
    '36': 'Generating base image',
    '6': 'Decoding base image'
  }

  // Upscaling nodes (always present with default multiplier 1.0)
  nodeNames['27'] = 'Loading upscale model'
  nodeNames['25'] = 'Upscaling image'

  // Hires fix nodes (only if enabled)
  if (hiresFix?.enabled) {
    // Refiner nodes (only if refiner is enabled within hires fix)
    if (refiner?.enabled && refiner?.model) {
      nodeNames['45'] = 'Loading refiner checkpoint'
      nodeNames['35'] = 'Configuring refiner sampling'
      nodeNames['47'] = 'Setting refiner CLIP layers'
      nodeNames['34'] = 'Loading refiner LoRAs'
      nodeNames['2'] = 'Encoding refiner positive'
      nodeNames['3'] = 'Encoding refiner negative'
    }

    nodeNames['19'] = 'Encoding for hires fix'
    nodeNames['20'] = 'Refining image (hires fix)'
    nodeNames['18'] = 'Decoding refined image'
    nodeNames['28'] = 'Transferring colors'
  }

  // Final save node (always present)
  nodeNames['29'] = 'Saving image'

  return nodeNames
}