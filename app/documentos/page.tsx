"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileClock,
  FileText,
  Grid2X2,
  List,
  Pencil,
  Plus,
  Search,
  X,
  Trash2
} from "lucide-react"

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

const PAGE_SIZE = 12
const ESTADO_LABEL: Record<EstadoDocumento, string> = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revisión",
  PUBLICADO: "Publicado",
}

function formatFecha(value: string | null): string {
  if (!value) return "-"
  const [year, month, day] = value.split("T")[0].split("-")
  return year && month && day ? `${day}/${month}/${year}` : value
}

export default function DocumentosPage() {
  const { hasPermission } = useAuth()
  const puedeEditar = hasPermission("DOCUMENTOS_UPDATE")
  const [page, setPage] = useState(0)
  const [q, setQ] = useState("")
  const [idProyecto, setIdProyecto] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [estado, setEstado] = useState<EstadoDocumento | "">("")
  const [vista, setVista] = useState<"lista" | "cuadricula">("lista")
  const [proyectos, setProyectos] = useState<ProyectoResponse[]>([])
  const [data, setData] = useState<PageResponse<DocumentoResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [documentoAEliminar, setDocumentoAEliminar] = useState<DocumentoResponse | null>(null)
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)

  useEffect(() => {
    api.get<PageResponse<ProyectoResponse>>("/proyectos?page=0&size=200")
      .then((response) => setProyectos(response.content))
      .catch(() => setProyectos([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(async () => {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
        sort: "fechaCarga,desc",
      })
      if (q.trim()) params.set("q", q.trim())
      if (idProyecto) params.set("idProyecto", idProyecto)
      if (fechaDesde) params.set("fechaDesde", fechaDesde)
      if (fechaHasta) params.set("fechaHasta", fechaHasta)
      if (estado) params.set("estado", estado)
      try {
        const response = await api.get<PageResponse<DocumentoResponse>>(
          `/documentos?${params.toString()}`,
        )
        if (!cancelled) setData(response)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los documentos")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [page, q, idProyecto, fechaDesde, fechaHasta, estado])

  const proyectoNombre = useMemo(
    () => new Map(proyectos.map((proyecto) => [proyecto.id, proyecto.nombre])),
    [proyectos],
  )
  const documentos = data?.content ?? []
  const hayFiltros = Boolean(q || idProyecto || fechaDesde || fechaHasta || estado)

  function limpiarFiltros() {
    setQ("")
    setIdProyecto("")
    setFechaDesde("")
    setFechaHasta("")
    setEstado("")
    setPage(0)
  }

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Documentos</h1>
            <p className="text-sm text-[#5C5C5C]">
              Repositorio, revisión y trazabilidad documental
            </p>
          </div>
          <Link href="/documentos/nuevo" className="flex items-center justify-center gap-2 rounded-lg bg-[#FFD600] px-4 py-2.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B]">
            <Plus className="h-4 w-4" /> Nuevo documento
          </Link>
        </div>

        <section className="rounded-lg border border-[#E0E0E0] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative xl:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#5C5C5C]" />
              <input
                value={q}
                onChange={(event) => { setQ(event.target.value); setPage(0) }}
                placeholder="Buscar por título, descripción o tipo"
                className="h-10 w-full rounded-lg border border-[#E0E0E0] pl-10 pr-3 text-sm"
              />
            </label>
            <select value={idProyecto} onChange={(event) => { setIdProyecto(event.target.value); setPage(0) }} className="h-10 rounded-lg border border-[#E0E0E0] px-3 text-sm">
              <option value="">Todos los proyectos</option>
              {proyectos.map((proyecto) => <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</option>)}
            </select>
            <input aria-label="Fecha desde" type="date" value={fechaDesde} onChange={(event) => { setFechaDesde(event.target.value); setPage(0) }} className="h-10 rounded-lg border border-[#E0E0E0] px-3 text-sm" />
            <input aria-label="Fecha hasta" type="date" value={fechaHasta} onChange={(event) => { setFechaHasta(event.target.value); setPage(0) }} className="h-10 rounded-lg border border-[#E0E0E0] px-3 text-sm" />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select value={estado} onChange={(event) => { setEstado(event.target.value as EstadoDocumento | ""); setPage(0) }} className="h-9 rounded-lg border border-[#E0E0E0] px-3 text-sm">
                <option value="">Todos los estados</option>
                {Object.entries(ESTADO_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {hayFiltros && <button type="button" onClick={limpiarFiltros} className="flex items-center gap-1 text-sm text-[#5C5C5C] hover:text-[#1A1A1A]"><X className="h-4 w-4" /> Limpiar</button>}
            </div>
            <div className="flex rounded-lg border border-[#E0E0E0] p-1">
              <button type="button" title="Vista de lista" onClick={() => setVista("lista")} className={`rounded p-1.5 ${vista === "lista" ? "bg-[#FFD600]" : ""}`}><List className="h-4 w-4" /></button>
              <button type="button" title="Diseño de cuadrícula" onClick={() => setVista("cuadricula")} className={`rounded p-1.5 ${vista === "cuadricula" ? "bg-[#FFD600]" : ""}`}><Grid2X2 className="h-4 w-4" /></button>
            </div>
          </div>
        </section>

        {error && <div role="alert" className="flex gap-2 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm text-[#C8102E]"><AlertCircle className="h-4 w-4" />{error}</div>}

                {loading ? (
          <div className="flex justify-center gap-2 py-16 text-sm text-[#5C5C5C]">
            <Spinner /> Cargando documentos...
          </div>
        ) : documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[#E0E0E0] bg-white py-16 text-center">
            <FileText className="h-10 w-10 text-[#E0E0E0]" />
            <p className="text-sm font-medium text-[#1A1A1A]">
              {hayFiltros
                ? "No hay documentos para los filtros seleccionados."
                : "Aún no hay documentos registrados"}
            </p>

            {!hayFiltros && (
              <Link
                href="/documentos/nuevo"
                className="text-sm font-medium text-[#0277BD] hover:underline"
              >
                Registrar el primero
              </Link>
            )}
          </div>
        ) : vista === "cuadricula" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {documentos.map((doc) => (
              <article
                key={doc.id}
                className="overflow-hidden rounded-lg border border-[#E0E0E0] bg-white shadow-sm"
              >
                <Link
                  href={`/documentos/${doc.id}`}
                  className="flex h-36 items-center justify-center bg-[#F7F7F7]"
                >
                  <FileText className="h-16 w-16 text-[#C9A42B]" />
                </Link>

                <div className="space-y-3 p-4">
                  <Link
                    href={`/documentos/${doc.id}`}
                    className="line-clamp-2 text-sm font-bold hover:text-[#0277BD]"
                  >
                    {doc.titulo}
                  </Link>

                  <div className="flex items-center justify-between gap-2">
                    {doc.tipo ? <TypeBadge tipo={doc.tipo} /> : <span />}
                    <StatusBadge estado={ESTADO_LABEL[doc.estado] ?? doc.estado} />
                  </div>

                  <p className="truncate text-xs text-[#5C5C5C]">
                    {doc.usuarioCarga || "Sin usuario"} · {formatFecha(doc.fechaCarga)}
                  </p>

                  <p className="truncate text-xs text-[#5C5C5C]">
                    {doc.idProyecto ? proyectoNombre.get(doc.idProyecto) ?? "-" : "-"}
                  </p>

                  <div className="flex items-center justify-end gap-1">
                    <Link
                      title="Ver detalle"
                      href={`/documentos/${doc.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-[#E0E0E0] p-2 text-[#5C5C5C] transition-colors hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>

                    <Link
                      title="Ver historial"
                      href={`/documentos/${doc.id}#historial`}
                      className="inline-flex items-center justify-center rounded-lg border border-[#E0E0E0] p-2 text-[#5C5C5C] transition-colors hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                    >
                      <FileClock className="h-4 w-4" />
                    </Link>

                    {puedeEditar ? (
                      <>
                        <Link
                          title="Editar documento"
                          href={`/documentos/${doc.id}/editar`}
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
                          {eliminandoId === doc.id ? (
                            <Spinner />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
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
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E0E0E0] bg-[#FAFAFA] text-xs uppercase text-[#5C5C5C]">
                <tr>
                  <th className="px-5 py-3">Título</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Cargado por</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Proyecto</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {documentos.map((doc, index) => (
                  <tr
                    key={doc.id}
                    className={`border-b border-[#F0F0F0] ${
                      index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-[#1A1A1A]">
                      <Link
                        href={`/documentos/${doc.id}`}
                        className="hover:text-[#0277BD] hover:underline"
                      >
                        {doc.titulo}
                      </Link>
                    </td>

                    <td className="px-5 py-3">
                      {doc.tipo ? <TypeBadge tipo={doc.tipo} /> : "-"}
                    </td>

                    <td className="px-5 py-3">
                      <StatusBadge estado={ESTADO_LABEL[doc.estado] ?? doc.estado} />
                    </td>

                    <td className="px-5 py-3 text-[#5C5C5C]">
                      {doc.usuarioCarga || "-"}
                    </td>

                    <td className="px-5 py-3 text-[#5C5C5C]">
                      {formatFecha(doc.fechaCarga)}
                    </td>

                    <td className="max-w-56 truncate px-5 py-3 text-[#5C5C5C]">
                      {doc.idProyecto ? proyectoNombre.get(doc.idProyecto) ?? "-" : "-"}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          title="Ver detalle"
                          href={`/documentos/${doc.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-[#E0E0E0] p-2 text-[#5C5C5C] transition-colors hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        <Link
                          title="Ver historial"
                          href={`/documentos/${doc.id}#historial`}
                          className="inline-flex items-center justify-center rounded-lg border border-[#E0E0E0] p-2 text-[#5C5C5C] transition-colors hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                        >
                          <FileClock className="h-4 w-4" />
                        </Link>

                        {puedeEditar ? (
                          <>
                            <Link
                              title="Editar documento"
                              href={`/documentos/${doc.id}/editar`}
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
                              {eliminandoId === doc.id ? (
                                <Spinner />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-[#5C5C5C]">
            <span>{data.totalElements} documentos</span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={data.first}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-lg border p-2 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span>
                Página {data.page + 1} de {data.totalPages}
              </span>

              <button
                type="button"
                disabled={data.last}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-lg border p-2 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
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
