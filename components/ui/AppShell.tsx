'use client'

import { Building2, UserRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { AccountMenu } from '@/components/auth/AccountMenu'
import { CommandPalette, useCommandShortcut } from '@/components/ui/CommandPalette'
import { ImmersiveChromeProvider } from '@/components/ui/ImmersiveChrome'
import { Logo } from '@/components/ui/Logo'
import { MobileNav } from '@/components/ui/MobileNav'
import { Sidebar } from '@/components/ui/Sidebar'
import { Topbar } from '@/components/ui/Topbar'
import { homeFor } from '@/lib/auth/display'
import type { UserRole } from '@/lib/auth/roles'
import { isActivePath } from '@/lib/nav/active'
import { isImmersiveRoute } from '@/lib/nav/immersive'
import { navGroupsFor } from '@/lib/nav/items'
import { cn } from '@/lib/utils'

/**
 * The cooperative-side frame.
 *
 * Two shapes, chosen by route:
 *
 *   document   the ordinary pages. Rail, top bar, content. The shell is
 *              exactly the viewport and the CONTENT scrolls, not the page --
 *              which is what removes the outer scrollbar that used to sit
 *              beside every screen.
 *
 *   immersive  the farm. The canvas gets the entire viewport and the chrome
 *              floats over it as detached cards. The plot page used to ask for
 *              h-[calc(100dvh-3.5rem)] from inside a padded <main> under a
 *              sticky header, so it was a letterboxed box in a scrolling page
 *              -- the farm rendered 512x448 in the middle of an empty screen.
 *
 * A client component because the choice needs the current path. The server
 * layout above it still does the auth check and the cooperative lookup, and
 * passes the results down: none of this is a security boundary, RLS is.
 *
 * Padding is deliberately NOT applied here. Every page owns its own, because a
 * layout that pads its children cannot have a child that fills the screen --
 * which is the bug this component exists to fix.
 */
/**
 * Whose workspace this frame belongs to: a cooperative for a kader or
 * pengurus, the buyer themselves for a pembeli, and null when the account has
 * no identity to print at all.
 */
export type ShellWorkspace = {
  name: string
  detail: string | null
  /**
   * What the top line names, which decides the glyph beside it.
   *
   * The buyer's rail used to print the company alone under a building — no
   * name anywhere in the column, and nothing at all for a buyer who signed up
   * without naming one. Their side reads the other way round: the person is
   * who the account is, and the company is where they buy for. A building
   * glyph over a person's surname is the kind of small wrongness that makes a
   * screen feel machine-assembled, so the two cases carry their own mark.
   */
  kind?: 'organisation' | 'person'
} | null

/** Where the rail's width is remembered between visits. */
const COLLAPSE_KEY = 'terrion:nav-collapsed'

export function AppShell({
  workspace, userName, role, children,
}: {
  workspace: ShellWorkspace
  userName: string
  role: UserRole
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const immersive = isImmersiveRoute(pathname)
  const groups = navGroupsFor(role)

  const [searchOpen, setSearchOpen] = useState(false)

  // Starts expanded on both server and client, then adopts the stored
  // preference after mount. Reading localStorage during render would make the
  // server markup mismatch the hydration pass.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true)
    } catch {
      /* storage blocked by privacy settings */
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed(current => {
      const next = !current
      try { window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* see above */ }
      return next
    })
  }

  const openSearch = useCallback(() => setSearchOpen(true), [])
  useCommandShortcut(openSearch)

  // Header content rendered inside the sidebar rail.
  //
  // Kept as two named blocks rather than one conditional, because the rail may
  // be collapsed while the immersive panel still wants the full card: that
  // panel is a column of its own and has the room, and a lone glyph at the top
  // of it would say nothing about whose farm is on screen.
  // Where the logo goes: whichever screen this role lands on after signing in.
  const home = homeFor(role)

  const collapsedWorkspace = (
    <div className="flex justify-center" title={workspace?.name ?? 'Terrion'}>
      <Link href={home} aria-label="Kembali ke halaman utama" className="interactive">
        <Logo size={24} withWordmark={false} />
      </Link>
    </div>
  )

  const expandedWorkspace = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center px-1 py-0.5">
        {/* The mark is the way back. Somebody three levels into a plot has no
            other single-click route to where they started, and reaching for a
            logo is the habit every other product has already taught them. */}
        <Link href={home} aria-label="Kembali ke halaman utama" className="interactive">
          <Logo size={26} withWordmark={true} />
        </Link>
      </div>
      {workspace && (
        <div className="min-w-0 rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5 leading-tight">
          <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
            {workspace.kind === 'person' ? (
              <UserRound aria-hidden className="size-3.5 shrink-0 text-[var(--terrion-green-700)]" />
            ) : (
              <Building2 aria-hidden className="size-3.5 shrink-0 text-[var(--terrion-green-700)]" />
            )}
            <span className="truncate">{workspace.name}</span>
          </div>
          {workspace.detail && (
            <p className="mt-1 truncate text-[0.6875rem] text-muted-foreground pl-5">
              {workspace.detail}
            </p>
          )}
        </div>
      )}
    </div>
  )

  const workspaceBlock = collapsed ? collapsedWorkspace : expandedWorkspace

  // One account control, in one place, on both sides of the product. It used
  // to be three: a row in the rail's foot, a stacked pair in the collapsed
  // rail, and a bare glyph in the phone's top bar -- three arrangements of the
  // same two facts, none of which matched what a buyer sees.
  // A buyer signed out of this frame belongs back on the public site; a kader
  // has nowhere to be but the login screen.
  const signOutTo = role === 'buyer' ? '/' : '/login'

  // Which line of the identity block is the organisation depends on what the
  // block is naming. On the cooperative side it is the top line; on the
  // buyer's it is the second, because the top line is the buyer. Reading
  // `workspace.name` unconditionally, as this did, made the menu introduce a
  // pembeli as "Pembeli · Budi Santoso".
  const organisation = workspace
    ? (workspace.kind === 'person' ? workspace.detail : workspace.name)
    : null

  const account = (
    <AccountMenu
      fullName={userName}
      organisation={organisation}
      role={role}
      signOutTo={signOutTo}
      hideNavItems={true}
    />
  )

  const palette = (
    <CommandPalette groups={groups} open={searchOpen} onOpenChange={setSearchOpen} />
  )

  if (immersive) {
    return (
      // fixed, not h-dvh: this has to escape any scroll container above it and
      // sit exactly on the viewport, with nothing able to add a scrollbar.
      //
      // The chrome no longer floats over the picture in three detached cards.
      // It is handed to the page instead, which seats it at the top of its own
      // panel -- so a farm and the Atlas are laid out the same way, and the
      // canvas is never partly covered by a control the reader cannot move.
      <div className="fixed inset-0 overflow-hidden">
        <ImmersiveChromeProvider
          value={{
            workspace: workspaceBlock,
            nav: <ImmersiveNav groups={groups} pathname={pathname} />,
            account,
          }}
        >
          {children}
        </ImmersiveChromeProvider>
        {palette}
      </div>
    )
  }

  return (
    // h-dvh with the scroll inside: the page itself never scrolls, so there is
    // no outer scrollbar and a child asking for full height gets it.
    // print:h-auto, because the RDKK form is several pages tall on paper.
    <div className="flex h-dvh overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar groups={groups} collapsed={collapsed} header={workspaceBlock} />

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <Topbar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onOpenSearch={openSearch}
          account={account}
          role={role}
        />

        <main className="min-h-0 flex-1 overflow-y-auto print:overflow-visible">
          {children}
        </main>

        <MobileNav groups={groups} />
      </div>

      {palette}
    </div>
  )
}

/**
 * Navigation inside an immersive page's panel.
 *
 * A wrapping row of glyphs rather than <Sidebar>, which is a full-height
 * column with its own border and scroller -- inside a panel that already has
 * both, that would be a second rail nested in the first.
 */
function ImmersiveNav({
  groups, pathname,
}: {
  groups: ReturnType<typeof navGroupsFor>
  pathname: string
}) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-3 py-2"
    >
      {groups.flatMap(group => group.items).map(item => {
        const active = isActivePath(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'interactive flex size-8 items-center justify-center rounded-md',
              active
                ? 'bg-secondary text-primary'
                : 'text-[var(--terrion-ink-faint)] hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon aria-hidden className="size-4" />
          </Link>
        )
      })}
    </nav>
  )
}
