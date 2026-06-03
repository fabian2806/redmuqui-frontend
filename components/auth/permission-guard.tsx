"use client"

import { ShieldAlert } from "lucide-react"
import type { ReactNode } from "react"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/hooks/useAuth"

interface PermissionGuardProps {
  permiso: string
  children: ReactNode
}

export function PermissionGuard({ permiso, children }: PermissionGuardProps) {
  const { loading, hasPermission } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white p-6 text-sm text-[#5C5C5C]">
        <Spinner />
        Cargando permisos...
      </div>
    )
  }

  if (!hasPermission(permiso)) {
    return (
      <div className="rounded-lg border border-[#E0E0E0] bg-white p-10 text-center shadow-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-[#C8102E]" />
        <p className="mt-4 text-lg font-semibold text-[#1A1A1A]">Acceso restringido</p>
        <p className="mt-2 text-sm text-[#5C5C5C]">
          Tu rol no tiene permisos para ver esta informacion.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
