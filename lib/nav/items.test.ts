import { describe, expect, it } from 'vitest'

import { flatNavItems, navGroupsFor } from './items'

describe('navGroupsFor', () => {
  // Every cooperative page redirects a buyer to /login, so a rail that offers
  // them one is a rail pointing at a dead end. This was latent until buyers
  // got a rail of their own: an item with no `roles` means everyone.
  it('offers a buyer nothing the cooperative owns', () => {
    const hrefs = flatNavItems('buyer').map(i => i.href)
    expect(hrefs).toEqual(['/beranda', '/catalog', '/my-requests', '/atlas'])
  })

  it('gives a buyer one group, so the rail has no section label to print', () => {
    expect(navGroupsFor('buyer')).toHaveLength(1)
  })

  it('keeps the pengurus-only inbox away from a kader', () => {
    expect(flatNavItems('kader').map(i => i.href)).not.toContain('/requests')
    expect(flatNavItems('pengurus').map(i => i.href)).toContain('/requests')
  })

  it('still gives the cooperative its own screens', () => {
    expect(flatNavItems('pengurus').map(i => i.href)).toEqual(
      ['/dashboard', '/plots', '/panen', '/kapasitas', '/rencana', '/purchases', '/requests', '/atlas'],
    )
  })
})
