"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  FileText,
  FolderKanban,
  MapPin,
  Tag,
  User,
} from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { DocumentoAdjuntosEnlaces } from "@/components/documentos/documento-adjuntos-enlaces"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge, TypeBadge } from "@/components/ui/status-badge"
import { api, ApiError } from "@/lib/api"
import type {
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

  const [doc, setDoc] = useState<DocumentoResponse | null>(null)
  const [proyecto, setProyecto] = useState<ProyectoResponse | null>(null)
  const [ejes, setEjes] = useState<EjeTematico[]>([])
  const [territorios, setTerritorios] = useState<Territorio[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const documento = await api.get<DocumentoResponse>(`/documentos/${id}`)
        // Catálogos para resolver nombres (el DTO sólo trae IDs).
        const [ejesData, territoriosData, usuariosData] = await Promise.all([
          api.get<EjeTematico[]>("/ejes-tematicos"),
          api.get<Territorio[]>("/territorios"),
          api.get<PageResponse<UsuarioResponse>>("/usuarios?page=0&size=100"),
        ])
        let proyectoData: ProyectoResponse | null = null
        if (documento.idProyecto != null) {
          proyectoData = await api
            .get<ProyectoResponse>(`/proyectos/${documento.idProyecto}`)
            .catch(() => null)
        }

        if (cancelled) return
        setDoc(documento)
        setEjes(ejesData)
        setTerritorios(territoriosData)
        setUsuarios(usuariosData.content)
        setProyecto(proyectoData)
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setError("El documento no existe o fue eliminado.")
          } else {
            setError(
              err instanceof Error
                ? err.message
                : "No se pudo cargar el documento",
            )
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

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
            <div className="flex items-start justify-between gap-4">
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

            {/* Responsables */}
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

            <DocumentoAdjuntosEnlaces documentoId={doc.id} />
          </>
        ) : null}
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
