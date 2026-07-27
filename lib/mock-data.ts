export type ApprovalStatus = 'approved' | 'pending' | 'draft' | 'rejected'
export type ProductionStatus = 'completed' | 'in-progress' | 'waiting' | 'failed' | 'not-started'
export type EpisodeStage = 'script-draft' | 'storyboard-generation' | 'video-rendering' | 'voice-generation' | 'editing' | 'completed' | 'published'

export interface Project {
  id: string
  name: string
  status: 'active' | 'draft' | 'archived'
  coverColor: string
  format: string
  orientation: string
  currentSeason: number
  totalEpisodes: number
  completedEpisodes: number
  storyProgress: number
  episodeProgress: number
  productionProgress: number
  exportProgress: number
  lastUpdated: string
}

export interface Character {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'recurring'
  age: number
  personality: string
  motivation: string
  appearance: string
  distinguishingFeatures: string
  approvalStatus: ApprovalStatus
  costumeCount: number
  episodeUsage: number
  avatarColor: string
  locked: {
    facialIdentity: boolean
    skinTone: boolean
    eyeColor: boolean
    hairstyle: boolean
    bodyProportions: boolean
    distinguishingFeatures: boolean
    accessories: boolean
  }
}

export interface Costume {
  id: string
  name: string
  characterId: string
  characterName: string
  description: string
  episodes: string[]
  approvalStatus: ApprovalStatus
  color: string
}

export interface Location {
  id: string
  name: string
  type: string
  description: string
  timeOfDay: string[]
  approvalStatus: ApprovalStatus
  episodeUsage: number
  color: string
}

export interface Episode {
  id: string
  number: number
  title: string
  storyStatus: ApprovalStatus
  productionStatus: ProductionStatus
  stage: EpisodeStage
  duration: string
  continuityWarnings: number
  lastUpdated: string
  synopsis: string
  mainCharacters: string[]
  progress: number
}

export interface Scene {
  id: string
  episodeId: string
  number: number
  title: string
  duration: string
  locationId: string
  locationName: string
  characters: string[]
  costumes: string[]
  purpose: string
  emotionalTone: string
  timeOfDay: string
  dialogueSummary: string
  status: ApprovalStatus
  warnings: number
}

export interface GenerationJob {
  id: string
  type: 'storyboard' | 'video' | 'voice' | 'continuity'
  label: string
  episodeId: string
  episodeTitle: string
  progress: number
  status: 'running' | 'queued' | 'paused' | 'completed' | 'failed'
  startedAt: string
}

export interface ContinuityIssue {
  id: string
  severity: 'warning' | 'error'
  episodeId: string
  episodeTitle: string
  description: string
  category: 'costume' | 'character' | 'location' | 'story' | 'continuity'
}

export interface Shot {
  id: string
  episodeId: string
  sceneId: string
  number: number
  framing: string
  duration: string
  characterId: string
  characterName: string
  costumeId: string
  locationId: string
  locationName: string
  generationStatus: ProductionStatus
  promptPreview: string
  locked: boolean
}

export interface VoiceLine {
  id: string
  episodeId: string
  sceneId: string
  characterId: string
  characterName: string
  voiceProfile: string
  text: string
  emotion: string
  audioStatus: ProductionStatus
}

export interface SeasonEpisodePlan {
  number: number
  workingTitle: string
  mainBeat: string
  characters: string[]
  cliffhanger: string
  planningStatus: ApprovalStatus
}

// ---- Projects ----

export const PROJECTS: Project[] = [
  {
    id: 'proj-001',
    name: 'Crimson Signal',
    status: 'active',
    coverColor: 'from-red-900 to-orange-900',
    format: 'Serialized Short Drama',
    orientation: 'Vertical 9:16',
    currentSeason: 1,
    totalEpisodes: 40,
    completedEpisodes: 2,
    storyProgress: 80,
    episodeProgress: 30,
    productionProgress: 15,
    exportProgress: 5,
    lastUpdated: '2h ago',
  },
  {
    id: 'proj-002',
    name: 'The Hollow Ward',
    status: 'active',
    coverColor: 'from-slate-800 to-blue-900',
    format: 'Serialized Short Drama',
    orientation: 'Vertical 9:16',
    currentSeason: 1,
    totalEpisodes: 24,
    completedEpisodes: 0,
    storyProgress: 45,
    episodeProgress: 10,
    productionProgress: 0,
    exportProgress: 0,
    lastUpdated: '1d ago',
  },
  {
    id: 'proj-003',
    name: 'Echoes of Nara',
    status: 'draft',
    coverColor: 'from-purple-900 to-indigo-900',
    format: 'Serialized Short Drama',
    orientation: 'Vertical 9:16',
    currentSeason: 1,
    totalEpisodes: 20,
    completedEpisodes: 0,
    storyProgress: 20,
    episodeProgress: 0,
    productionProgress: 0,
    exportProgress: 0,
    lastUpdated: '3d ago',
  },
]

