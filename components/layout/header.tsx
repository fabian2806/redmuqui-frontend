"use client"

import { Bell, Search, User, ChevronDown, LogOut, UserCircle, Settings } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    setMenuOpen(false)
    router.push("/login")
  }

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
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-3 py-1.5 hover:bg-[#F7F7F7]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFD600]">
              <User className="h-4 w-4 text-[#1A1A1A]" />
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-[#1A1A1A]">María Torres</p>
              <p className="text-[10px] text-[#5C5C5C]">Secretaría Ejecutiva</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-[#5C5C5C] transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-lg border border-[#E0E0E0] bg-white shadow-lg">
              {/* User info */}
              <div className="border-b border-[#E0E0E0] px-4 py-3">
                <p className="text-sm font-semibold text-[#1A1A1A]">María Torres</p>
                <p className="text-xs text-[#5C5C5C]">maria.torres@muqui.org</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/usuarios/usr-001"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F7F7F7]"
                >
                  <UserCircle className="h-4 w-4 text-[#5C5C5C]" />
                  Mi perfil
                </Link>
                <Link
                  href="/configuracion"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#1A1A1A] hover:bg-[#F7F7F7]"
                >
                  <Settings className="h-4 w-4 text-[#5C5C5C]" />
                  Configuracion
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-[#E0E0E0] py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#C8102E] hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
