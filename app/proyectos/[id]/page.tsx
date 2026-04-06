"use client"

import { useState, use } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { StatusBadge, MacroregionBadge, TypeBadge } from "@/components/ui/status-badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import { 
  getProyectoById, 
  getActividadesByProyecto, 
  getHitosByProyecto,
  getDocumentosByProyecto,
  getBitacoraByEntidad,
  hitos as allHitos,
  actividades as allActividades
} from "@/lib/data"
import { 
  ChevronRight,
  Pencil,
  Download,
  Archive,
  Calendar,
  User,
  MapPin,
  Building2,
  DollarSign,
  AlertTriangle,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  Circle,
  XCircle
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

type TabType = "resumen" | "actividades" | "hitos" | "informes" | "equipo" | "bitacora"

export default function ProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = useState<TabType>("resumen")
  
  const proyecto = getProyectoById(id)
  
  if (!proyecto) {
    notFound()
  }

  const actividades = getActividadesByProyecto(id)
  const hitos = getHitosByProyecto(id)
  const documentos = getDocumentosByProyecto(id)
  const bitacora = getBitacoraByEntidad(id)

  // Calculate days remaining
  const fechaFin = new Date(proyecto.fechaFin)
  const hoy = new Date()
  const diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

  const tabs = [
    { id: "resumen" as TabType, label: "Resumen" },
    { id: "actividades" as TabType, label: "Actividades" },
    { id: "hitos" as TabType, label: "Hitos y Cronograma" },
    { id: "informes" as TabType, label: "Informes y Productos" },
    { id: "equipo" as TabType, label: "Equipo" },
    { id: "bitacora" as TabType, label: "Bitácora" },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href="/proyectos" className="hover:text-[#1A1A1A]">Proyectos</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#1A1A1A] font-medium">{proyecto.nombre}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">{proyecto.nombre}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <MacroregionBadge macroregion={proyecto.macroregion} />
              <TypeBadge tipo={proyecto.ejeTematico} />
              <StatusBadge estado={proyecto.estado} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]">
              <Pencil className="h-4 w-4" />
              Editar
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]">
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]">
              <Archive className="h-4 w-4" />
              Archivar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Main content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-[#F7F7F7] p-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-[#FFD600] text-[#1A1A1A]"
                      : "text-[#5C5C5C] hover:text-[#1A1A1A]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
              {/* Resumen Tab */}
              {activeTab === "resumen" && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                      Descripción
                    </h3>
                    <p className="text-sm text-[#1A1A1A] leading-relaxed">
                      {proyecto.descripcion}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                      Objetivo
                    </h3>
                    <p className="text-sm text-[#1A1A1A] leading-relaxed">
                      {proyecto.objetivo}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                        Territorios
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {proyecto.territorios.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#F7F7F7] px-3 py-1 text-xs text-[#5C5C5C]">
                            <MapPin className="h-3 w-3" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                        Instituciones Miembro
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {proyecto.institucionesMiembro.map(i => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[#FFD600]/10 px-3 py-1 text-xs text-[#C9A42B]">
                            <Building2 className="h-3 w-3" />
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actividades Tab */}
              {activeTab === "actividades" && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                      Actividades del Proyecto
                    </h3>
                    <button className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#C9A42B]">
                      <Plus className="h-3.5 w-3.5" />
                      Agregar actividad
                    </button>
                  </div>
                  {actividades.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#E0E0E0]">
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                              Actividad
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                              Responsable
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                              Fecha
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                              Avance
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0E0E0]">
                          {actividades.map(act => (
                            <tr key={act.id} className="hover:bg-[#FFFDE7]">
                              <td className="py-3 text-sm text-[#1A1A1A]">{act.nombre}</td>
                              <td className="py-3 text-sm text-[#5C5C5C]">{act.responsable}</td>
                              <td className="py-3 text-xs text-[#5C5C5C]">
                                {new Date(act.fechaFin).toLocaleDateString("es-PE")}
                              </td>
                              <td className="py-3">
                                <div className="w-20">
                                  <ProgressBar value={act.avance} size="sm" />
                                </div>
                              </td>
                              <td className="py-3">
                                <StatusBadge estado={act.estado} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-[#5C5C5C]">
                      No hay actividades registradas para este proyecto.
                    </div>
                  )}
                </div>
              )}

              {/* Hitos Tab */}
              {activeTab === "hitos" && (
                <div className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-6">
                    Cronograma e Hitos
                  </h3>
                  {hitos.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#E0E0E0]" />
                      <div className="space-y-6">
                        {hitos.map((hito, index) => (
                          <div key={hito.id} className="relative flex gap-4 pl-10">
                            <div className={`absolute left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full ${
                              hito.estado === "Completado" ? "bg-[#2E7D32]" :
                              hito.estado === "Vencido" ? "bg-[#C8102E]" : "bg-[#E0E0E0]"
                            }`}>
                              {hito.estado === "Completado" ? (
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              ) : hito.estado === "Vencido" ? (
                                <XCircle className="h-3 w-3 text-white" />
                              ) : (
                                <Circle className="h-3 w-3 text-[#5C5C5C]" />
                              )}
                            </div>
                            <div className="flex-1 rounded-lg border border-[#E0E0E0] p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-medium text-[#1A1A1A]">{hito.nombre}</p>
                                  <p className="text-xs text-[#5C5C5C] mt-1">
                                    {new Date(hito.fecha).toLocaleDateString("es-PE", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric"
                                    })}
                                  </p>
                                </div>
                                <StatusBadge estado={hito.estado} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-[#5C5C5C]">
                      No hay hitos registrados para este proyecto.
                    </div>
                  )}
                </div>
              )}

              {/* Informes Tab */}
              {activeTab === "informes" && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                      Informes y Productos
                    </h3>
                    <Link
                      href="/informes/nuevo"
                      className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#C9A42B]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nuevo documento
                    </Link>
                  </div>
                  {documentos.length > 0 ? (
                    <div className="space-y-3">
                      {documentos.map(doc => (
                        <div key={doc.id} className="flex items-center gap-4 rounded-lg border border-[#E0E0E0] p-4 hover:bg-[#FFFDE7]">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFD600]/20">
                            <FileText className="h-5 w-5 text-[#C9A42B]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1A1A1A] truncate">{doc.titulo}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <TypeBadge tipo={doc.tipo} />
                              <span className="text-xs text-[#5C5C5C]">
                                {new Date(doc.fechaElaboracion).toLocaleDateString("es-PE")}
                              </span>
                            </div>
                          </div>
                          <StatusBadge estado={doc.estado} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-[#5C5C5C]">
                      No hay documentos asociados a este proyecto.
                    </div>
                  )}
                </div>
              )}

              {/* Equipo Tab */}
              {activeTab === "equipo" && (
                <div className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-4">
                    Equipo del Proyecto
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Responsable principal */}
                    <div className="rounded-lg border-2 border-[#FFD600] bg-[#FFFDE7] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD600]">
                          <User className="h-5 w-5 text-[#1A1A1A]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">{proyecto.responsable}</p>
                          <p className="text-xs text-[#C9A42B] font-medium">Responsable Principal</p>
                        </div>
                      </div>
                    </div>
                    {/* Equipo */}
                    {proyecto.equipo.map(miembro => (
                      <div key={miembro} className="rounded-lg border border-[#E0E0E0] p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F7]">
                            <User className="h-5 w-5 text-[#5C5C5C]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1A1A1A]">{miembro}</p>
                            <p className="text-xs text-[#5C5C5C]">Equipo Técnico</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bitácora Tab */}
              {activeTab === "bitacora" && (
                <div className="p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-4">
                    Historial de Cambios
                  </h3>
                  {bitacora.length > 0 ? (
                    <div className="space-y-4">
                      {bitacora.map(entry => (
                        <div key={entry.id} className="flex gap-4 rounded-lg border border-[#E0E0E0] p-4">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7]">
                            <Clock className="h-4 w-4 text-[#5C5C5C]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#1A1A1A]">{entry.usuario}</span>
                              <span className="text-xs text-[#5C5C5C]">•</span>
                              <span className="text-xs text-[#5C5C5C]">{entry.accion}</span>
                            </div>
                            <p className="text-sm text-[#5C5C5C] mt-1">{entry.descripcion}</p>
                            <p className="text-xs text-[#5C5C5C] mt-2">{entry.fecha}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-[#5C5C5C]">
                      No hay registros en la bitácora.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Info card */}
            <div className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-4">
                Información
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-[#5C5C5C] mt-0.5" />
                  <div>
                    <p className="text-xs text-[#5C5C5C]">Responsable</p>
                    <p className="text-sm font-medium text-[#1A1A1A]">{proyecto.responsable}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-[#5C5C5C] mt-0.5" />
                  <div>
                    <p className="text-xs text-[#5C5C5C]">Periodo</p>
                    <p className="text-sm text-[#1A1A1A]">
                      {new Date(proyecto.fechaInicio).toLocaleDateString("es-PE")} - {new Date(proyecto.fechaFin).toLocaleDateString("es-PE")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-[#5C5C5C] mt-0.5" />
                  <div>
                    <p className="text-xs text-[#5C5C5C]">Días restantes</p>
                    <p className={`text-sm font-semibold ${
                      diasRestantes < 30 ? "text-[#C8102E]" :
                      diasRestantes < 90 ? "text-[#F57C00]" : "text-[#2E7D32]"
                    }`}>
                      {diasRestantes > 0 ? `${diasRestantes} días` : "Vencido"}
                    </p>
                  </div>
                </div>
                {proyecto.presupuesto && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-4 w-4 text-[#5C5C5C] mt-0.5" />
                    <div>
                      <p className="text-xs text-[#5C5C5C]">Presupuesto</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        S/ {proyecto.presupuesto.toLocaleString("es-PE")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress card */}
            <div className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-4">
                Avance
              </h3>
              <div className="text-center mb-4">
                <span className="text-4xl font-bold text-[#1A1A1A]">{proyecto.avance}%</span>
              </div>
              <ProgressBar value={proyecto.avance} showLabel={false} size="lg" />
            </div>

            {/* Alerts card */}
            {proyecto.estado === "En riesgo" && (
              <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 p-5">
                <div className="flex items-center gap-2 text-[#C8102E] mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <h3 className="text-sm font-bold">Alertas Activas</h3>
                </div>
                <ul className="space-y-2 text-sm text-[#C8102E]">
                  <li>• Actividades con retraso</li>
                  <li>• Requiere atención inmediata</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
