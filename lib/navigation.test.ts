import { describe, expect, it } from 'vitest'
import { getWorkspaceRoute } from '@/lib/navigation'

describe('getWorkspaceRoute', () => {
  it.each([
    ['/projects/project-id/overview', 'overview'],
    ['/projects/project-id/story-studio', 'story-studio'],
    ['/projects/project-id/episodes', 'episodes'],
    ['/projects/project-id/episodes/episode-id', 'episodes'],
    ['/projects/project-id/production', 'production'],
    ['/projects/project-id/production/episodes/episode-id', 'production'],
    ['/projects/project-id/settings', 'settings'],
  ] as const)('resolves %s to %s', (pathname, expected) => {
    expect(getWorkspaceRoute(pathname)).toBe(expected)
  })

  it('falls back to overview without validating project identifiers', () => {
    expect(getWorkspaceRoute('/projects/not-a-uuid/unknown/nested')).toBe('overview')
  })
})
