"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, FileText, Plus } from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge, TypeBadge } from "@/components/ui/status-badge"
import { api } from "@/lib/api"
import type {
  DocumentoResponse,
  EstadoDocumento,
  PageResponse,
  ProyectoResponse,
} from "@/lib/types"

const ESTADO_LABEL: Record<EstadoDocumento, string> = {
  BORRADOR: "Borrador",
  PUBLICADO: "Publicado",
}

function formatFecha(value: string | null): string {
  if (!value) return "—"
  // fechaCarga llega como "YYYY-MM-DD"; evitar desfase de zona horaria.
  const [year, month, day] = value.split("T")[0].split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<DocumentoResponse[]>([])
  const [proyectos, setProyectos] = useState<ProyectoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [documentosData, proyectosData] = await Promise.all([
          api.get<PageResponse<DocumentoResponse>>(
            "/documentos?page=0&size=20&sort=fechaCreacion,desc",
          ),
          api.get<PageResponse<ProyectoResponse>>("/proyectos?page=0&size=100"),
        ])
        if (cancelled) return
        setDocumentos(documentosData.content)
        setProyectos(proyectosData.content)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los documentos",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Resolver nombre de proyecto en el cliente (sin tocar el DTO del backend).
  const proyectoNombre = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of proyectos) map.set(p.id, p.nombre)
    return (id: number | null) => (id != null ? (map.get(id) ?? "—") : "—")
  }, [proyectos])

  return (
    <AppLayout title="Documentos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">
              Documentos e Informes
            </h1>
            <p className="text-sm text-[#5C5C5C]">
              Repositorio de documentos institucionales
            </p>
          </div>
          <Link
            href="/documentos/nuevo"
            className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-4 py-2.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B]"
          >
            <Plus className="h-4 w-4" />
            Nuevo documento
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#5C5C5C]">
              <Spinner />
              Cargando documentos...
            </div>
          ) : documentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <FileText className="h-10 w-10 text-[#E0E0E0]" />
              <p className="text-sm font-medium text-[#1A1A1A]">
                Aún no hay documentos registrados
              </p>
              <Link
                href="/documentos/nuevo"
                className="text-sm font-medium text-[#0277BD] hover:underline"
              >
                Registrar el primero
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E0E0E0] text-xs uppercase tracking-wide text-[#5C5C5C]">
                  <tr>
                    <th className="px-6 py-3 font-medium">Título</th>
                    <th className="px-6 py-3 font-medium">Tipo</th>
                    <th className="px-6 py-3 font-medium">Estado</th>
                    <th className="px-6 py-3 font-medium">Fecha de carga</th>
                    <th className="px-6 py-3 font-medium">Proyecto asociado</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc, index) => (
                    <tr
                      key={doc.id}
                      className={`border-b border-[#F0F0F0] ${index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}
                    >
                      <td className="px-6 py-3 font-medium text-[#1A1A1A]">
                        {doc.titulo}
                      </td>
                      <td className="px-6 py-3">
                        {doc.tipo ? <TypeBadge tipo={doc.tipo} /> : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge estado={ESTADO_LABEL[doc.estado] ?? doc.estado} />
                      </td>
                      <td className="px-6 py-3 text-[#5C5C5C]">
                        {formatFecha(doc.fechaCarga)}
                      </td>
                      <td className="px-6 py-3 text-[#5C5C5C]">
                        {proyectoNombre(doc.idProyecto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
