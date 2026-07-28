import type { BuildVideoPromptInput } from '@/lib/ai/video/types'

export const DEFAULT_VIDEO_NEGATIVE_PROMPT = [
  'identity drift',
  'face morphing',
  'costume changes',
  'location changes',
  'extra people',
  'duplicate limbs',
  'deformed hands',
  'unstable anatomy',
  'flicker',
  'frame warping',
  'camera shake',
  'sudden zoom',
  'exaggerated movement',
  'modern objects',
  'text',
  'logo',
  'watermark',
  'scene transition',
].join(', ')

export function buildVideoPrompt({
  shot,
  scene,
  assignments,
}: BuildVideoPromptInput) {
  const performance = assignments.length
    ? assignments.map(item => [
        `${item.characterCode} — ${item.characterName}`,
        item.pose ? `Pose: ${item.pose}` : null,
        item.action ? `Action: ${item.action}` : null,
        item.expression ? `Expression: ${item.expression}` : null,
        item.gazeDirection ? `Gaze: ${item.gazeDirection}` : null,
        item.physicalState ? `Physical state: ${item.physicalState}` : null,
      ].filter(Boolean).join('. ')).join('\n')
    : 'No character performance; animate only the established environment and camera.'

  return [
    'Animate the supplied first frame as a grounded cinematic shot.',
    `SUBJECT MOTION:\n${shot.action || scene.purpose || 'Use restrained motion consistent with the established first frame.'}`,
    `CAMERA MOTION:\n${shot.cameraMovement || 'Static'}. Preserve the established ${shot.cameraAngle} composition and ${shot.lens} lens character.`,
    `ENVIRONMENTAL MOTION:\nTime of day: ${shot.timeOfDay}. ${shot.lightingNotes || 'Keep lighting direction and exposure stable.'}`,
    `PERFORMANCE:\n${performance}${shot.emotionalIntent ? `\nEmotional intent: ${shot.emotionalIntent}.` : ''}${shot.dialogueExcerpt ? `\nDialogue beat: ${shot.dialogueExcerpt}` : ''}`,
    `SCENE PURPOSE:\n${scene.purpose || scene.summary || scene.title}`,
    [
      'CONTINUITY:',
      'Preserve the exact character identity, face, costume, body proportions,',
      'location design, lighting direction, and composition established by the first',
      'frame. Use subtle physically plausible movement. Do not introduce new',
      'characters, objects, architecture, clothing, text, logos, or scene changes.',
    ].join('\n'),
  ].join('\n\n')
}

export function buildVideoNegativePrompt(shotNegativePrompt?: string | null) {
  return shotNegativePrompt?.trim()
    ? `${DEFAULT_VIDEO_NEGATIVE_PROMPT}, ${shotNegativePrompt.trim()}`
    : DEFAULT_VIDEO_NEGATIVE_PROMPT
}
