'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Archive,
  BookOpen,
  Check,
  Lock,
  MapPin,
  RotateCcw,
  Search,
  Shirt,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import {
  archiveAssetAction,
  restoreAssetAction,
  setAssetStatusAction,
} from '@/app/projects/[projectId]/story-studio/actions'
import { cn } from '@/lib/utils'
import {
  ASSET_STATUSES,
  LOCATION_TYPES,
  NARRATIVE_ROLES,
  type AssetStatus,
  type CharacterDto,
  type CostumeDto,
  type LocationDto,
  type StoryStudioTab,
} from '@/lib/assets/types'
import type { AssetReadiness } from '@/lib/assets/readiness'
import { StoryBiblePage } from '@/components/pages/story-bible-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AssetStatusBadge } from '@/components/story-studio/asset-status-badge'
import { AssetDeleteDialog } from '@/components/story-studio/asset-delete-dialog'
import {
  CharacterFormSheet,
  CostumeFormSheet,
  LocationFormSheet,
} from '@/components/story-studio/asset-forms'

interface AssetsPageProps {
  projectId: string
  activeTab: StoryStudioTab
  archived: boolean
  characters: CharacterDto[]
  activeCharacters: CharacterDto[]
  costumes: CostumeDto[]
  locations: LocationDto[]
  readiness: AssetReadiness
  saved?: boolean
  error?: string
}

type AssetType = 'character' | 'costume' | 'location'

const tabs: Array<{ value: StoryStudioTab; label: string; icon: typeof Users }> = [
  { value: 'characters', label: 'Characters', icon: Users },
  { value: 'costumes', label: 'Costumes', icon: Shirt },
  { value: 'locations', label: 'Locations', icon: MapPin },
  { value: 'story-bible', label: 'Story Bible', icon: BookOpen },
]

const filterClassName = 'h-8 rounded-lg border border-border bg-card px-2.5 text-xs outline-none'

function deletionErrorMessage(error?: string) {
  if (error === 'asset-not-found') return 'The asset no longer exists in this project.'
  if (!error?.startsWith('asset-in-use:')) return null
  const [, type, costumeValue, sceneValue, shotValue] = error.split(':')
  const costumes = Number(costumeValue)
  const scenes = Number(sceneValue)
  const shots = Number(shotValue)
  const usages = [
    costumes > 0 && `${costumes} costume${costumes === 1 ? '' : 's'}`,
    scenes > 0 && `${scenes} scene${scenes === 1 ? '' : 's'}`,
    shots > 0 && `${shots} shot${shots === 1 ? '' : 's'}`,
  ].filter(Boolean)
  return `This ${type} cannot be deleted because it is used by ${usages.join(', ')}. Archive it instead.`
}

