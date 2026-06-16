"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, Eye, FileText, Pencil, Plus, Trash2 } from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge, TypeBadge } from "@/components/ui/status-badge"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import type {
  DocumentoResponse,
  EstadoDocumento,
  PageResponse,
  ProyectoResponse,
} from "@/lib/types"

const ESTADO_LABEL: Record<EstadoDocumento, string> = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revisión",
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
  const [documentoAEliminar, setDocumentoAEliminar] = useState<DocumentoResponse | null>(null)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)
  const { hasPermission } = useAuth()
  const puedeEditar = hasPermission("DOCUMENTOS_UPDATE")

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

  async function handleEliminarDocumento() {
    if (!documentoAEliminar) return

    setEliminandoId(documentoAEliminar.id)
    setError(null)
    try {
      await api.delete<void>(`/documentos/${documentoAEliminar.id}`)
      setDocumentos((actuales) =>
        actuales.filter((doc) => doc.id !== documentoAEliminar.id),
      )
      setDocumentoAEliminar(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar el documento",
      )
    } finally {
      setEliminandoId(null)
    }
  }

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
                    <th className="px-6 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc, index) => (
                    <tr
                      key={doc.id}
                      className={`border-b border-[#F0F0F0] ${index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}
                    >
                      <td className="px-6 py-3 font-medium text-[#1A1A1A]">
                        <Link
                          href={`/documentos/${doc.id}`}
                          className="hover:text-[#0277BD] hover:underline"
                        >
                          {doc.titulo}
                        </Link>
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
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/documentos/${doc.id}`}
                            title="Ver detalle"
                            className="inline-flex items-center justify-center rounded-lg border border-[#E0E0E0] p-2 text-[#5C5C5C] transition-colors hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {puedeEditar ? (
                            <>
                              <Link
                                href={`/documentos/${doc.id}/editar`}
                                title="Editar documento"
                                className="inline-flex items-center justify-center rounded-lg border border-[#E0E0E0] p-2 text-[#5C5C5C] transition-colors hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <button
                                type="button"
                                title="Eliminar documento"
                                disabled={eliminandoId === doc.id}
                                onClick={() => setDocumentoAEliminar(doc)}
                                className="inline-flex items-center justify-center rounded-lg border border-[#E0E0E0] p-2 text-[#5C5C5C] transition-colors hover:border-[#C8102E]/30 hover:bg-[#C8102E]/5 hover:text-[#C8102E] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {eliminandoId === doc.id ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled
                                title="Sin permiso para editar"
                                className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-[#E0E0E0] p-2 text-[#C0C0C0]"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled
                                title="Sin permiso para eliminar"
                                className="inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-[#E0E0E0] p-2 text-[#C0C0C0]"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!documentoAEliminar}
        onOpenChange={(open) => {
          if (!open && eliminandoId === null) setDocumentoAEliminar(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara "{documentoAEliminar?.titulo}" y sus archivos asociados.
              No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoId !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={eliminandoId !== null}
              onClick={(event) => {
                event.preventDefault()
                void handleEliminarDocumento()
              }}
              className="bg-[#C8102E] text-white hover:bg-[#A50D25]"
            >
              {eliminandoId !== null ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
