"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { MapaTerritorial } from "@/components/cobertura/mapa-territorial"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import {
  obtenerCoberturaTerritorial,
  type CoberturaTerritorial,
} from "@/lib/reportes"

export default function CoberturaPage() {
  const { loading: authLoading } = useAuth()

  const [cobertura, setCobertura] = useState<CoberturaTerritorial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    async function cargar() {
      setLoading(true)
      setError(null)
      try {
        const data = await obtenerCoberturaTerritorial("DEPARTAMENTO")
        if (!cancelled) setCobertura(data)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar la cobertura territorial",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    cargar()
    return () => {
      cancelled = true
    }
  }, [authLoading])

  return (
    <AppLayout title="Mapa Territorial">
      <PermissionGuard permiso="REPORTES_READ">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Mapa Territorial</h1>
            <p className="text-sm text-[#5C5C5C]">
              Presencia de la red por departamento: proyectos, presupuesto,
              beneficiarios e instituciones.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]">
              {error}
            </div>
          )}

          <MapaTerritorial cobertura={cobertura} loading={loading} />
        </div>
      </PermissionGuard>
    </AppLayout>
  )
}