export const ACTIVE_PROJECT = PROJECTS[0]

// ---- Characters ----

export const CHARACTERS: Character[] = [
  {
    id: 'CHAR-001',
    name: 'Maren Solis',
    role: 'protagonist',
    age: 28,
    personality: 'Determined, guarded, quick to distrust authority',
    motivation: 'Expose the truth behind her brother\'s disappearance',
    appearance: 'Mixed heritage, sharp features, dark eyes, athletic build',
    distinguishingFeatures: 'Scar along left jawline, silver ring on thumb',
    approvalStatus: 'approved',
    costumeCount: 4,
    episodeUsage: 12,
    avatarColor: 'bg-rose-800',
    locked: { facialIdentity: true, skinTone: true, eyeColor: true, hairstyle: false, bodyProportions: true, distinguishingFeatures: true, accessories: false },
  },
  {
    id: 'CHAR-002',
    name: 'Director Vael',
    role: 'antagonist',
    age: 55,
    personality: 'Calculated, charming, ruthlessly pragmatic',
    motivation: 'Maintain control of a classified state program at any cost',
    appearance: 'Silver-haired, pale complexion, immaculate posture',
    distinguishingFeatures: 'Titanium prosthetic left hand',
    approvalStatus: 'approved',
    costumeCount: 2,
    episodeUsage: 7,
    avatarColor: 'bg-slate-700',
    locked: { facialIdentity: true, skinTone: true, eyeColor: true, hairstyle: true, bodyProportions: false, distinguishingFeatures: true, accessories: true },
  },
  {
    id: 'CHAR-003',
    name: 'Yuna Park',
    role: 'supporting',
    age: 25,
    personality: 'Loyal, resourceful, hides anxiety behind humor',
    motivation: 'Protect Maren while searching for her own purpose',
    appearance: 'East Asian features, short-cropped hair, expressive eyes',
    distinguishingFeatures: 'Constellation tattoo on right forearm',
    approvalStatus: 'approved',
    costumeCount: 3,
    episodeUsage: 10,
    avatarColor: 'bg-emerald-800',
    locked: { facialIdentity: true, skinTone: true, eyeColor: false, hairstyle: true, bodyProportions: false, distinguishingFeatures: true, accessories: false },
  },
  {
    id: 'CHAR-004',
    name: 'Tobias Renard',
    role: 'supporting',
    age: 34,
    personality: 'World-weary, idealistic underneath cynicism',
    motivation: 'Atone for past complicity in the program',
    appearance: 'Stocky build, rough stubble, tired brown eyes',
    distinguishingFeatures: 'Burn mark on right hand',
    approvalStatus: 'pending',
    costumeCount: 2,
    episodeUsage: 5,
    avatarColor: 'bg-amber-800',
    locked: { facialIdentity: false, skinTone: false, eyeColor: false, hairstyle: false, bodyProportions: false, distinguishingFeatures: false, accessories: false },
  },
  {
    id: 'CHAR-005',
    name: 'Lira Doss',
    role: 'recurring',
    age: 40,
    personality: 'Mysterious, speaks in half-truths, never fully trusted',
    motivation: 'Unknown — possibly playing multiple sides',
    appearance: 'Tall, mixed heritage, long braided hair, elegant bearing',
    distinguishingFeatures: 'Eyes of two different colors',
    approvalStatus: 'draft',
    costumeCount: 1,
    episodeUsage: 3,
    avatarColor: 'bg-violet-800',
    locked: { facialIdentity: false, skinTone: false, eyeColor: true, hairstyle: false, bodyProportions: false, distinguishingFeatures: true, accessories: false },
  },
]

// ---- Locations ----