function tabPath(projectId: string, tab: StoryStudioTab, archived = false) {
  const params = new URLSearchParams({ tab })
  if (archived) params.set('archived', '1')
  return `/projects/${projectId}/story-studio?${params}`
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Users
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
        <Icon size={19} className="text-amber-400" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

function AssetWorkflowActions({
  projectId,
  type,
  asset,
  edit,
}: {
  projectId: string
  type: AssetType
  asset: CharacterDto | CostumeDto | LocationDto
  edit?: React.ReactNode
}) {
  const status = asset.approvalStatus
  const statusActions: AssetStatus[] = status === 'Draft'
    ? ['Pending', 'Approved']
    : status === 'Pending'
      ? ['Approved', 'Rejected']
      : status === 'Rejected' || status === 'Approved'
        ? ['Draft']
        : []

  if (status === 'Archived') {
    return (
      <div className="flex items-center gap-1 border-t border-border pt-3">
        <form action={restoreAssetAction.bind(null, projectId, type, asset.id)}>
          <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
            <RotateCcw size={11} className="mr-1" /> Restore
          </Button>
        </form>
        <AssetDeleteDialog
          projectId={projectId}
          assetId={asset.id}
          assetName={asset.name}
          type={type}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-border pt-3">
      {edit}
      {statusActions.map(nextStatus => (
        <form key={nextStatus} action={setAssetStatusAction.bind(null, projectId, type, asset.id, nextStatus)}>
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className={cn(
              'h-7 px-2 text-[11px]',
              nextStatus === 'Approved' && 'text-green-400 hover:text-green-300',
              nextStatus === 'Rejected' && 'text-red-400 hover:text-red-300',
            )}
          >
            {nextStatus === 'Approved' && <Check size={11} className="mr-1" />}
            {nextStatus === 'Rejected' && <X size={11} className="mr-1" />}
            {nextStatus === 'Pending'
              ? 'Mark Pending'
              : nextStatus === 'Approved'
                ? 'Approve'
                : nextStatus === 'Rejected'
                  ? 'Reject'
                  : 'Return to Draft'}
          </Button>
        </form>
      ))}
      <form action={archiveAssetAction.bind(null, projectId, type, asset.id)}>
        <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-muted-foreground">
          <Archive size={11} className="mr-1" /> Archive
        </Button>
      </form>
      <AssetDeleteDialog
        projectId={projectId}
        assetId={asset.id}
        assetName={asset.name}
        type={type}
      />
    </div>
  )
}

function Summary({ readiness }: { readiness: AssetReadiness }) {
  const metrics = [
    { label: 'Characters approved', value: readiness.characters, icon: Users },
    { label: 'Costumes approved', value: readiness.costumes, icon: Shirt },
    { label: 'Locations approved', value: readiness.locations, icon: MapPin },
  ]
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-4">
      {metrics.map(metric => {
        const Icon = metric.icon
        return (
          <div key={metric.label} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Icon size={11} /> {metric.label}
            </div>
            <div className="text-lg font-bold">{metric.value.approved} / {metric.value.total}</div>
          </div>
        )
      })}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-400">
          <Sparkles size={11} /> Next asset action
        </div>
        <div className="text-xs font-semibold">{readiness.nextAction.title}</div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{readiness.nextAction.detail}</p>
      </div>
    </div>
  )
}

export function AssetsPage({
  projectId,
  activeTab,
  archived,
  characters,
  activeCharacters,
  costumes,
  locations,
  readiness,
  saved,
  error,
}: AssetsPageProps) {
  const deleteError = deletionErrorMessage(error)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [secondaryFilter, setSecondaryFilter] = useState('')
  const searchValue = search.trim().toLowerCase()

  const filteredCharacters = useMemo(() => characters.filter(character =>
    (!searchValue || `${character.name} ${character.assetCode}`.toLowerCase().includes(searchValue))
    && (!status || character.approvalStatus === status)
    && (!secondaryFilter || character.narrativeRole === secondaryFilter)
  ), [characters, searchValue, secondaryFilter, status])

  const filteredCostumes = useMemo(() => costumes.filter(costume =>
    (!searchValue || `${costume.name} ${costume.assetCode} ${costume.characterName}`.toLowerCase().includes(searchValue))
    && (!status || costume.approvalStatus === status)
    && (!secondaryFilter || costume.characterId === secondaryFilter)
  ), [costumes, searchValue, secondaryFilter, status])

  const filteredLocations = useMemo(() => locations.filter(location =>
    (!searchValue || `${location.name} ${location.assetCode}`.toLowerCase().includes(searchValue))
    && (!status || location.approvalStatus === status)
    && (!secondaryFilter || location.locationType === secondaryFilter)
  ), [locations, searchValue, secondaryFilter, status])

  const activeCount = activeTab === 'characters'
    ? characters.length
    : activeTab === 'costumes'
      ? costumes.length
      : activeTab === 'locations'
        ? locations.length
        : 0

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold">Story Studio</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Approve reusable characters, wardrobes, and locations once, then reuse their stable asset codes across episodes.
            </p>
          </div>
          {activeTab !== 'story-bible' && (
            <Button
              variant={archived ? 'secondary' : 'outline'}
              render={<Link href={tabPath(projectId, activeTab, !archived)} />}
              className="h-8 text-xs"
            >
              <Archive size={12} className="mr-1.5" />
              {archived ? 'View active' : 'View archived'}
            </Button>
          )}
        </div>

        <Summary readiness={readiness} />

        {saved && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-2.5 text-xs text-green-400">
            Asset saved to the project.
          </div>
        )}
        {deleteError && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs text-red-400">
            {deleteError}
          </div>
        )}

        <nav className="mb-5 flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <Link
                key={tab.value}
                href={tabPath(projectId, tab.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors',
                  activeTab === tab.value && 'bg-card text-foreground shadow-sm',
                )}
              >
                <Icon size={12} />
                {tab.label}
                {tab.value !== 'story-bible' && activeTab === tab.value && (
                  <span className="text-[10px] text-muted-foreground">{activeCount}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {activeTab !== 'story-bible' && (
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-2.5">
              <Search size={12} className="text-muted-foreground" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={`Search ${activeTab}…`}
                className="border-0 bg-transparent px-0 text-xs focus-visible:ring-0"
              />
            </div>
            <select value={status} onChange={event => setStatus(event.target.value)} className={filterClassName}>
              <option value="">All statuses</option>
              {ASSET_STATUSES.map(value => <option key={value}>{value}</option>)}
            </select>
            {activeTab === 'characters' && (
              <select value={secondaryFilter} onChange={event => setSecondaryFilter(event.target.value)} className={filterClassName}>
                <option value="">All roles</option>
                {NARRATIVE_ROLES.map(value => <option key={value}>{value}</option>)}
              </select>
            )}
            {activeTab === 'costumes' && (
              <select value={secondaryFilter} onChange={event => setSecondaryFilter(event.target.value)} className={filterClassName}>
                <option value="">All characters</option>
                {activeCharacters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
              </select>
            )}
            {activeTab === 'locations' && (
              <select value={secondaryFilter} onChange={event => setSecondaryFilter(event.target.value)} className={filterClassName}>
                <option value="">All types</option>
                {LOCATION_TYPES.map(value => <option key={value}>{value}</option>)}
              </select>
            )}
            {!archived && activeTab === 'characters' && <CharacterFormSheet projectId={projectId} />}
            {!archived && activeTab === 'costumes' && activeCharacters.length > 0 && (
              <CostumeFormSheet projectId={projectId} characters={activeCharacters} />
            )}
            {!archived && activeTab === 'locations' && <LocationFormSheet projectId={projectId} />}
          </div>
        )}

        {activeTab === 'characters' && (
          filteredCharacters.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredCharacters.map(character => (
                <article key={character.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex gap-3">
                    <div className="flex h-24 w-20 shrink-0 items-end rounded-lg bg-gradient-to-br from-slate-800 to-red-950 p-2">
                      <Users size={15} className="text-white/40" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="truncate text-sm font-semibold">{character.name}</h2>
                          <div className="mt-0.5 font-mono text-[10px] text-amber-400">{character.assetCode}</div>
                        </div>
                        <AssetStatusBadge status={character.approvalStatus} />
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">{character.narrativeRole}{character.age !== null ? ` · Age ${character.age}` : ''}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{character.costumeCount} costume{character.costumeCount === 1 ? '' : 's'}</div>
                      <div className="mt-2 text-[10px] text-muted-foreground">Updated {new Date(character.updatedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <AssetWorkflowActions
                    projectId={projectId}
                    type="character"
                    asset={character}
                    edit={!archived ? <CharacterFormSheet projectId={projectId} character={character} /> : undefined}
                  />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title={archived ? 'No archived characters' : 'Build your cast'}
              description={archived
                ? 'Archived character references will appear here.'
                : 'Create the recurring characters that will appear across the series.'}
              action={!archived ? <CharacterFormSheet projectId={projectId} /> : undefined}
            />
          )
        )}

        {activeTab === 'costumes' && (
          activeCharacters.length === 0 && !archived ? (
            <EmptyState
              icon={Users}
              title="Create a character first"
              description="Every costume must belong to a project character."
              action={<Button render={<Link href={tabPath(projectId, 'characters')} />} className="bg-amber-500 text-black hover:bg-amber-400">Create Character</Button>}
            />
          ) : filteredCostumes.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredCostumes.map(costume => (
                <article key={costume.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex h-24 items-end rounded-lg bg-gradient-to-br from-stone-800 to-slate-950 p-2.5">
                    <Shirt size={16} className="text-white/40" />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold">{costume.name}</h2>
                      <div className="mt-0.5 font-mono text-[10px] text-amber-400">{costume.assetCode}</div>
                    </div>
                    <AssetStatusBadge status={costume.approvalStatus} />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">{costume.characterName}</div>
                  <div className="mt-1 flex gap-1.5 text-[10px] text-muted-foreground">
                    <span>{costume.category}</span><span>·</span><span>{costume.condition}</span>
                    {costume.isDefault && <span className="rounded-full bg-amber-500/10 px-1.5 text-amber-400">Default</span>}
                  </div>
                  <AssetWorkflowActions
                    projectId={projectId}
                    type="costume"
                    asset={costume}
                    edit={!archived ? <CostumeFormSheet projectId={projectId} characters={activeCharacters} costume={costume} /> : undefined}
                  />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Shirt}
              title={archived ? 'No archived costumes' : 'Create consistent wardrobes'}
              description={archived
                ? 'Archived wardrobe references will appear here.'
                : 'Attach approved costumes to characters so their clothing remains stable across scenes.'}
              action={!archived ? <CostumeFormSheet projectId={projectId} characters={activeCharacters} /> : undefined}
            />
          )
        )}

        {activeTab === 'locations' && (
          filteredLocations.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredLocations.map(location => (
                <article key={location.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex h-28 items-end rounded-lg bg-gradient-to-br from-slate-800 to-emerald-950 p-2.5">
                    <MapPin size={16} className="text-white/40" />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold">{location.name}</h2>
                      <div className="mt-0.5 font-mono text-[10px] text-amber-400">{location.assetCode}</div>
                    </div>
                    <AssetStatusBadge status={location.approvalStatus} />
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {location.locationType} · {location.defaultTimeOfDay} · {location.defaultLighting}
                  </div>
                  <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
                    {location.architectureLocked && <span className="flex items-center gap-1"><Lock size={9} /> Architecture</span>}
                    {location.layoutLocked && <span className="flex items-center gap-1"><Lock size={9} /> Layout</span>}
                    {location.lightingLocked && <span className="flex items-center gap-1"><Lock size={9} /> Lighting</span>}
                  </div>
                  <AssetWorkflowActions
                    projectId={projectId}
                    type="location"
                    asset={location}
                    edit={!archived ? <LocationFormSheet projectId={projectId} location={location} /> : undefined}
                  />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={MapPin}
              title={archived ? 'No archived locations' : 'Define your story world'}
              description={archived
                ? 'Archived location references will appear here.'
                : 'Create reusable locations with locked architecture, layout, and lighting.'}
              action={!archived ? <LocationFormSheet projectId={projectId} /> : undefined}
            />
          )
        )}

        {activeTab === 'story-bible' && <StoryBiblePage embedded />}
      </div>
    </div>
  )
}
