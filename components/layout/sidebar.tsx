"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Map as MapaIcon,
  Mountain,
  Settings,
  Users,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cobertura", label: "Mapa Territorial", icon: MapaIcon, permiso: "REPORTES_READ" },
  { href: "/proyectos", label: "Proyectos", icon: FolderKanban, permiso: "PROYECTOS_READ" },
  { href: "/documentos", label: "Documentos e Informes", icon: FileText, permiso: "DOCUMENTOS_READ" },
  { href: "/reportes", label: "Reportes", icon: BarChart3, permiso: "REPORTES_READ" },
  { href: "/usuarios", label: "Usuarios y Permisos", icon: Users, permiso: "USUARIOS_READ" },
  { href: "/configuracion", label: "Configuracion", icon: Settings, permiso: "CATALOGOS_MANAGE" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { hasPermission, loading } = useAuth()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const visibleItems = navItems.filter(
    (item) => !item.permiso || (!loading && hasPermission(item.permiso)),
  )

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-[#E0E0E0] bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-[#E0E0E0] px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD600]">
              <Mountain className="h-5 w-5 text-[#1A1A1A]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Muqui
              </span>
              <span className="text-[10px] font-medium text-[#5C5C5C]">
                Plataforma
              </span>
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD600]">
            <Mountain className="h-5 w-5 text-[#1A1A1A]" />
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-[#FFD600] text-[#1A1A1A]"
                  : "text-[#5C5C5C] hover:bg-[#F7F7F7] hover:text-[#1A1A1A]",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-[#1A1A1A]")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#E0E0E0] bg-white text-[#5C5C5C] shadow-sm hover:bg-[#F7F7F7]"
        aria-label={collapsed ? "Expandir menu" : "Contraer menu"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div className="absolute bottom-0 left-0 right-0 border-t border-[#E0E0E0] p-4">
        {!collapsed && (
          <div className="text-center text-xs text-[#5C5C5C]">
            <p>Red Muqui &copy; 2025</p>
            <p className="mt-1">Desde 2003 defendiendo derechos</p>
          </div>
        )}
      </div>
    </aside>
  )
}
