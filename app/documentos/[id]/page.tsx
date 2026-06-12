"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Hash,
  MapPin,
  Pencil,
  Tag,
  User,
} from "lucide-react"
import { SuccessDialog } from "@/components/ui/success-dialog"
import { AppLayout } from "@/components/layout/app-layout"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge, TypeBadge } from "@/components/ui/status-badge"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import type {
  ArchivoResponse,
  DocumentoResponse,
  EjeTematico,
  EstadoDocumento,
  PageResponse,
  ProyectoResponse,
  Territorio,
  UsuarioResponse,
} from "@/lib/types"

const ESTADO_LABEL: Record<EstadoDocumento, string> = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revisión",
  PUBLICADO: "Publicado",
}

function formatFecha(value: string | null): string {
  if (!value) return "—"
  const [year, month, day] = value.split("T")[0].split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function nombreCompleto(usuario: UsuarioResponse | undefined): string {
  return usuario ? `${usuario.nombres} ${usuario.apellidos}`.trim() : "—"
}

export default function DocumentoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { hasPermission, user } = useAuth()
  const puedeEditar = hasPermission("DOCUMENTOS_UPDATE")
  const puedeValidar = hasPermission("DOCUMENTOS_VALIDATE")

  const [doc, setDoc] = useState<DocumentoResponse | null>(null)
  const [proyecto, setProyecto] = useState<ProyectoResponse | null>(null)
  const [ejes, setEjes] = useState<EjeTematico[]>([])
  const [territorios, setTerritorios] = useState<Territorio[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [archivos, setArchivos] = useState<ArchivoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState({
    title: "",
    description: "",
  })

  async function cargarDocumento(cancelled: { value: boolean }) {
    setLoading(true)
    setError(null)
    try {
      const documento = await api.get<DocumentoResponse>(`/documentos/${id}`)
      const [ejesData, territoriosData, archivosData] = await Promise.all([
        api.get<EjeTematico[]>("/ejes-tematicos"),
        api.get<Territorio[]>("/territorios"),
        api.get<ArchivoResponse[]>(`/documentos/${id}/archivos`),
      ])
      // /usuarios requiere USUARIOS_READ; un TECNICO/CONSULTOR no lo tiene.
      // Best-effort: su 403 no debe romper la vista del documento (los nombres
      // de responsable se degradan a "—" si no se pueden resolver).
      const usuariosData = await api
        .get<PageResponse<UsuarioResponse>>("/usuarios?page=0&size=100")
        .then((d) => d.content)
        .catch(() => (user ? [user] : []))
      let proyectoData: ProyectoResponse | null = null
      if (documento.idProyecto != null) {
        proyectoData = await api
          .get<ProyectoResponse>(`/proyectos/${documento.idProyecto}`)
          .catch(() => null)
      }

      if (cancelled.value) return
      setDoc(documento)
      setEjes(ejesData)
      setTerritorios(territoriosData)
      setUsuarios(usuariosData)
      setProyecto(proyectoData)
      setArchivos(archivosData)
    } catch (err) {
      if (!cancelled.value) {
        if (err instanceof ApiError && err.status === 404) {
          setError("El documento no existe o fue eliminado.")
        } else {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el documento",
          )
        }
      }
    } finally {
      if (!cancelled.value) setLoading(false)
    }
  }

  useEffect(() => {
    const cancelled = { value: false }
    cargarDocumento(cancelled)
    return () => { cancelled.value = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleCambiarEstado(nuevoEstado: EstadoDocumento) {
    if (!doc) return

    setCambiandoEstado(true)

    try {
      await api.patch<DocumentoResponse>(
        `/documentos/${doc.id}/estado?estado=${nuevoEstado}`,
      )

      const cancelled = { value: false }
      await cargarDocumento(cancelled)

      setSuccessMessage({
        title: "Estado actualizado exitosamente",
        description: `El documento ahora se encuentra en estado "${ESTADO_LABEL[nuevoEstado]}".`,
      })

      setSuccessOpen(true)
    } catch (err) {
      setSuccessMessage({
        title: "No se pudo actualizar el estado",
        description:
          err instanceof ApiError
            ? err.message
            : "Inténtalo nuevamente.",
      })

      setSuccessOpen(true)
    } finally {
      setCambiandoEstado(false)
    }
  }

  const ejeNombre =
    doc?.idEjeTematico != null
      ? (ejes.find((e) => e.id === doc.idEjeTematico)?.nombre ?? "—")
      : "—"
  const territoriosAsociados = doc
    ? territorios.filter((t) => doc.idTerritorios.includes(t.id))
    : []
  const respElaboracion = usuarios.find((u) => u.id === doc?.idRespElaboracion)
  const respValidacion = usuarios.find((u) => u.id === doc?.idRespValidacion)

  return (
    <AppLayout title="Detalle de Documento">
      <div className="mx-auto max-w-4xl space-y-6">
        <nav className="flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href="/documentos" className="hover:text-[#1A1A1A]">
            Documentos
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="max-w-md truncate font-medium text-[#1A1A1A]">
            {doc?.titulo ?? "Detalle"}
          </span>
        </nav>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#5C5C5C]">
            <Spinner />
            Cargando documento...
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : doc ? (
          <>
            {/* Encabezado */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-[#1A1A1A]">{doc.titulo}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  {doc.tipo && <TypeBadge tipo={doc.tipo} />}
                  <StatusBadge estado={ESTADO_LABEL[doc.estado] ?? doc.estado} />
                  <span className="inline-flex items-center gap-1 text-xs text-[#5C5C5C]">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatFecha(doc.fechaCarga)}
                  </span>
                </div>
              </div>

              {/* Acciones: Editar + botones de estado contextual */}
              <div className="flex flex-wrap items-center gap-2">
                {puedeEditar && (
                  <Link
                    href={`/documentos/${doc.id}/editar`}
                    className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Link>
                )}
                {/* RF-056: botones de transición de estado contextuales */}
                {doc.estado === "BORRADOR" && puedeEditar && (
                  <button
                    type="button"
                    disabled={cambiandoEstado}
                    onClick={() => handleCambiarEstado("EN_REVISION")}
                    className="flex items-center gap-2 rounded-lg bg-[#0277BD] px-3 py-2 text-sm font-medium text-white hover:bg-[#01579B] disabled:opacity-50"
                  >
                    {cambiandoEstado ? <Spinner /> : null}
                    Enviar a revisión
                  </button>
                )}
                {doc.estado === "EN_REVISION" && puedeValidar && (
                  <>
                    <button
                      type="button"
                      disabled={cambiandoEstado}
                      onClick={() => handleCambiarEstado("PUBLICADO")}
                      className="flex items-center gap-2 rounded-lg bg-[#2E7D32] px-3 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] disabled:opacity-50"
                    >
                      {cambiandoEstado ? <Spinner /> : null}
                      Publicar
                    </button>
                    <button
                      type="button"
                      disabled={cambiandoEstado}
                      onClick={() => handleCambiarEstado("BORRADOR")}
                      className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7] disabled:opacity-50"
                    >
                      Devolver a borrador
                    </button>
                  </>
                )}
                {doc.estado === "PUBLICADO" && puedeValidar && (
                  <button
                    type="button"
                    disabled={cambiandoEstado}
                    onClick={() => handleCambiarEstado("EN_REVISION")}
                    className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7] disabled:opacity-50"
                  >
                    Devolver a revisión
                  </button>
                )}
              </div>
            </div>

            {/* Información */}
            <section className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
              <div className="border-b border-[#E0E0E0] px-6 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                  Información del Documento
                </h2>
              </div>
              <div className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Campo icon={<FileText className="h-4 w-4" />} label="Tipo">
                    {doc.tipo ?? "—"}
                  </Campo>
                  <Campo icon={<Tag className="h-4 w-4" />} label="Estado">
                    {ESTADO_LABEL[doc.estado] ?? doc.estado}
                  </Campo>
                  <Campo icon={<Calendar className="h-4 w-4" />} label="Fecha de carga">
                    {formatFecha(doc.fechaCarga)}
                  </Campo>
                  <Campo icon={<Hash className="h-4 w-4" />} label="Versión">
                    {doc.version != null ? `v${doc.version}` : "—"}
                  </Campo>
                  {doc.enlace && (
                    <div className="md:col-span-2">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[#5C5C5C]">
                        <ExternalLink className="h-4 w-4" />
                        Enlace externo
                      </p>
                      <a
                        href={doc.enlace}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-sm text-[#0277BD] hover:underline"
                      >
                        {doc.enlace}
                      </a>
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-[#5C5C5C]">Descripción</p>
                  <p className="text-sm text-[#1A1A1A]">
                    {doc.descripcion?.trim() || "Sin descripción."}
                  </p>
                </div>
              </div>
            </section>

            {/* Asociaciones */}
            <section className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
              <div className="border-b border-[#E0E0E0] px-6 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                  Asociaciones
                </h2>
              </div>
              <div className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Campo icon={<FolderKanban className="h-4 w-4" />} label="Proyecto vinculado">
                    {proyecto ? (
                      <Link
                        href={`/proyectos/${proyecto.id}`}
                        className="text-[#0277BD] hover:underline"
                      >
                        {proyecto.nombre}
                      </Link>
                    ) : (
                      "Sin proyecto asociado"
                    )}
                  </Campo>
                  <Campo icon={<Tag className="h-4 w-4" />} label="Eje temático">
                    {ejeNombre}
                  </Campo>
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#5C5C5C]">
                    <MapPin className="h-4 w-4" />
                    Territorios asociados
                  </p>
                  {territoriosAsociados.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {territoriosAsociados.map((t) => (
                        <span
                          key={t.id}
                          className="rounded-full bg-[#FFD600] px-3 py-1 text-xs font-medium text-[#1A1A1A]"
                        >
                          {t.nombre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#5C5C5C]">Sin territorios asociados.</p>
                  )}
                </div>
              </div>
            </section>

            {/* Responsables (RF-054/055) */}
            <section className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
              <div className="border-b border-[#E0E0E0] px-6 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                  Responsables
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <Campo icon={<User className="h-4 w-4" />} label="Responsable de elaboración">
                  {nombreCompleto(respElaboracion)}
                </Campo>
                <Campo icon={<User className="h-4 w-4" />} label="Responsable de validación">
                  {respValidacion ? nombreCompleto(respValidacion) : "Sin validador asignado"}
                </Campo>
              </div>
            </section>

            {/* Archivos adjuntos (RF-050) */}
            <section className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
              <div className="border-b border-[#E0E0E0] px-6 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                  Archivos adjuntos
                </h2>
              </div>
              <div className="p-6">
                {archivos.length === 0 ? (
                  <p className="text-sm text-[#5C5C5C]">No hay archivos adjuntos.</p>
                ) : (
                  <div className="space-y-3">
                    {archivos.map((archivo) => (
                      <div
                        key={archivo.id}
                        className="flex items-center justify-between rounded-lg border border-[#E0E0E0] p-4 hover:bg-[#FFFDE7]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFD600]/20">
                            <FileText className="h-5 w-5 text-[#C9A42B]" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#1A1A1A]">
                              {archivo.nombre}
                            </p>
                            {archivo.extension && (
                              <p className="text-xs text-[#5C5C5C] uppercase">
                                {archivo.extension}
                              </p>
                            )}
                          </div>
                        </div>
                        <a
                          href={archivo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-4 flex shrink-0 items-center gap-2 rounded-lg bg-[#F7F7F7] px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#FFD600] hover:text-[#1A1A1A]"
                        >
                          <Download className="h-4 w-4" />
                          Descargar
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
        <SuccessDialog
          open={successOpen}
          title={successMessage.title}
          description={successMessage.description}
          onClose={() => setSuccessOpen(false)}
        />
      </div>
    </AppLayout>
  )
}

function Campo({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[#5C5C5C]">
        <span className="text-[#5C5C5C]">{icon}</span>
        {label}
      </p>
      <div className="text-sm text-[#1A1A1A]">{children}</div>
    </div>
  )
}
