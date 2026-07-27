export type ContinuitySeverity = 'Info' | 'Warning' | 'Error'

export interface ContinuityIssue {
  id: string
  ruleCode: string
  severity: ContinuitySeverity
  title: string
  description: string
  episodeId: string
  sceneId: string | null
  characterId: string | null
  costumeId: string | null
  locationId: string | null
  suggestedAction: string | null
}