export const LOCATIONS: Location[] = [
  {
    id: 'LOCATION-001',
    name: 'Vael\'s Office — State Tower Floor 42',
    type: 'Interior',
    description: 'Corner office with floor-to-ceiling glass, minimalist furnishings, surveillance feeds on side wall.',
    timeOfDay: ['day', 'night'],
    approvalStatus: 'approved',
    episodeUsage: 7,
    color: 'bg-slate-700',
  },
  {
    id: 'LOCATION-002',
    name: 'The Underplex — Level 7',
    type: 'Interior',
    description: 'Underground facility. Brutalist concrete corridors, humming fluorescent lighting, reinforced doors.',
    timeOfDay: ['interior'],
    approvalStatus: 'approved',
    episodeUsage: 9,
    color: 'bg-stone-700',
  },
  {
    id: 'LOCATION-003',
    name: 'Meridian District — Street Market',
    type: 'Exterior',
    description: 'Busy covered market in a mid-rise urban district. Warm lighting, multiple exit routes.',
    timeOfDay: ['morning', 'evening'],
    approvalStatus: 'approved',
    episodeUsage: 4,
    color: 'bg-orange-900',
  },
  {
    id: 'LOCATION-004',
    name: 'Maren\'s Apartment',
    type: 'Interior',
    description: 'Small, lived-in apartment. Evidence board pinned to one wall. Personal and chaotic.',
    timeOfDay: ['night', 'morning'],
    approvalStatus: 'approved',
    episodeUsage: 6,
    color: 'bg-blue-900',
  },
  {
    id: 'LOCATION-005',
    name: 'Signal Relay Station',
    type: 'Exterior',
    description: 'Remote rooftop transmitter array. Cold wind, city lights in background.',
    timeOfDay: ['night'],
    approvalStatus: 'pending',
    episodeUsage: 2,
    color: 'bg-indigo-900',
  },
]

// ---- Costumes ----

export const COSTUMES: Costume[] = [
  { id: 'COSTUME-001', name: 'Field Operative', characterId: 'CHAR-001', characterName: 'Maren Solis', description: 'Dark tactical jacket, black cargo pants, worn boots', episodes: ['EP-001', 'EP-002', 'EP-003'], approvalStatus: 'approved', color: 'bg-zinc-700' },
  { id: 'COSTUME-002', name: 'Civilian Cover', characterId: 'CHAR-001', characterName: 'Maren Solis', description: 'Neutral hoodie, jeans, cap pulled low', episodes: ['EP-004', 'EP-005'], approvalStatus: 'approved', color: 'bg-stone-600' },
  { id: 'COSTUME-003', name: 'Formal Authority', characterId: 'CHAR-002', characterName: 'Director Vael', description: 'Navy three-piece suit, silver tie, gleaming cufflinks', episodes: ['EP-001', 'EP-007', 'EP-010'], approvalStatus: 'approved', color: 'bg-blue-900' },
  { id: 'COSTUME-004', name: 'Off-Duty Casual', characterId: 'CHAR-003', characterName: 'Yuna Park', description: 'Oversized pullover, tailored trousers, white sneakers', episodes: ['EP-002', 'EP-004'], approvalStatus: 'pending', color: 'bg-emerald-900' },
]

// ---- Episodes ----

export const EPISODES: Episode[] = [
  { id: 'EP-001', number: 1, title: 'The Signal', storyStatus: 'approved', productionStatus: 'in-progress', stage: 'storyboard-generation', duration: '8:24', continuityWarnings: 1, lastUpdated: '2h ago', synopsis: 'Maren receives an encoded broadcast traced to her missing brother. She breaks into a signal relay station to confirm the source.', mainCharacters: ['CHAR-001', 'CHAR-003'], progress: 65 },
  { id: 'EP-002', number: 2, title: 'Beneath the Grid', storyStatus: 'approved', productionStatus: 'in-progress', stage: 'video-rendering', duration: '9:05', continuityWarnings: 0, lastUpdated: '5h ago', synopsis: 'Following a lead to the Underplex, Maren and Yuna discover a hidden access log. Director Vael learns of the breach.', mainCharacters: ['CHAR-001', 'CHAR-002', 'CHAR-003'], progress: 45 },
  { id: 'EP-003', number: 3, title: 'Fault Lines', storyStatus: 'approved', productionStatus: 'not-started', stage: 'script-draft', duration: '7:50', continuityWarnings: 2, lastUpdated: '1d ago', synopsis: 'A trusted contact is revealed to be a double agent. Tobias surfaces for the first time with a warning.', mainCharacters: ['CHAR-001', 'CHAR-004'], progress: 20 },
  { id: 'EP-004', number: 4, title: 'The Hollow Ward', storyStatus: 'approved', productionStatus: 'not-started', stage: 'script-draft', duration: '8:30', continuityWarnings: 0, lastUpdated: '2d ago', synopsis: 'Maren infiltrates a secure medical ward looking for records. She encounters Lira Doss for the first time.', mainCharacters: ['CHAR-001', 'CHAR-005'], progress: 10 },
  { id: 'EP-005', number: 5, title: 'Redline', storyStatus: 'pending', productionStatus: 'not-started', stage: 'script-draft', duration: '–', continuityWarnings: 0, lastUpdated: '2d ago', synopsis: 'The chase leads to the Meridian District market. Maren must decide whether to trust Tobias.', mainCharacters: ['CHAR-001', 'CHAR-004'], progress: 5 },
  { id: 'EP-006', number: 6, title: 'Override', storyStatus: 'draft', productionStatus: 'not-started', stage: 'script-draft', duration: '–', continuityWarnings: 1, lastUpdated: '3d ago', synopsis: 'Vael deploys a containment team. Yuna makes a sacrifice to buy time.', mainCharacters: ['CHAR-001', 'CHAR-002', 'CHAR-003'], progress: 2 },
]

