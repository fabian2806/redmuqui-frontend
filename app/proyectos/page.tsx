"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Plus,
  Search,
  X,
} from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { ProgressBar } from "@/components/ui/progress-bar"
import {
  MacroregionBadge,
  StatusBadge,
  TypeBadge,
} from "@/components/ui/status-badge"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import type {
  EjeTematico,
  EstadoProyecto,
  Institucion,
  Macroregion,
  PageResponse,
  ProyectoResponse,
} from "@/lib/types"

const ESTADOS: Array<{ value: EstadoProyecto; label: string }> = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_CURSO", label: "En curso" },
  { value: "FINALIZADO", label: "Finalizado" },
]

const ITEMS_PER_PAGE = 8

function nombreCompletoResponsable(proyecto: ProyectoResponse): string {
  const responsable = proyecto.responsablePrincipal
  if (!responsable) return "Sin responsable"
  return `${responsable.nombres} ${responsable.apellidos}`.trim()
}

function macroregionesProyecto(proyecto: ProyectoResponse) {
  if (proyecto.macroregiones?.length) return proyecto.macroregiones
  if (proyecto.idMacroregion && proyecto.nombreMacroregion) {
    return [{ id: proyecto.idMacroregion, nombre: proyecto.nombreMacroregion }]
  }
  return []
}

function formatDate(date: string | null): string {
  if (!date) return "-"
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-PE")
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "-"
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(value)
}

function buildProyectosPath(params: {
  page: number
  q: string
  estado: EstadoProyecto | ""
  idMacroregion: string
  idEjeTematico: string
  idInstitucion: string
  anio: string
}) {
  const search = new URLSearchParams({
    page: String(params.page - 1),
    size: String(ITEMS_PER_PAGE),
    sort: "fechaCreacion,desc",
  })

  if (params.q.trim()) search.set("q", params.q.trim())
  if (params.estado) search.set("estado", params.estado)
  if (params.idMacroregion) search.set("idMacroregion", params.idMacroregion)
  if (params.idEjeTematico) search.set("idEjeTematico", params.idEjeTematico)
  if (params.idInstitucion) search.set("idInstitucion", params.idInstitucion)
  if (params.anio.trim()) search.set("anio", params.anio.trim())

  return `/proyectos?${search.toString()}`
}

