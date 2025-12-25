import React from 'react'

export const Header: React.FC = () => {
  return (
    <header className="bg-text-primary text-white px-6 py-4 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent"></span>
          <span className="font-semibold text-base tracking-wide">MOLi 門禁系統</span>
        </div>
        <div className="text-xs text-gray-300 font-normal">
          Makers' Open Lab for Innovation
        </div>
      </div>
    </header>
  )
}