// ---- Scenes ----

export const SCENES: Scene[] = [
  { id: 'SCN-001', episodeId: 'EP-001', number: 1, title: 'Opening — Maren\'s Apartment', duration: '1:10', locationId: 'LOCATION-004', locationName: "Maren's Apartment", characters: ['Maren Solis'], costumes: ['COSTUME-001'], purpose: 'Establish character state and inciting signal', emotionalTone: 'Tense, isolated', timeOfDay: 'Night', dialogueSummary: 'Maren alone with her evidence board. The encoded signal cuts in over her scanner.', status: 'approved', warnings: 0 },
  { id: 'SCN-002', episodeId: 'EP-001', number: 2, title: 'Street — Meridian Alley Approach', duration: '0:45', locationId: 'LOCATION-003', locationName: 'Meridian District — Street Market', characters: ['Maren Solis', 'Yuna Park'], costumes: ['COSTUME-001', 'COSTUME-004'], purpose: 'Show teamwork, raise stakes', emotionalTone: 'Urgent, focused', timeOfDay: 'Evening', dialogueSummary: 'Maren briefs Yuna on the plan. Yuna reluctantly agrees.', status: 'approved', warnings: 0 },
  { id: 'SCN-003', episodeId: 'EP-001', number: 3, title: 'Signal Relay Station — Break-In', duration: '2:15', locationId: 'LOCATION-005', locationName: 'Signal Relay Station', characters: ['Maren Solis'], costumes: ['COSTUME-001'], purpose: 'Action beat — confirm signal origin', emotionalTone: 'High tension, physical', timeOfDay: 'Night', dialogueSummary: 'No dialogue. Maren bypasses security. Signal confirmed.', status: 'approved', warnings: 1 },
  { id: 'SCN-004', episodeId: 'EP-001', number: 4, title: 'Vael\'s Office — Discovery', duration: '1:30', locationId: 'LOCATION-001', locationName: "Vael's Office — State Tower Floor 42", characters: ['Director Vael'], costumes: ['COSTUME-003'], purpose: 'Establish antagonist awareness of breach', emotionalTone: 'Cold, menacing', timeOfDay: 'Night', dialogueSummary: 'Vael receives a breach alert. Single line: "Begin Protocol Seven."', status: 'approved', warnings: 0 },
  { id: 'SCN-005', episodeId: 'EP-001', number: 5, title: 'Closing — Maren in Motion', duration: '0:44', locationId: 'LOCATION-003', locationName: 'Meridian District — Street Market', characters: ['Maren Solis', 'Yuna Park'], costumes: ['COSTUME-001', 'COSTUME-004'], purpose: 'Cliffhanger reveal', emotionalTone: 'Shocked, determined', timeOfDay: 'Night', dialogueSummary: 'Maren shows Yuna the decoded name. Yuna: "That\'s impossible."', status: 'approved', warnings: 0 },
]

// ---- Shots ----

