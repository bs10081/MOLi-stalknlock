import React, { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  activeTab: string
  setActiveTab: (value: string) => void
  variant?: 'default' | 'underline'
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

const useTabsContext = () => {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within Tabs')
  }
  return context
}

interface TabsProps {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  variant?: 'default' | 'underline'
  children: React.ReactNode
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value: controlledValue,
  onValueChange,
  variant = 'default',
  children
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = controlledValue ?? internalValue

  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider
      value={{
        activeTab: value,
        setActiveTab: handleValueChange,
        variant
      }}
    >
      {children}
    </TabsContext.Provider>
  )
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'underline'
}

export const TabsList: React.FC<TabsListProps> = ({
  className,
  variant: propVariant,
  ...props
}) => {
  const { variant } = useTabsContext()
  const finalVariant = propVariant ?? variant

  return (
    <div
      className={cn(
        'flex items-center',
        finalVariant === 'underline' ? 'border-b border-border' : 'gap-2',
        className
      )}
      {...props}
    />
  )
}

interface TabsTabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export const TabsTab: React.FC<TabsTabProps> = ({
  value,
  className,
  children,
  ...props
}) => {
  const { activeTab, setActiveTab, variant } = useTabsContext()
  const isActive = activeTab === value

  if (variant === 'underline') {
    return (
      <button
        type="button"
        onClick={() => setActiveTab(value)}
        className={cn(
          'px-4 py-3 text-sm font-medium transition-colors relative',
          'border-b-2 -mb-px',
          isActive
            ? 'border-accent text-accent'
            : 'border-transparent text-text-secondary hover:text-text-primary',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-md transition-colors',
        isActive
          ? 'bg-bg-card text-text-primary shadow-sm'
          : 'text-text-secondary hover:text-text-primary hover:bg-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface TabsPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const TabsPanel: React.FC<TabsPanelProps> = ({
  value,
  className,
  ...props
}) => {
  const { activeTab } = useTabsContext()

  if (activeTab !== value) {
    return null
  }

  return <div className={cn('mt-6', className)} {...props} />
}
