import React, { useEffect, useRef } from 'react'
import { Check, Minus } from 'lucide-react'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  indeterminate?: boolean
  disabled?: boolean
  className?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  const handleChange = () => {
    if (!disabled) {
      onChange(!checked)
    }
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        disabled={disabled}
        onClick={handleChange}
        className={`
          flex h-4.5 w-4.5 items-center justify-center rounded-md border
          transition-all duration-150 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${
            checked || indeterminate
              ? 'border-accent bg-accent shadow-[0_8px_24px_-14px_rgba(35,88,245,0.7)]'
              : 'border-input bg-white hover:border-accent/60'
          }
        `}
      >
        {indeterminate ? (
          <Minus className="w-3 h-3 text-white" strokeWidth={3} />
        ) : checked ? (
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        ) : null}
      </button>
    </div>
  )
}