export default function ProyectosPage() {
  const { loading: authLoading, hasPermission } = useAuth()
  const puedeVerProyectos = hasPermission("PROYECTOS_READ")
  const puedeCrearProyectos = hasPermission("PROYECTOS_CREATE")

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMacroregion, setSelectedMacroregion] = useState("")
  const [selectedEje, setSelectedEje] = useState("")
  const [selectedEstado, setSelectedEstado] = useState<EstadoProyecto | "">("")
  const [selectedInstitucion, setSelectedInstitucion] = useState("")
  const [selectedAnio, setSelectedAnio] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const [macroregiones, setMacroregiones] = useState<Macroregion[]>([])
  const [ejesTematicos, setEjesTematicos] = useState<EjeTematico[]>([])
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [proyectosPage, setProyectosPage] =
    useState<PageResponse<ProyectoResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [catalogosLoading, setCatalogosLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !puedeVerProyectos) return

    let cancelled = false

    async function loadCatalogos() {
      setCatalogosLoading(true)
      try {
        const [macroregionesData, ejesData, institucionesData] = await Promise.all([
          api.get<Macroregion[]>("/macroregiones"),
          api.get<EjeTematico[]>("/ejes-tematicos"),
          api.get<Institucion[]>("/instituciones"),
        ])
        if (!cancelled) {
          setMacroregiones(macroregionesData)
          setEjesTematicos(ejesData)
          setInstituciones(institucionesData)
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los catálogos"
          setError(message)
        }
      } finally {
        if (!cancelled) setCatalogosLoading(false)
      }
    }

    loadCatalogos()
    return () => {
      cancelled = true
    }
  }, [authLoading, puedeVerProyectos])

  useEffect(() => {
    if (authLoading || !puedeVerProyectos) return

    let cancelled = false

    async function loadProyectos() {
      setLoading(true)
      setError(null)

      try {
        const path = buildProyectosPath({
          page: currentPage,
          q: searchQuery,
          estado: selectedEstado,
          idMacroregion: selectedMacroregion,
          idEjeTematico: selectedEje,
          idInstitucion: selectedInstitucion,
          anio: selectedAnio,
        })
        const data = await api.get<PageResponse<ProyectoResponse>>(path)
        if (!cancelled) setProyectosPage(data)
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.message
              : "No se pudieron cargar los proyectos"
          setError(message)
          setProyectosPage(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProyectos()
    return () => {
      cancelled = true
    }
  }, [
    currentPage,
    searchQuery,
    selectedEje,
    selectedEstado,
    selectedMacroregion,
    selectedInstitucion,
    selectedAnio,
    authLoading,
    puedeVerProyectos,
  ])

  const proyectos = proyectosPage?.content ?? []
  const totalPages = proyectosPage?.totalPages ?? 0
  const totalElements = proyectosPage?.totalElements ?? 0
  const hasActiveFilters =
    searchQuery || selectedMacroregion || selectedEje || selectedEstado ||
    selectedInstitucion || selectedAnio

  const pageStart = useMemo(() => {
    if (!proyectosPage || totalElements === 0) return 0
    return proyectosPage.page * proyectosPage.size + 1
  }, [proyectosPage, totalElements])

  const pageEnd = useMemo(() => {
    if (!proyectosPage || totalElements === 0) return 0
    return Math.min((proyectosPage.page + 1) * proyectosPage.size, totalElements)
  }, [proyectosPage, totalElements])

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedMacroregion("")
    setSelectedEje("")
    setSelectedEstado("")
    setSelectedInstitucion("")
    setSelectedAnio("")
    setCurrentPage(1)
  }

  return (
    <AppLayout title="Proyectos">
      <PermissionGuard permiso="PROYECTOS_READ">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Proyectos</h1>
            <p className="text-sm text-[#5C5C5C]">
              Gestiona y da seguimiento a los proyectos institucionales
            </p>
          </div>
          {puedeCrearProyectos && (
            <Link
              href="/proyectos/nuevo"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#FFD600] px-4 py-2.5 text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#C9A42B]"
            >
              <Plus className="h-4 w-4" />
              Nuevo Proyecto
            </Link>
          )}
        </div>

        <div className="rounded-lg border border-[#E0E0E0] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C5C5C]" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-10 w-full rounded-lg border border-[#E0E0E0] bg-[#F7F7F7] pl-10 pr-4 text-sm text-[#1A1A1A] placeholder:text-[#5C5C5C] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
              />
            </div>

            <select
              value={selectedMacroregion}
              onChange={(e) => {
                setSelectedMacroregion(e.target.value)
                setCurrentPage(1)
              }}
              disabled={catalogosLoading}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:opacity-60"
            >
              <option value="">Macroregión</option>
              {macroregiones.map((macroregion) => (
                <option key={macroregion.id} value={macroregion.id}>
                  {macroregion.nombre}
                </option>
              ))}
            </select>

            <select
              value={selectedEje}
              onChange={(e) => {
                setSelectedEje(e.target.value)
                setCurrentPage(1)
              }}
              disabled={catalogosLoading}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:opacity-60"
            >
              <option value="">Eje temático</option>
              {ejesTematicos.map((eje) => (
                <option key={eje.id} value={eje.id}>
                  {eje.nombre}
                </option>
              ))}
            </select>

            <select
              value={selectedEstado}
              onChange={(e) => {
                setSelectedEstado(e.target.value as EstadoProyecto | "")
                setCurrentPage(1)
              }}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
            >
              <option value="">Estado</option>
              {ESTADOS.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>

            <select
              value={selectedInstitucion}
              onChange={(e) => {
                setSelectedInstitucion(e.target.value)
                setCurrentPage(1)
              }}
              disabled={catalogosLoading}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:opacity-60"
            >
              <option value="">Institución</option>
              {instituciones.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.nombre}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="2000"
              max="2099"
              placeholder="Año inicio"
              value={selectedAnio}
              onChange={(e) => {
                setSelectedAnio(e.target.value)
                setCurrentPage(1)
              }}
              className="h-10 w-28 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] placeholder:text-[#5C5C5C] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
            />

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm text-[#5C5C5C] hover:bg-[#F7F7F7]"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-[#5C5C5C]">
            <Filter className="h-3.5 w-3.5" />
            <span>
              {loading
                ? "Cargando proyectos..."
                : `${totalElements} proyecto${totalElements !== 1 ? "s" : ""} encontrado${totalElements !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E0E0E0] bg-[#FAFAFA]">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Proyecto
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Macroregiones
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Eje Temático
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Responsable
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Periodo
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Presupuesto
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Avance
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-[#5C5C5C]" colSpan={9}>
                      Cargando proyectos...
                    </td>
                  </tr>
                )}

                {!loading && proyectos.length === 0 && (
                  <tr>
                    <td className="px-5 py-10 text-center text-sm text-[#5C5C5C]" colSpan={9}>
                      No hay proyectos para los filtros seleccionados.
                    </td>
                  </tr>
                )}

                {!loading &&
                  proyectos.map((proyecto, index) => (
                    <tr
                      key={proyecto.id}
                      className={`border-b border-[#E0E0E0] transition-colors hover:bg-[#FFFDE7] ${
                        index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <Link href={`/proyectos/${proyecto.id}`} className="block">
                          <p className="text-sm font-medium text-[#1A1A1A] hover:text-[#C9A42B]">
                            {proyecto.nombre}
                          </p>
                          <p className="text-xs text-[#5C5C5C]">
                            {proyecto.codigoInterno}
                          </p>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        {macroregionesProyecto(proyecto).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {macroregionesProyecto(proyecto).map((macroregion) => (
                              <MacroregionBadge
                                key={macroregion.id}
                                macroregion={macroregion.nombre}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-[#5C5C5C]">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {proyecto.nombreEjeTematico ? (
                          <TypeBadge tipo={proyecto.nombreEjeTematico} />
                        ) : (
                          <span className="text-sm text-[#5C5C5C]">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#1A1A1A]">
                          {nombreCompletoResponsable(proyecto)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-[#5C5C5C]">
                          <p>{formatDate(proyecto.fechaInicio)}</p>
                          <p>{formatDate(proyecto.fechaFinEstimada)}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#1A1A1A]">
                          {formatCurrency(proyecto.presupuesto)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-24">
                          <ProgressBar
                            value={proyecto.porcentajeAvance ?? 0}
                            size="sm"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge estado={proyecto.estado} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/proyectos/${proyecto.id}`}
                            className="rounded-md p-2 text-[#5C5C5C] hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-[#E0E0E0] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#5C5C5C]">
                Mostrando {pageStart} - {pageEnd} de {totalElements}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1 || loading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      disabled={loading}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                        page === currentPage
                          ? "bg-[#FFD600] text-[#1A1A1A]"
                          : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages || loading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </PermissionGuard>
    </AppLayout>
  )
}
