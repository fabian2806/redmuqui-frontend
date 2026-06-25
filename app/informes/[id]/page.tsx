"use client"

import { useState, use } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { StatusBadge, MacroregionBadge, TypeBadge } from "@/components/ui/status-badge"
import { getDocumentoById } from "@/lib/data"
import { 
  ChevronRight,
  Pencil,
  Download,
  Calendar,
  User,
  MapPin,
  Building2,
  FileText,
  Clock,
  MessageSquare
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

type TabType = "descripcion" | "asociaciones" | "archivos" | "versiones" | "observaciones"

export default function InformeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { hasPermission } = useAuth()
  const puedeEditarDocumentos = hasPermission("DOCUMENTOS_UPDATE")
  const [activeTab, setActiveTab] = useState<TabType>("descripcion")
  
  const documento = getDocumentoById(id)
  
  if (!documento) {
    notFound()
  }

  const tabs = [
    { id: "descripcion" as TabType, label: "Descripción" },
    { id: "asociaciones" as TabType, label: "Asociaciones" },
    { id: "archivos" as TabType, label: "Archivos" },
    { id: "versiones" as TabType, label: "Versiones" },
    { id: "observaciones" as TabType, label: "Observaciones" },
  ]

  // Mock version history
  const versiones = [
    { version: documento.version, fecha: documento.fechaElaboracion, autor: documento.responsableElaboracion, cambios: "Versión inicial del documento" },
    ...(documento.version !== "1.0" ? [{ version: "1.0", fecha: "2024-09-01", autor: documento.responsableElaboracion, cambios: "Primera versión publicada" }] : [])
  ]

  return (
    <AppLayout>
      <PermissionGuard permiso="DOCUMENTOS_READ">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href="/informes" className="hover:text-[#1A1A1A]">Documentos</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#1A1A1A] font-medium truncate max-w-md">{documento.titulo}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TypeBadge tipo={documento.tipo} />
              <StatusBadge estado={documento.estado} />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">{documento.titulo}</h1>
          </div>
          <div className="flex items-center gap-2">
            {puedeEditarDocumentos && (
              <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]">
                <Pencil className="h-4 w-4" />
                Editar
              </button>
            )}
            <button className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-4 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B]">
              <Download className="h-4 w-4" />
              Descargar
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-6 rounded-lg border border-[#E0E0E0] bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-[#5C5C5C]" />
            <span className="text-[#5C5C5C]">Elaboración:</span>
            <span className="text-[#1A1A1A]">{new Date(documento.fechaElaboracion).toLocaleDateString("es-PE")}</span>
          </div>
          {documento.fechaPublicacion && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-[#5C5C5C]" />
              <span className="text-[#5C5C5C]">Publicación:</span>
              <span className="text-[#1A1A1A]">{new Date(documento.fechaPublicacion).toLocaleDateString("es-PE")}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-[#5C5C5C]" />
            <span className="text-[#5C5C5C]">Versión:</span>
            <span className="text-[#1A1A1A]">{documento.version}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-[#5C5C5C]" />
            <span className="text-[#5C5C5C]">Elaborado por:</span>
            <span className="text-[#1A1A1A]">{documento.responsableElaboracion}</span>
          </div>
          {documento.validadoPor && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-[#5C5C5C]" />
              <span className="text-[#5C5C5C]">Validado por:</span>
              <span className="text-[#1A1A1A]">{documento.validadoPor}</span>
            </div>
          )}
        </div>

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
          {/* Descripción Tab */}
          {activeTab === "descripcion" && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                  Resumen del documento
                </h3>
                <p className="text-sm text-[#1A1A1A] leading-relaxed">
                  {documento.descripcion}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                    Objetivos
                  </h3>
                  <ul className="list-disc list-inside text-sm text-[#1A1A1A] space-y-1">
                    <li>Analizar y documentar la situación actual</li>
                    <li>Proporcionar evidencia técnica para la incidencia</li>
                    <li>Generar recomendaciones para actores clave</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                    Alcance
                  </h3>
                  <p className="text-sm text-[#1A1A1A]">
                    {documento.territorio ? `Territorio: ${documento.territorio}` : "Alcance nacional"}<br />
                    Eje temático: {documento.ejeTematico}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Asociaciones Tab */}
          {activeTab === "asociaciones" && (
            <div className="p-6 space-y-6">
              {documento.proyectoNombre && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                    Proyecto vinculado
                  </h3>
                  <Link
                    href={`/proyectos/${documento.proyectoId}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E0E0E0] px-4 py-3 text-sm text-[#1A1A1A] hover:border-[#FFD600] hover:bg-[#FFFDE7]"
                  >
                    <FileText className="h-4 w-4 text-[#C9A42B]" />
                    {documento.proyectoNombre}
                    <ChevronRight className="h-4 w-4 text-[#5C5C5C]" />
                  </Link>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documento.territorio && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                      Territorio
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F7F7] px-3 py-1 text-sm text-[#5C5C5C]">
                      <MapPin className="h-3.5 w-3.5" />
                      {documento.territorio}
                    </span>
                  </div>
                )}
                {documento.macroregion && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                      Macroregión
                    </h3>
                    <MacroregionBadge macroregion={documento.macroregion} />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                    Eje Temático
                  </h3>
                  <TypeBadge tipo={documento.ejeTematico} />
                </div>
                {documento.institucionesMiembro && documento.institucionesMiembro.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                      Instituciones Miembro
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {documento.institucionesMiembro.map(inst => (
                        <span key={inst} className="inline-flex items-center gap-1 rounded-full bg-[#FFD600]/10 px-3 py-1 text-xs text-[#C9A42B]">
                          <Building2 className="h-3 w-3" />
                          {inst}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Archivos Tab */}
          {activeTab === "archivos" && (
            <div className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-4">
                Archivos adjuntos
              </h3>
              <div className="space-y-3">
                {documento.archivos.map((archivo, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-[#E0E0E0] p-4 hover:bg-[#FFFDE7]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFD600]/20">
                        <FileText className="h-5 w-5 text-[#C9A42B]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{archivo.nombre}</p>
                        <p className="text-xs text-[#5C5C5C]">{archivo.tamaño} • Subido el {new Date(archivo.fecha).toLocaleDateString("es-PE")}</p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 rounded-lg bg-[#F7F7F7] px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#FFD600] hover:text-[#1A1A1A]">
                      <Download className="h-4 w-4" />
                      Descargar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Versiones Tab */}
          {activeTab === "versiones" && (
            <div className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-4">
                Historial de versiones
              </h3>
              <div className="space-y-4">
                {versiones.map((ver, index) => (
                  <div key={index} className="flex gap-4 rounded-lg border border-[#E0E0E0] p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFD600] text-sm font-bold text-[#1A1A1A]">
                      v{ver.version}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#1A1A1A]">Versión {ver.version}</span>
                        {index === 0 && (
                          <span className="rounded bg-[#2E7D32]/10 px-2 py-0.5 text-xs font-medium text-[#2E7D32]">
                            Actual
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#5C5C5C] mt-1">{ver.cambios}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#5C5C5C]">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ver.autor}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(ver.fecha).toLocaleDateString("es-PE")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones Tab */}
          {activeTab === "observaciones" && (
            <div className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-4">
                Observaciones y comentarios
              </h3>
              <div className="space-y-4 mb-6">
                {/* Sample observation */}
                <div className="flex gap-4 rounded-lg border border-[#E0E0E0] p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7]">
                    <User className="h-4 w-4 text-[#5C5C5C]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1A1A1A]">{documento.validadoPor || documento.responsableElaboracion}</span>
                      <span className="text-xs text-[#5C5C5C]">hace 3 días</span>
                    </div>
                    <p className="text-sm text-[#5C5C5C] mt-1">
                      Documento revisado y aprobado. Se sugiere incluir referencias adicionales en la sección de metodología para la próxima versión.
                    </p>
                  </div>
                </div>
              </div>
              {/* Add observation form */}
              <div className="rounded-lg border border-[#E0E0E0] p-4">
                <label className="block text-xs font-medium text-[#5C5C5C] mb-2">
                  Agregar observación
                </label>
                <textarea
                  rows={3}
                  placeholder="Escribe tu observación o comentario..."
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                />
                <div className="flex justify-end mt-3">
                  <button className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-4 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B]">
                    <MessageSquare className="h-4 w-4" />
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </PermissionGuard>
    </AppLayout>
  )
}
