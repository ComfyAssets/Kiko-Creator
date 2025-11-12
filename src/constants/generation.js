/**
 * Shared constants for AI image generation parameters
 * These are used across the application to ensure consistency
 */

/**
 * ComfyUI-supported samplers
 * Full list of sampling methods available in ComfyUI
 */
export const SAMPLERS = [
  'euler',
  'euler_ancestral',
  'heun',
  'dpm_2',
  'dpm_2_ancestral',
  'lms',
  'dpm_fast',
  'dpm_adaptive',
  'dpmpp_2s_ancestral',
  'dpmpp_sde',
  'dpmpp_2m',
  'dpmpp_2m_sde',
  'dpmpp_2m_sde_gpu',
  'dpmpp_3m_sde',
  'dpmpp_3m_sde_gpu',
  'ddim',
  'ddpm',
  'uni_pc',
  'lcm', // Latent Consistency Model - for fast generation (4-8 steps)
]

/**
 * ComfyUI-supported schedulers
 * Full list of noise schedulers available in ComfyUI
 */
export const SCHEDULERS = [
  'normal',
  'karras',
  'exponential',
  'simple',
  'sgm_uniform',
  'ddim_uniform',
  'beta',
  'linear_quadratic',
  'kl_optimal',
]

/**
 * Default generation parameters
 */
export const DEFAULT_GENERATION_PARAMS = {
  steps: 20,
  cfg: 7,
  sampler: 'euler_ancestral',
  scheduler: 'normal',
  width: 512,
  height: 512,
}