export const SHOTS: Shot[] = [
  { id: 'SHOT-001', episodeId: 'EP-001', sceneId: 'SCN-001', number: 1, framing: 'Wide establishing', duration: '0:05', characterId: 'CHAR-001', characterName: 'Maren Solis', costumeId: 'COSTUME-001', locationId: 'LOCATION-004', locationName: "Maren's Apartment", generationStatus: 'completed', promptPreview: 'Dimly lit apartment, evidence board, woman seated at table, night...', locked: true },
  { id: 'SHOT-002', episodeId: 'EP-001', sceneId: 'SCN-001', number: 2, framing: 'Medium close-up', duration: '0:04', characterId: 'CHAR-001', characterName: 'Maren Solis', costumeId: 'COSTUME-001', locationId: 'LOCATION-004', locationName: "Maren's Apartment", generationStatus: 'completed', promptPreview: 'Close on face, scanner light flickering across eyes, tense...', locked: true },
  { id: 'SHOT-003', episodeId: 'EP-001', sceneId: 'SCN-002', number: 3, framing: 'Over-shoulder', duration: '0:06', characterId: 'CHAR-001', characterName: 'Maren Solis', costumeId: 'COSTUME-001', locationId: 'LOCATION-003', locationName: 'Meridian District', generationStatus: 'in-progress', promptPreview: 'Busy market backdrop, two figures in foreground, evening haze...', locked: false },
  { id: 'SHOT-004', episodeId: 'EP-001', sceneId: 'SCN-003', number: 4, framing: 'Low angle tracking', duration: '0:08', characterId: 'CHAR-001', characterName: 'Maren Solis', costumeId: 'COSTUME-001', locationId: 'LOCATION-005', locationName: 'Signal Relay Station', generationStatus: 'waiting', promptPreview: 'Rooftop at night, city skyline, lone figure moving between antenna arrays...', locked: false },
  { id: 'SHOT-005', episodeId: 'EP-001', sceneId: 'SCN-004', number: 5, framing: 'Tight close-up', duration: '0:04', characterId: 'CHAR-002', characterName: 'Director Vael', costumeId: 'COSTUME-003', locationId: 'LOCATION-001', locationName: "Vael's Office", generationStatus: 'waiting', promptPreview: 'Silver-haired man, back to camera, looking at city lights, reflection...', locked: false },
]

// ---- Voice Lines ----

export const VOICE_LINES: VoiceLine[] = [
  { id: 'VL-001', episodeId: 'EP-001', sceneId: 'SCN-002', characterId: 'CHAR-001', characterName: 'Maren Solis', voiceProfile: 'Alto — Controlled, Low Resonance', text: 'We go in through the maintenance corridor. You stay at the junction. If I\'m not back in ten, you leave.', emotion: 'Determined', audioStatus: 'completed' },
  { id: 'VL-002', episodeId: 'EP-001', sceneId: 'SCN-002', characterId: 'CHAR-003', characterName: 'Yuna Park', voiceProfile: 'Mezzo — Warm, Slightly Strained', text: 'Ten minutes. Got it. You always say that like it\'s easy.', emotion: 'Anxious humor', audioStatus: 'completed' },
  { id: 'VL-003', episodeId: 'EP-001', sceneId: 'SCN-004', characterId: 'CHAR-002', characterName: 'Director Vael', voiceProfile: 'Bass — Clipped, Authoritative', text: 'Begin Protocol Seven.', emotion: 'Cold', audioStatus: 'in-progress' },
  { id: 'VL-004', episodeId: 'EP-001', sceneId: 'SCN-005', characterId: 'CHAR-003', characterName: 'Yuna Park', voiceProfile: 'Mezzo — Warm, Slightly Strained', text: "That's impossible.", emotion: 'Shock', audioStatus: 'waiting' },
]

// ---- Generation Jobs ----

export const GENERATION_JOBS: GenerationJob[] = [
  { id: 'JOB-001', type: 'storyboard', label: 'Generating storyboard', episodeId: 'EP-001', episodeTitle: 'The Signal', progress: 72, status: 'running', startedAt: '8 min ago' },
  { id: 'JOB-002', type: 'video', label: 'Rendering video scene', episodeId: 'EP-002', episodeTitle: 'Beneath the Grid', progress: 38, status: 'running', startedAt: '22 min ago' },
  { id: 'JOB-003', type: 'voice', label: 'Generating dialogue voices', episodeId: 'EP-001', episodeTitle: 'The Signal', progress: 91, status: 'running', startedAt: '3 min ago' },
  { id: 'JOB-004', type: 'continuity', label: 'Checking continuity', episodeId: 'EP-003', episodeTitle: 'Fault Lines', progress: 15, status: 'queued', startedAt: 'Queued' },
]

