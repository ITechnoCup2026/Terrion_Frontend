import type { UserRole } from '@/lib/auth/roles'
import { isActivePath } from '@/lib/nav/active'
import { NAV_GROUPS, navGroupsFor } from '@/lib/nav/items'

/**
 * Where you are, as a trail.
 *
 * The shell used to say nothing about location beyond a highlighted rail item,
 * which is fine while every page is one click deep and stops being fine the
 * moment /plots/new, /plots/<id> and /purchases/rdkk exist -- three screens
 * whose only clue about their parent was the browser's back button. An ERP
 * says the section, the module and the record; this says the same three.
 *
 * Derived from the pathname rather than passed down, so no page has to
 * remember to declare it and none can declare it wrongly. The cost is that a
 * record's own name is not available here -- the URL carries an id, not a plot
 * name -- so the leaf is a kind ("Detail lahan"), and the page's own <h1>
 * remains the place the name is printed.
 */
export type Crumb = {
  label: string
  /** Absent on the last crumb: you are already there. */
  href?: string
}

/**
 * Named children, keyed by full path. A leaf not listed here is a record --
 * `/plots/8f2c` -- and gets the kind name from LEAF_KIND instead.
 */
const NAMED_LEAF: Record<string, string> = {
  '/plots/new': 'Daftarkan lahan',
  '/rencana/susun': 'Susun rencana',
  '/plots/demo': 'Demo lahan',
  '/purchases/rdkk': 'Ekspor RDKK',
}

/** What a dynamic child of a section is, when its own name is not in the URL. */
const LEAF_KIND: Record<string, string> = {
  '/plots': 'Detail lahan',
  '/rencana': 'Detail rencana',
  '/catalog': 'Detail pasokan',
  '/my-requests': 'Permintaan saya',
}

/**
 * @param role Whose navigation this is. A buyer sees one group, and a section
 *   label above the only section names nothing — so the trail drops it, the
 *   same rule the rail follows. Omitted, every group is in scope.
 */
export function breadcrumbsFor(pathname: string, role?: UserRole): Crumb[] {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const groups = role ? navGroupsFor(role) : NAV_GROUPS

  for (const group of groups) {
    for (const item of group.items) {
      if (!isActivePath(path, item.href)) continue

      const trail: Crumb[] = groups.length > 1 ? [{ label: group.label }] : []

      // The section itself is the last crumb when you are standing on it, and
      // a link back to it when you are not.
      if (path === item.href) {
        trail.push({ label: item.label })
        return trail
      }

      trail.push({ label: item.label, href: item.href })
      trail.push({ label: NAMED_LEAF[path] ?? LEAF_KIND[item.href] ?? 'Detail' })
      return trail
    }
  }

  return []
}
