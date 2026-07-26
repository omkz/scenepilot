export const FEATURES = {
  props: false,
  voiceGeneration: false,
  advancedVideo: false,
  videoEditor: false,
  export: false,
  subtitles: false,
  socialVersions: false,
  visualStyle: false,
  advancedSeasonPlanning: false,
  advancedGenerationQueue: false,
} as const

export type FeatureKey = keyof typeof FEATURES
