"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { StatusBadge, TypeBadge, MacroregionBadge } from "@/components/ui/status-badge"
import { 
  documentos, 
  proyectos,
  type TipoDocumento, 
  type EjeTematico, 
  type EstadoDocumento 
} from "@/lib/data"
import { 
  Plus, 
  Search, 
  Eye, 
  Download, 
  Pencil,
  Grid3X3,
  List,
  FileText,
  Calendar,
  User
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"

const tiposDocumento: TipoDocumento[] = [
  "Informe", "Pronunciamiento", "Investigación", "Manual", "Cartilla", "Resumen técnico"
]
const estadosDocumento: EstadoDocumento[] = ["Borrador", "En revisión", "Publicado"]

export default function InformesPage() {
  const { hasPermission } = useAuth()
  const puedeCrearDocumentos = hasPermission("DOCUMENTOS_CREATE")
  const puedeEditarDocumentos = hasPermission("DOCUMENTOS_UPDATE")

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTipo, setSelectedTipo] = useState<TipoDocumento | "">("")
  const [selectedProyecto, setSelectedProyecto] = useState("")
  const [selectedEstado, setSelectedEstado] = useState<EstadoDocumento | "">("")
  const [selectedAño, setSelectedAño] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [activeTab, setActiveTab] = useState<TipoDocumento | "Todos">("Todos")

  // Filter documents
  const filteredDocumentos = documentos.filter(doc => {
    const matchesSearch = doc.titulo.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTipo = activeTab === "Todos" || doc.tipo === activeTab
    const matchesProyecto = !selectedProyecto || doc.proyectoId === selectedProyecto
    const matchesEstado = !selectedEstado || doc.estado === selectedEstado
    const matchesAño = !selectedAño || doc.fechaElaboracion.startsWith(selectedAño)
    
    return matchesSearch && matchesTipo && matchesProyecto && matchesEstado && matchesAño
  })

  const tabs: (TipoDocumento | "Todos")[] = ["Todos", ...tiposDocumento]

  return (
    <AppLayout title="Informes y Productos">
      <PermissionGuard permiso="DOCUMENTOS_READ">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Informes y Productos</h1>
            <p className="text-sm text-[#5C5C5C]">
              Repositorio central de documentos institucionales
            </p>
          </div>
          {puedeCrearDocumentos && (
            <Link
              href="/informes/nuevo"
              className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-4 py-2.5 text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#C9A42B]"
            >
              <Plus className="h-4 w-4" />
              Registrar documento
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-[#F7F7F7] p-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[#FFD600] text-[#1A1A1A]"
                  : "text-[#5C5C5C] hover:text-[#1A1A1A]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-[#E0E0E0] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C5C5C]" />
              <input
                type="text"
                placeholder="Buscar por título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E0E0E0] bg-[#F7F7F7] pl-10 pr-4 text-sm text-[#1A1A1A] placeholder:text-[#5C5C5C] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
              />
            </div>

            {/* Proyecto filter */}
            <select
              value={selectedProyecto}
              onChange={(e) => setSelectedProyecto(e.target.value)}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
            >
              <option value="">Proyecto asociado</option>
              {proyectos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>

            {/* Estado filter */}
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value as EstadoDocumento | "")}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
            >
              <option value="">Estado</option>
              {estadosDocumento.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            {/* Año filter */}
            <select
              value={selectedAño}
              onChange={(e) => setSelectedAño(e.target.value)}
              className="h-10 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
            >
              <option value="">Año</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>

            {/* View mode toggle */}
            <div className="flex rounded-lg border border-[#E0E0E0] bg-white">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex h-10 w-10 items-center justify-center rounded-l-lg transition-colors ${
                  viewMode === "grid" ? "bg-[#FFD600] text-[#1A1A1A]" : "text-[#5C5C5C] hover:bg-[#F7F7F7]"
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex h-10 w-10 items-center justify-center rounded-r-lg border-l border-[#E0E0E0] transition-colors ${
                  viewMode === "table" ? "bg-[#FFD600] text-[#1A1A1A]" : "text-[#5C5C5C] hover:bg-[#F7F7F7]"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocumentos.map(doc => (
              <div
                key={doc.id}
                className="group rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm transition-all hover:border-[#FFD600] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FFD600]/20">
                    <FileText className="h-6 w-6 text-[#C9A42B]" />
                  </div>
                  <StatusBadge estado={doc.estado} />
                </div>
                
                <div className="mt-4">
                  <TypeBadge tipo={doc.tipo} />
                  <h3 className="mt-2 text-sm font-medium text-[#1A1A1A] line-clamp-2 group-hover:text-[#C9A42B]">
                    {doc.titulo}
                  </h3>
                </div>

                <div className="mt-4 space-y-2 text-xs text-[#5C5C5C]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(doc.fechaElaboracion).toLocaleDateString("es-PE")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    <span>{doc.responsableElaboracion}</span>
                  </div>
                  {doc.proyectoNombre && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate">{doc.proyectoNombre}</span>
                    </div>
                  )}
                </div>

                {doc.macroregion && (
                  <div className="mt-3">
                    <MacroregionBadge macroregion={doc.macroregion} />
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 border-t border-[#E0E0E0] pt-4">
                  <Link
                    href={`/informes/${doc.id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#F7F7F7] py-2 text-xs font-medium text-[#5C5C5C] hover:bg-[#FFD600] hover:text-[#1A1A1A]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </Link>
                  <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#F7F7F7] py-2 text-xs font-medium text-[#5C5C5C] hover:bg-[#FFD600] hover:text-[#1A1A1A]">
                    <Download className="h-3.5 w-3.5" />
                    Descargar
                  </button>
                  {puedeEditarDocumentos && (
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7F7F7] text-[#5C5C5C] hover:bg-[#FFD600] hover:text-[#1A1A1A]">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E0E0E0] bg-[#FAFAFA]">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                      Documento
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                      Tipo
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                      Proyecto
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                      Responsable
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                      Fecha
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
                  {filteredDocumentos.map((doc, index) => (
                    <tr
                      key={doc.id}
                      className={`border-b border-[#E0E0E0] transition-colors hover:bg-[#FFFDE7] ${
                        index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <Link href={`/informes/${doc.id}`} className="block">
                          <p className="text-sm font-medium text-[#1A1A1A] hover:text-[#C9A42B]">
                            {doc.titulo}
                          </p>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <TypeBadge tipo={doc.tipo} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#5C5C5C]">
                          {doc.proyectoNombre || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#1A1A1A]">{doc.responsableElaboracion}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#5C5C5C]">
                          {new Date(doc.fechaElaboracion).toLocaleDateString("es-PE")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge estado={doc.estado} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/informes/${doc.id}`}
                            className="rounded-md p-2 text-[#5C5C5C] hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                            title="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            className="rounded-md p-2 text-[#5C5C5C] hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {puedeEditarDocumentos && (
                            <button
                              className="rounded-md p-2 text-[#5C5C5C] hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredDocumentos.length === 0 && (
          <div className="rounded-lg border border-[#E0E0E0] bg-white p-12 text-center shadow-sm">
            <FileText className="mx-auto h-12 w-12 text-[#E0E0E0]" />
            <p className="mt-4 text-sm text-[#5C5C5C]">
              No se encontraron documentos con los filtros aplicados
            </p>
          </div>
        )}
      </div>
      </PermissionGuard>
    </AppLayout>
  )
}
