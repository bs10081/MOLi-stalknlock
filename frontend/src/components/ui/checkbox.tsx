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
          w-4 h-4 rounded border flex items-center justify-center
          transition-all duration-150 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          ${
            checked || indeterminate
              ? 'bg-accent border-accent'
              : 'bg-white border-gray-300 hover:border-gray-400'
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