// ---- Continuity Issues ----

export const CONTINUITY_ISSUES: ContinuityIssue[] = [
  { id: 'CI-001', severity: 'error', episodeId: 'EP-001', episodeTitle: 'The Signal', description: 'Maren\'s jacket switches from dark navy to black between Scene 2 and Scene 3.', category: 'costume' },
  { id: 'CI-002', severity: 'warning', episodeId: 'EP-003', episodeTitle: 'Fault Lines', description: 'Tobias references the Underplex in Episode 3, but his first known visit is Episode 5.', category: 'story' },
  { id: 'CI-003', severity: 'warning', episodeId: 'EP-002', episodeTitle: 'Beneath the Grid', description: 'Location lighting preset for Underplex Level 7 differs from approved reference in 3 shots.', category: 'location' },
  { id: 'CI-004', severity: 'error', episodeId: 'EP-006', episodeTitle: 'Override', description: "Yuna's hairstyle in the opening scene does not match the approved reference for this episode.", category: 'character' },
]

// ---- Season plan ----

export const SEASON_EPISODE_PLAN: SeasonEpisodePlan[] = [
  { number: 1, workingTitle: 'The Signal', mainBeat: 'Inciting incident — Maren receives the signal', characters: ['Maren Solis', 'Yuna Park', 'Director Vael'], cliffhanger: 'Decoded name points to a classified program', planningStatus: 'approved' },
  { number: 2, workingTitle: 'Beneath the Grid', mainBeat: 'First descent into the Underplex', characters: ['Maren Solis', 'Yuna Park', 'Director Vael'], cliffhanger: 'Vael learns of the breach', planningStatus: 'approved' },
  { number: 3, workingTitle: 'Fault Lines', mainBeat: 'Contact betrayal + Tobias introduction', characters: ['Maren Solis', 'Tobias Renard'], cliffhanger: 'Maren is cornered', planningStatus: 'approved' },
  { number: 4, workingTitle: 'The Hollow Ward', mainBeat: 'Medical facility infiltration', characters: ['Maren Solis', 'Lira Doss'], cliffhanger: 'Lira hands Maren a key', planningStatus: 'approved' },
  { number: 5, workingTitle: 'Redline', mainBeat: 'Chase through Meridian District', characters: ['Maren Solis', 'Tobias Renard'], cliffhanger: 'Yuna is captured', planningStatus: 'pending' },
  { number: 6, workingTitle: 'Override', mainBeat: 'Containment team deployed — Yuna sacrifices herself', characters: ['Maren Solis', 'Director Vael', 'Yuna Park'], cliffhanger: 'Maren receives Yuna\'s hidden message', planningStatus: 'pending' },
  { number: 7, workingTitle: 'Glass Protocol', mainBeat: 'Maren uncovers the Program\'s true scope', characters: ['Maren Solis', 'Tobias Renard', 'Lira Doss'], cliffhanger: 'Tobias admits his role in the program', planningStatus: 'draft' },
  { number: 8, workingTitle: 'The Weight of Names', mainBeat: 'Midpoint — Maren confronts Vael directly', characters: ['Maren Solis', 'Director Vael'], cliffhanger: 'Vael reveals her brother is alive', planningStatus: 'draft' },
]

// ---- Activity feed ----

export const ACTIVITY_FEED = [
  { id: 'ACT-001', type: 'approved', icon: 'check', label: 'Character approved', detail: 'Maren Solis — CHAR-001', time: '2h ago' },
  { id: 'ACT-002', type: 'created', icon: 'plus', label: 'Location created', detail: 'Signal Relay Station — LOCATION-005', time: '3h ago' },
  { id: 'ACT-003', type: 'generated', icon: 'sparkles', label: 'Episode outline generated', detail: 'EP-003 — Fault Lines', time: '5h ago' },
  { id: 'ACT-004', type: 'completed', icon: 'film', label: 'Storyboard completed', detail: 'EP-001 Scenes 1–2', time: '6h ago' },
  { id: 'ACT-005', type: 'exported', icon: 'upload', label: 'Video exported', detail: 'EP-001 — Final render', time: '1d ago' },
  { id: 'ACT-006', type: 'resolved', icon: 'shield', label: 'Continuity issue resolved', detail: 'Vael costume mismatch — EP-001', time: '1d ago' },
]
