import { Home, Users, UserCheck, CreditCard, FileText, Shield, DoorOpen, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  href: string
  children?: NavItem[]
}

export interface NavGroup {
  title?: string
  items: NavItem[]
}

export const navigation: NavGroup[] = [
  {
    items: [
      {
        id: 'overview',
        label: '總覽',
        icon: Home,
        href: '/dashboard'
      }
    ]
  },
  {
    title: '存取控制',
    items: [
      {
        id: 'users',
        label: '使用者管理',
        icon: Users,
        href: '/dashboard/users',
        children: [
          {
            id: 'personnel',
            label: '人員',
            icon: UserCheck,
            href: '/dashboard/personnel'
          },
          {
            id: 'cards',
            label: '卡片管理',
            icon: CreditCard,
            href: '/dashboard/cards'
          }
        ]
      },
      {
        id: 'logs',
        label: '存取記錄',
        icon: FileText,
        href: '/dashboard/logs'
      }
    ]
  },
  {
    title: '系統管理',
    items: [
      {
        id: 'admins',
        label: '管理員',
        icon: Shield,
        href: '/dashboard/admins'
      },
      {
        id: 'door',
        label: '門禁控制',
        icon: DoorOpen,
        href: '/dashboard/door'
      },
      {
        id: 'settings',
        label: '系統設定',
        icon: Settings,
        href: '/dashboard/settings'
      }
    ]
  }
]
