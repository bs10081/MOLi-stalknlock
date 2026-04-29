import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X, ArrowLeft, ChevronDown, ChevronRight, PanelLeftClose } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigation, type NavItem } from '@/config/navigation'
import { useAppVersion } from '@/providers/AppVersionProvider'
import { formatVersionLabel } from '@/lib/version'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const isOnOverview = location.pathname === '/dashboard'
  const { versionInfo } = useAppVersion()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // Auto-expand parent if child is active
  useEffect(() => {
    const newExpanded = new Set<string>()
    navigation.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children) {
          const hasActiveChild = item.children.some((child) => child.href === location.pathname)
          if (hasActiveChild || item.href === location.pathname) {
            newExpanded.add(item.id)
          }
        }
      })
    })
    setExpandedItems(newExpanded)
  }, [location.pathname])

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - 保持 fixed 定位 */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-screen w-72 flex-col border-r border-border/70 bg-white',
          'transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo/Account Selector */}
        <div className="shrink-0 border-b border-border/60 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-text-primary text-sm font-semibold text-white shadow-[0_16px_30px_-20px_rgba(17,17,17,0.38)]">
                M
              </span>
              <div>
                <p className="font-heading text-sm font-semibold text-text-primary">Makers' Open Lab for Innovation</p>
                <p className="text-xs text-text-secondary">Door Access System</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-text-secondary transition-colors hover:bg-muted lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-muted/50 px-3 py-2 text-xs text-text-secondary">
            <span>{formatVersionLabel(versionInfo)}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-primary">
              <PanelLeftClose className="h-3.5 w-3.5" />
              Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          {navigation.map((group, idx) => (
            <div key={idx} className="mb-7 last:mb-0">
              {/* 第一組（總覽）特殊處理 */}
              {idx === 0 ? (
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors',
                        isOnOverview
                          ? 'bg-text-primary text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)]'
                          : 'bg-muted/62 text-text-secondary hover:bg-muted'
                      )}
                    >
                      {isOnOverview ? (
                        <>
                          <item.icon className="w-5 h-5 shrink-0" />
                          <span>{item.label}</span>
                        </>
                      ) : (
                        <>
                          <ArrowLeft className="w-5 h-5 shrink-0" />
                          <span>返回{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              ) : (
                <>
                  {group.title && (
                    <h3 className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary">
                      {group.title}
                    </h3>
                  )}
                  <div className="space-y-1.5">
                    {group.items.map((item) => (
                      <NavItemWithChildren
                        key={item.id}
                        item={item}
                        expanded={expandedItems.has(item.id)}
                        onToggle={() => toggleExpand(item.id)}
                        onClose={onClose}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/60 px-5 py-4">
          <p className="text-xs font-medium text-text-primary">Makers' Open Lab for Innovation</p>
          <p className="mt-1 text-xs text-text-secondary">RFID access, card binding, audit logs, remote unlock.</p>
        </div>
      </aside>
    </>
  )
}

interface NavItemWithChildrenProps {
  item: NavItem
  expanded: boolean
  onToggle: () => void
  onClose: () => void
}

const NavItemWithChildren: React.FC<NavItemWithChildrenProps> = ({ item, expanded, onToggle, onClose }) => {
  const Icon = item.icon
  const hasChildren = item.children && item.children.length > 0

  return (
    <div>
      {/* Parent Item */}
      {hasChildren ? (
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-muted/62'
          )}
        >
          <Icon className="w-5 h-5 shrink-0 text-text-secondary" />
          <span className="flex-1 text-left">{item.label}</span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 shrink-0 text-text-secondary" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-text-secondary" />
          )}
        </button>
      ) : (
        <NavLink
          to={item.href}
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors hover:bg-muted/62',
              isActive
                ? 'bg-white text-text-primary shadow-[0_14px_36px_-28px_rgba(15,23,42,0.45)] ring-1 ring-border/70'
                : 'text-text-secondary font-normal'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-text-primary' : 'text-text-secondary')} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      )}

      {/* Children Items */}
      {hasChildren && expanded && (
        <div className="mt-2 ml-4 space-y-1 border-l border-border/70 pl-4">
          {item.children!.map((child) => {
            const ChildIcon = child.icon
            return (
              <NavLink
                key={child.id}
                to={child.href}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-muted/60',
                    isActive
                      ? 'bg-white text-text-primary shadow-[0_14px_32px_-26px_rgba(15,23,42,0.35)] ring-1 ring-border/70'
                      : 'text-text-secondary font-normal'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <ChildIcon className={cn('w-4 h-4 shrink-0', isActive ? 'text-text-primary' : 'text-text-secondary')} />
                    <span>{child.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}
