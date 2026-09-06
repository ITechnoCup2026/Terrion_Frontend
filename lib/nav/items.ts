import {
  CalendarRange,
  ClipboardList,
  Gauge,
  History,
  Home,
  Inbox,
  LayoutDashboard,
  Map,
  ShoppingCart,
  Sprout,
  Store,
  type LucideIcon,
} from 'lucide-react'

import type { UserRole } from '@/lib/auth/roles'

/** Everyone who works inside a cooperative. Not a buyer. */
const COOPERATIVE: readonly UserRole[] = ['kader', 'pengurus']

/**
 * The cooperative app's navigation, as data.
 *
 * It used to be a flat four-item array inside <AppNav>, which is why the
 * sidebar could not say anything about the shape of the product: "Lahan" and
 * "Dashboard" are what you look at, "Pembelian" and "Permintaan" are what you
 * commit the cooperative to, and the catalogue is somebody else's screen you
 * are allowed to visit. An ERP earns its density from that grouping -- a rail
 * of six unlabelled links is a menu, a rail of three named groups is a map of
 * the business.
 *
 * Three things need the same list and previously had none in common: the
 * sidebar, the breadcrumb trail, and the command palette. A destination added
 * here appears in all three.
 */

export type NavItem = {
  href: string
  label: string
  /** One line for the command palette and the collapsed rail's tooltip. */
  hint: string
  icon: LucideIcon
  /**
   * Who this page is actually for. A kader who follows "Permintaan" is
   * redirected straight back to the dashboard by the page's own guard, so
   * showing them the link is an invitation to a dead end -- the guard stays
   * (this is not a security boundary), but the rail stops lying.
   *
   * Absent means everyone, which is why the cooperative's own pages all name
   * COOPERATIVE explicitly. They did not have to while only cooperative users
   * had a rail; the moment a buyer got one, "absent means everyone" pointed
   * them at four screens whose guards bounce them straight to /login.
   */
  roles?: readonly UserRole[]
}

export type NavGroup = {
  /** The rail's section label. Null for the first group, which needs none. */
  label: string
  items: readonly NavItem[]
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Operasi',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        hint: 'Proyeksi panen 12 minggu dan penumpukan',
        icon: LayoutDashboard,
        roles: COOPERATIVE,
      },
      {
        href: '/plots',
        label: 'Lahan',
        hint: 'Daftar lahan koperasi dan jadwal panennya',
        icon: Sprout,
        roles: COOPERATIVE,
      },
      {
        href: '/panen',
        label: 'Riwayat panen',
        hint: 'Panen yang sudah dicatat, dan hasil sebenarnya per lahan',
        icon: History,
        roles: COOPERATIVE,
      },
      {
        href: '/kapasitas',
        label: 'Kapasitas',
        hint: 'Berapa ton per minggu yang sanggup diserap koperasi',
        icon: Gauge,
        roles: COOPERATIVE,
      },
      {
        href: '/rencana',
        label: 'Rencana tanam',
        hint: 'Susunan tanam koperasi untuk musim yang belum dimulai',
        icon: CalendarRange,
        roles: COOPERATIVE,
      },
    ],
  },
  {
    label: 'Perdagangan',
    items: [
      {
        href: '/purchases',
        label: 'Pembelian',
        hint: 'Kebutuhan pupuk musim ini dan pesanan kelompok',
        icon: ShoppingCart,
        roles: COOPERATIVE,
      },
      {
        href: '/requests',
        label: 'Permintaan',
        hint: 'Permintaan pasokan dari pembeli',
        icon: Inbox,
        roles: ['pengurus'],
      },
    ],
  },
  {
    label: 'Publik',
    items: [
      {
        href: '/beranda',
        label: 'Beranda',
        hint: 'Ringkasan permintaan Anda dan panen terdekat',
        icon: Home,
        roles: ['buyer'],
      },
      {
        href: '/catalog',
        label: 'Katalog',
        hint: 'Pasokan koperasi seperti yang dilihat pembeli',
        icon: Store,
        roles: ['buyer'],
      },
      {
        href: '/my-requests',
        label: 'Permintaan saya',
        hint: 'Status pengajuan kontrak pasokan Anda: diterima, menunggu, ditolak',
        icon: ClipboardList,
        roles: ['buyer'],
      },
      {
        href: '/atlas',
        label: 'Atlas',
        hint: 'Peta koperasi se-nusantara',
        icon: Map,
      },
    ],
  },
]

/** The groups a given role may see, with empty groups dropped. */
export function navGroupsFor(role: UserRole): NavGroup[] {
  return NAV_GROUPS
    .map(group => ({ ...group, items: group.items.filter(i => !i.roles || i.roles.includes(role)) }))
    .filter(group => group.items.length > 0)
}

/** Every destination in one flat list — what the command palette searches. */
export function flatNavItems(role: UserRole): NavItem[] {
  return navGroupsFor(role).flatMap(g => g.items)
}
