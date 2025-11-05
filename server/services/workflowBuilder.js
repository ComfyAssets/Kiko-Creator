/**
 * ComfyUI Workflow Builder Service
 * Generates workflow JSON for ComfyUI API from generation settings
 */

import wildcardService from './wildcardService.js'

/**
 * Generate a ComfyUI workflow for text-to-image generation
 * @param {Object} settings - Generation settings
 * @param {string} settings.checkpoint - Checkpoint model name
 * @param {string} settings.prompt - Positive prompt
 * @param {string} settings.negativePrompt - Negative prompt
 * @param {number} settings.steps - Number of steps
 * @param {number} settings.cfg - CFG scale
 * @param {string} settings.sampler - Sampler name
 * @param {string} settings.scheduler - Scheduler name
 * @param {number} settings.width - Image width
 * @param {number} settings.height - Image height
 * @param {number} settings.seed - Seed (-1 for random)
 * @param {boolean} settings.randomSeed - Use random seed
 * @param {number} settings.batchSize - Batch size
 * @param {Object} settings.hiresFix - Hires fix settings
 * @param {Object} settings.refiner - Refiner settings
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
    hiresFix,
    refiner
  } = settings

  // Process wildcards in prompts
  let processedPrompt = wildcardService.processPrompt(prompt)
  let processedNegativePrompt = wildcardService.processPrompt(negativePrompt)

  // Build prompt with LoRA syntax
  let finalPrompt = processedPrompt
  loraSlots.forEach((slot) => {
    if (slot.lora && slot.strength) {
      // Extract LoRA name without extension
      const loraName = slot.lora.replace(/\.(safetensors|ckpt|pt)$/i, '')
      finalPrompt += ` <lora:${loraName}:${slot.strength}>`
    }
  })

  // Generate random seed if needed
  const actualSeed = (randomSeed || seed === -1) ? Math.floor(Math.random() * 2147483647) : seed

  // Generate separate seed for hires fix if needed
  const hiresFixSeed = (hiresFix?.enabled && hiresFix?.randomSeed)
    ? Math.floor(Math.random() * 2147483647)
    : actualSeed

  // ComfyUI workflow structure
  const workflow = {
    // Checkpoint Loader
    '1': {
      inputs: {
        ckpt_name: checkpoint
      },
      class_type: 'CheckpointLoaderSimple',
      _meta: {
        title: 'Load Checkpoint'
      }
    },

    // Positive Prompt
    '2': {
      inputs: {
        text: finalPrompt,
        clip: ['1', 1]
      },
      class_type: 'CLIPTextEncode',
      _meta: {
        title: 'CLIP Text Encode (Positive)'
      }
    },

    // Negative Prompt
    '3': {
      inputs: {
        text: processedNegativePrompt,
        clip: ['1', 1]
      },
      class_type: 'CLIPTextEncode',
      _meta: {
        title: 'CLIP Text Encode (Negative)'
      }
    },

    // Empty Latent Image
    '4': {
      inputs: {
        width: width,
        height: height,
        batch_size: batchSize
      },
      class_type: 'EmptyLatentImage',
      _meta: {
        title: 'Empty Latent Image'
      }
    },

    // KSampler
    '5': {
      inputs: {
        seed: actualSeed,
        steps: steps,
        cfg: cfg,
        sampler_name: sampler,
        scheduler: scheduler,
        denoise: 1.0,
        model: ['1', 0],
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['4', 0]
      },
      class_type: 'KSampler',
      _meta: {
        title: 'KSampler'
      }
    },

    // VAE Decode
    '6': {
      inputs: {
        samples: ['5', 0],
        vae: ['1', 2]
      },
      class_type: 'VAEDecode',
      _meta: {
        title: 'VAE Decode'
      }
    },

    // Save Image
    '7': {
      inputs: {
        filename_prefix: 'KikoCreator',
        images: ['6', 0]
      },
      class_type: 'SaveImage',
      _meta: {
        title: 'Save Image'
      }
    }
  }

  // Add Refiner nodes if enabled
  if (refiner?.enabled && refiner?.model) {
    // Load refiner checkpoint
    workflow['10'] = {
      inputs: {
        ckpt_name: refiner.model
      },
      class_type: 'CheckpointLoaderSimple',
      _meta: {
        title: 'Load Refiner Checkpoint'
      }
    }

    // Refiner positive prompt
    workflow['11'] = {
      inputs: {
        text: finalPrompt,
        clip: ['10', 1]
      },
      class_type: 'CLIPTextEncode',
      _meta: {
        title: 'Refiner CLIP Text Encode (Positive)'
      }
    }

    // Refiner negative prompt
    workflow['12'] = {
      inputs: {
        text: processedNegativePrompt,
        clip: ['10', 1]
      },
      class_type: 'CLIPTextEncode',
      _meta: {
        title: 'Refiner CLIP Text Encode (Negative)'
      }
    }

    // Refiner KSampler
    workflow['13'] = {
      inputs: {
        seed: actualSeed,
        steps: Math.ceil(steps * refiner.ratio),
        cfg: cfg,
        sampler_name: sampler,
        scheduler: scheduler,
        denoise: refiner.addNoise ? 0.5 : 0.2,
        model: ['10', 0],
        positive: ['11', 0],
        negative: ['12', 0],
        latent_image: ['5', 0] // Use base KSampler output
      },
      class_type: 'KSampler',
      _meta: {
        title: 'Refiner KSampler'
      }
    }

    // Update VAE decode to use refiner output
    workflow['6'].inputs.samples = ['13', 0]
  }

  // Add Hires Fix nodes if enabled
  if (hiresFix?.enabled) {
    const hiresWidth = Math.floor(width * hiresFix.scale)
    const hiresHeight = Math.floor(height * hiresFix.scale)

    // Upscale latent
    workflow['20'] = {
      inputs: {
        upscale_method: 'nearest-exact',
        width: hiresWidth,
        height: hiresHeight,
        crop: 'disabled',
        samples: refiner?.enabled ? ['13', 0] : ['5', 0] // Use refiner output if available
      },
      class_type: 'LatentUpscale',
      _meta: {
        title: 'Upscale Latent'
      }
    }

    // Load upscale model
    workflow['21'] = {
      inputs: {
        model_name: hiresFix.model
      },
      class_type: 'UpscaleModelLoader',
      _meta: {
        title: 'Load Upscale Model'
      }
    }

    // Hires Fix KSampler
    workflow['22'] = {
      inputs: {
        seed: hiresFixSeed,
        steps: hiresFix.steps,
        cfg: cfg,
        sampler_name: sampler,
        scheduler: scheduler,
        denoise: hiresFix.denoise,
        model: ['1', 0], // Use base model
        positive: ['2', 0],
        negative: ['3', 0],
        latent_image: ['20', 0]
      },
      class_type: 'KSampler',
      _meta: {
        title: 'Hires Fix KSampler'
      }
    }

    // VAE decode for hires fix
    workflow['23'] = {
      inputs: {
        samples: ['22', 0],
        vae: ['1', 2]
      },
      class_type: 'VAEDecode',
      _meta: {
        title: 'Hires Fix VAE Decode'
      }
    }

    // Update save image to use hires fix result
    workflow['7'].inputs.images = ['23', 0]
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

  if (settings.width < 64 || settings.width > 2048) {
    errors.push('Width must be between 64 and 2048')
  }

  if (settings.height < 64 || settings.height > 2048) {
    errors.push('Height must be between 64 and 2048')
  }

  if (settings.batchSize < 1 || settings.batchSize > 8) {
    errors.push('Batch size must be between 1 and 8')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
