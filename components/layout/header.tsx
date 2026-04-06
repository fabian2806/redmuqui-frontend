"use client"

import { Bell, Search, User, ChevronDown } from "lucide-react"
import { useState } from "react"

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E0E0E0] bg-white px-6">
      {/* Title */}
      <div>
        {title && (
          <h1 className="text-lg font-bold uppercase tracking-wide text-[#1A1A1A]">
            {title}
          </h1>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C5C5C]" />
          <input
            type="text"
            placeholder="Buscar proyectos, informes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-64 rounded-lg border border-[#E0E0E0] bg-[#F7F7F7] pl-9 pr-4 text-sm text-[#1A1A1A] placeholder:text-[#5C5C5C] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
          />
        </div>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E0E0E0] bg-white text-[#5C5C5C] hover:bg-[#F7F7F7]">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C8102E] text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* User menu */}
        <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-3 py-1.5 hover:bg-[#F7F7F7]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFD600]">
            <User className="h-4 w-4 text-[#1A1A1A]" />
          </div>
          <div className="text-left">
            <p className="text-xs font-medium text-[#1A1A1A]">María Torres</p>
            <p className="text-[10px] text-[#5C5C5C]">Secretaría Ejecutiva</p>
          </div>
          <ChevronDown className="h-4 w-4 text-[#5C5C5C]" />
        </button>
      </div>
    </header>
  )
}
