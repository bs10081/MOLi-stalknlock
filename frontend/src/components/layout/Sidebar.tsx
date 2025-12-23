import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigation, type NavItem } from '@/config/navigation'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation()
  const isOnOverview = location.pathname === '/dashboard'
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

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-60 bg-white border-r border-border',
          'transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo/Account Selector */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span className="font-semibold text-base">MOLi 門禁</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navigation.map((group, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              {/* 第一組（總覽）特殊處理 */}
              {idx === 0 ? (
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                        isOnOverview
                          ? 'bg-gray-100 text-text-primary font-medium hover:bg-gray-100'
                          : 'bg-gray-50 text-text-secondary font-normal hover:bg-gray-100'
                      )}
                    >
                      {isOnOverview ? (
                        <>
                          <item.icon className="w-5 h-5 shrink-0 text-text-primary" />
                          <span>{item.label}</span>
                        </>
                      ) : (
                        <>
                          <ArrowLeft className="w-5 h-5 shrink-0 text-text-secondary" />
                          <span>返回{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              ) : (
                <>
                  {group.title && (
                    <h3 className="px-3 mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      {group.title}
                    </h3>
                  )}
                  <div className="space-y-1">
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
        <div className="border-t border-border p-3 shrink-0">
          <p className="text-xs text-text-secondary text-center">
            Makers' Open Lab
          </p>
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
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
            'hover:bg-gray-50 text-text-secondary font-normal'
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
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
              'hover:bg-gray-50',
              isActive
                ? 'bg-gray-100 text-text-primary font-medium'
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
        <div className="mt-1 ml-3 pl-3 border-l-2 border-gray-200 space-y-1">
          {item.children!.map((child) => {
            const ChildIcon = child.icon
            return (
              <NavLink
                key={child.id}
                to={child.href}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    'hover:bg-gray-50',
                    isActive
                      ? 'bg-gray-100 text-text-primary font-normal'
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
