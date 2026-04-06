"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { StatusBadge, MacroregionBadge, TypeBadge } from "@/components/ui/status-badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import { proyectos, type Macroregion, type EjeTematico, type EstadoProyecto } from "@/lib/data"
import { 
  Plus, 
  Search, 
  Eye, 
  Pencil, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from "lucide-react"
import Link from "next/link"

const macroregiones: Macroregion[] = ["Norte", "Centro", "Sur"]
const ejesTematicos: EjeTematico[] = [
  "Agua y Territorio",
  "Derechos Humanos",
  "Minería Artesanal (MAPE)",
  "Vigilancia Ambiental",
  "Incidencia Política",
  "Fortalecimiento Organizacional"
]
const estados: EstadoProyecto[] = ["Activo", "En riesgo", "Cerrado", "Suspendido"]
const años = ["2024", "2025", "2026"]

export default function ProyectosPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMacroregion, setSelectedMacroregion] = useState<Macroregion | "">("")
  const [selectedEje, setSelectedEje] = useState<EjeTematico | "">("")
  const [selectedEstado, setSelectedEstado] = useState<EstadoProyecto | "">("")
  const [selectedAño, setSelectedAño] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Filter projects
  const filteredProyectos = proyectos.filter(proyecto => {
    const matchesSearch = proyecto.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proyecto.codigo.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMacroregion = !selectedMacroregion || proyecto.macroregion === selectedMacroregion
    const matchesEje = !selectedEje || proyecto.ejeTematico === selectedEje
    const matchesEstado = !selectedEstado || proyecto.estado === selectedEstado
    const matchesAño = !selectedAño || proyecto.fechaInicio.startsWith(selectedAño)
    
    return matchesSearch && matchesMacroregion && matchesEje && matchesEstado && matchesAño
  })

  // Pagination
  const totalPages = Math.ceil(filteredProyectos.length / itemsPerPage)
  const paginatedProyectos = filteredProyectos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedMacroregion("")
    setSelectedEje("")
    setSelectedEstado("")
    setSelectedAño("")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery || selectedMacroregion || selectedEje || selectedEstado || selectedAño

  return (
    <AppLayout title="Proyectos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Proyectos</h1>
            <p className="text-sm text-[#5C5C5C]">
              Gestiona y da seguimiento a los proyectos institucionales
            </p>
          </div>
          <Link
            href="/proyectos/nuevo"
            className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-4 py-2.5 text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#C9A42B]"
          >
            <Plus className="h-4 w-4" />
            Nuevo Proyecto
          </Link>
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-[#E0E0E0] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
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

            {/* Macroregión filter */}
            <select
              value={selectedMacroregion}
              onChange={(e) => {
                setSelectedMacroregion(e.target.value as Macroregion | "")
                setCurrentPage(1)
              }}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
            >
              <option value="">Macroregión</option>
              {macroregiones.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Eje temático filter */}
            <select
              value={selectedEje}
              onChange={(e) => {
                setSelectedEje(e.target.value as EjeTematico | "")
                setCurrentPage(1)
              }}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
            >
              <option value="">Eje Temático</option>
              {ejesTematicos.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            {/* Estado filter */}
            <select
              value={selectedEstado}
              onChange={(e) => {
                setSelectedEstado(e.target.value as EstadoProyecto | "")
                setCurrentPage(1)
              }}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
            >
              <option value="">Estado</option>
              {estados.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            {/* Año filter */}
            <select
              value={selectedAño}
              onChange={(e) => {
                setSelectedAño(e.target.value)
                setCurrentPage(1)
              }}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
            >
              <option value="">Año</option>
              {años.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {/* Clear filters */}
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

          {/* Active filters count */}
          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[#5C5C5C]">
              <Filter className="h-3.5 w-3.5" />
              <span>
                {filteredProyectos.length} proyecto{filteredProyectos.length !== 1 ? "s" : ""} encontrado{filteredProyectos.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E0E0E0] bg-[#FAFAFA]">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Proyecto
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Macroregión
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
                {paginatedProyectos.map((proyecto, index) => (
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
                        <p className="text-xs text-[#5C5C5C]">{proyecto.codigo}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <MacroregionBadge macroregion={proyecto.macroregion} />
                    </td>
                    <td className="px-5 py-4">
                      <TypeBadge tipo={proyecto.ejeTematico} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-[#1A1A1A]">{proyecto.responsable}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs text-[#5C5C5C]">
                        <p>{new Date(proyecto.fechaInicio).toLocaleDateString("es-PE")}</p>
                        <p>{new Date(proyecto.fechaFin).toLocaleDateString("es-PE")}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-24">
                        <ProgressBar value={proyecto.avance} size="sm" />
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
                        <button
                          className="rounded-md p-2 text-[#5C5C5C] hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-md p-2 text-[#5C5C5C] hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                          title="Más opciones"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#E0E0E0] px-5 py-3">
              <p className="text-sm text-[#5C5C5C]">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProyectos.length)} de {filteredProyectos.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                      page === currentPage
                        ? "bg-[#FFD600] text-[#1A1A1A]"
                        : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
