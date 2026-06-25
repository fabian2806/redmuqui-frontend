"use client"

import {
  use,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SuccessDialog } from "@/components/ui/success-dialog"
import { AlertCircle, ChevronRight, FileText, Save, Trash2, Upload, X } from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/hooks/useAuth"
import { api, ApiError } from "@/lib/api"
import {
  obtenerArchivosDocumento,
  obtenerUrlDescargaArchivo,
  subirArchivoDocumento,
} from "@/lib/documentos-archivos"
import {
  TIPOS_DOCUMENTO,
  type ArchivoResponse,
  type DocumentoResponse,
  type DocumentoUpdate,
  type EjeTematico,
  type EstadoDocumento,
  type PageResponse,
  type ProyectoResponse,
  type Territorio,
  type UsuarioResponse,
} from "@/lib/types"

const TITULO_MAX = 255
const MAX_FILE_SIZE = 20 * 1024 * 1024

interface FormState {
  titulo: string
  tipo: string
  descripcion: string
  estado: EstadoDocumento
  tipoArchivo: string
  enlace: string
  fechaCarga: string
  idProyecto: string
  idEjeTematico: string
  idTerritorios: string[]
  idRespElaboracion: string
  idRespValidacion: string
}

const emptyFormState: FormState = {
  titulo: "",
  tipo: "",
  descripcion: "",
  estado: "BORRADOR",
  tipoArchivo: "",
  enlace: "",
  fechaCarga: new Date().toISOString().split("T")[0],
  idProyecto: "",
  idEjeTematico: "",
  idTerritorios: [],
  idRespElaboracion: "",
  idRespValidacion: "",
}

type FeedbackCard = {
  id: number
  type: "error"
  title: string
  description?: string
}

function toId(value: string): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function nombreCompleto(usuario: UsuarioResponse): string {
  return `${usuario.nombres} ${usuario.apellidos}`.trim()
}

export default function EditarDocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { hasPermission, user } = useAuth()
  const puedeValidar = hasPermission("DOCUMENTOS_VALIDATE")

  const [formData, setFormData] = useState<FormState>(emptyFormState)
  const [tituloOriginal, setTituloOriginal] = useState<string>("")
  const [estadoOriginal, setEstadoOriginal] = useState<EstadoDocumento>("BORRADOR")
  const [proyectos, setProyectos] = useState<ProyectoResponse[]>([])
  const [ejesTematicos, setEjesTematicos] = useState<EjeTematico[]>([])
  const [territorios, setTerritorios] = useState<Territorio[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [successOpen, setSuccessOpen] = useState(false)

  const [successMessage, setSuccessMessage] = useState({
    title: "",
    description: "",
  })

  const [feedbackCards, setFeedbackCards] = useState<FeedbackCard[]>([])
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<File[]>([])
  const [archivosGuardados, setArchivosGuardados] = useState<ArchivoResponse[]>([])
  const [idSubactividad, setIdSubactividad] = useState<number | null>(null)
  const [returnPath, setReturnPath] = useState("/documentos")

  useEffect(() => {
    const volver = new URLSearchParams(window.location.search).get("returnTo")
    if (volver?.startsWith("/")) setReturnPath(volver)
  }, [])

  const addFeedbackCard = (card: Omit<FeedbackCard, "id">) => {
    const id = Date.now()

    setFeedbackCards((prev) => [
      ...prev,
      {
        id,
        ...card,
      },
    ])

    setTimeout(() => {
      setFeedbackCards((prev) => prev.filter((item) => item.id !== id))
    }, 5000)
  }

  const removeFeedbackCard = (id: number) => {
    setFeedbackCards((prev) => prev.filter((item) => item.id !== id))
  }

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        // /usuarios NO va aquí: requiere USUARIOS_READ y un TECNICO/CONSULTOR
        // recibe 403. Se carga en un useEffect aparte (más abajo) con fallback
        // para no romper la pantalla. Los archivos sí: quien puede editar el
        // documento puede listarlos.
        const [docData, proyectosData, ejesData, territoriosData, archivosData] =
          await Promise.all([
            api.get<DocumentoResponse>(`/documentos/${id}`),
            api.get<PageResponse<ProyectoResponse>>(
              "/proyectos?page=0&size=100&sort=nombre,asc",
            ),
            api.get<EjeTematico[]>("/ejes-tematicos"),
            api.get<Territorio[]>("/territorios"),
            obtenerArchivosDocumento(Number(id)),
          ])

        if (cancelled) return

        // Mapear el documento existente al FormState
        setFormData({
          titulo: docData.titulo ?? "",
          tipo: docData.tipo ?? "",
          descripcion: docData.descripcion ?? "",
          estado: docData.estado,
          tipoArchivo: docData.tipoArchivo ?? "",
          enlace: docData.enlace ?? "",
          fechaCarga: docData.fechaCarga
            ? docData.fechaCarga.split("T")[0]
            : new Date().toISOString().split("T")[0],
          idProyecto: docData.idProyecto != null ? String(docData.idProyecto) : "",
          idEjeTematico:
            docData.idEjeTematico != null ? String(docData.idEjeTematico) : "",
          idTerritorios: docData.idTerritorios.map(String),
          idRespElaboracion:
            docData.idRespElaboracion != null
              ? String(docData.idRespElaboracion)
              : "",
          idRespValidacion:
            docData.idRespValidacion != null
              ? String(docData.idRespValidacion)
              : "",
        })
        setTituloOriginal(docData.titulo)
        setEstadoOriginal(docData.estado)
        setIdSubactividad(docData.idSubactividad)
        setProyectos(proyectosData.content)
        setEjesTematicos(ejesData)
        setTerritorios(territoriosData)
        setArchivosGuardados(archivosData)
        // setUsuarios lo gestiona el useEffect dedicado a /usuarios (con fallback 403)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los datos del documento",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [id])

  // /usuarios requiere USUARIOS_READ (solo ADMINISTRADOR/COORDINADOR). Un
  // TECNICO con DOCUMENTOS_UPDATE puede editar pero no listar usuarios: lo
  // cargamos por separado para que su 403 NO impida cargar el documento. Si
  // falla, degradamos al usuario actual; los responsables ya asignados al
  // documento se conservan en el formulario y se reenvían al guardar.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    api
      .get<PageResponse<UsuarioResponse>>(
        "/usuarios?page=0&size=100&sort=apellidos,asc",
      )
      .then((data) => {
        if (!cancelled) setUsuarios(data.content.filter((u) => u.estado))
      })
      .catch(() => {
        if (!cancelled) setUsuarios([user])
      })
    return () => {
      cancelled = true
    }
  }, [user])

  // Opciones de responsable: la lista de /usuarios MÁS los responsables ya
  // asignados al documento que no estén en ella (caso TECNICO sin USUARIOS_READ:
  // se muestran como "Usuario #id" para no perderlos ni reasignarlos por error).
  const responsableOptions = useMemo(() => {
    const opciones = usuarios.map((u) => ({ id: u.id, label: nombreCompleto(u) }))
    const asegurar = (idStr: string) => {
      const idNum = Number(idStr)
      if (idStr && Number.isFinite(idNum) && !opciones.some((o) => o.id === idNum)) {
        opciones.push({ id: idNum, label: `Usuario #${idStr}` })
      }
    }
    asegurar(formData.idRespElaboracion)
    asegurar(formData.idRespValidacion)
    return opciones
  }, [usuarios, formData.idRespElaboracion, formData.idRespValidacion])

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const toggleTerritorio = (territorioId: number) => {
    const value = String(territorioId)
    setFormData((current) => ({
      ...current,
      idTerritorios: current.idTerritorios.includes(value)
        ? current.idTerritorios.filter((item) => item !== value)
        : [...current.idTerritorios, value],
    }))
  }

  const handleArchivosChange = (event: ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(event.target.files ?? [])

  if (files.length === 0) return

  const archivosInvalidos = files.filter((file) => {
    const nombre = file.name.toLowerCase()

    const extensionValida =
      nombre.endsWith(".pdf") ||
      nombre.endsWith(".docx") ||
      nombre.endsWith(".xlsx")

    const tamanioValido = file.size <= MAX_FILE_SIZE

    return !extensionValida || !tamanioValido
  })

  if (archivosInvalidos.length > 0) {
    addFeedbackCard({
      type: "error",
      title: "Archivo no permitido",
      description: "Solo se permiten archivos PDF, DOCX o XLSX de máximo 20 MB.",
    })
  }

  const archivosValidos = files.filter((file) => {
    const nombre = file.name.toLowerCase()

    const extensionValida =
      nombre.endsWith(".pdf") ||
      nombre.endsWith(".docx") ||
      nombre.endsWith(".xlsx")

    const tamanioValido = file.size <= MAX_FILE_SIZE

    return extensionValida && tamanioValido
  })

  setArchivosAdjuntos((current) => {
    const nuevos = archivosValidos.filter(
      (file) =>
        !current.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified,
        ),
    )
    return [...current, ...nuevos]
  })

    event.target.value = ""
  }

  const removeArchivoAdjunto = (index: number) => {
    setArchivosAdjuntos((current) => current.filter((_, i) => i !== index))
  }

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDescargarArchivo = async (archivo: ArchivoResponse) => {
    try {
      const url = await obtenerUrlDescargaArchivo(Number(id), archivo.id)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      addFeedbackCard({
        type: "error",
        title: "No se pudo descargar el archivo",
        description:
          err instanceof Error ? err.message : "Inténtalo nuevamente.",
      })
    }
  }

  const buildPayload = (): DocumentoUpdate => {
    const payload: DocumentoUpdate = {
      titulo: formData.titulo.trim(),
      tipo: formData.tipo,
      estado: formData.estado,
      fechaCarga: formData.fechaCarga,
      idRespElaboracion: Number(formData.idRespElaboracion),
    }

    if (formData.descripcion.trim()) payload.descripcion = formData.descripcion.trim()
    if (formData.tipoArchivo.trim()) payload.tipoArchivo = formData.tipoArchivo.trim()
    if (formData.enlace.trim()) payload.enlace = formData.enlace.trim()

    const idProyecto = toId(formData.idProyecto)
    if (idProyecto !== undefined) payload.idProyecto = idProyecto
    if (idSubactividad !== null) {
      payload.idSubactividad = idSubactividad
      payload.tipoVinculo = "ENTREGABLE_FINAL"
    }

    const idEjeTematico = toId(formData.idEjeTematico)
    if (idEjeTematico !== undefined) payload.idEjeTematico = idEjeTematico

    const idRespValidacion = toId(formData.idRespValidacion)
    if (idRespValidacion !== undefined) payload.idRespValidacion = idRespValidacion

    if (formData.idTerritorios.length > 0) {
      payload.idTerritorios = formData.idTerritorios
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0)
    }

    return payload
  }

  const validar = (): Record<string, string> => {
  const errors: Record<string, string> = {}
    if (!formData.titulo.trim()) {
      errors.titulo = "El título es obligatorio"
    } else if (formData.titulo.trim().length > TITULO_MAX) {
      errors.titulo = `El título no puede superar los ${TITULO_MAX} caracteres`
    }

    if (!formData.tipo) {
      errors.tipo = "Selecciona el tipo de documento"
    } else if (!TIPOS_DOCUMENTO.includes(formData.tipo as never)) {
      errors.tipo = "El tipo de documento no es válido"
    }

    if (!formData.idRespElaboracion) {
      errors.idRespElaboracion = "Selecciona el responsable de elaboración"
    }

    if (!formData.fechaCarga) {
      errors.fechaCarga = "La fecha de carga es obligatoria"
    }

    if (
      formData.idRespValidacion &&
      formData.idRespValidacion === formData.idRespElaboracion
    ) {
      errors.idRespValidacion =
        "El responsable de validación debe ser distinto al de elaboración"
    }

    return errors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

  const validationErrors = validar()

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)

      const mensajes = Object.values(validationErrors)

      if (mensajes.length === 1) {
        addFeedbackCard({
          type: "error",
          title: mensajes[0],
          description: "Revisa el campo marcado en el formulario.",
        })
      } else {
        addFeedbackCard({
          type: "error",
          title: "Formulario incompleto",
          description: "Completa los campos obligatorios para continuar.",
        })
      }

      return
    }

    setSubmitting(true)
    try {
      const actualizado = await api.put<DocumentoResponse>(
        `/documentos/${id}`,
        buildPayload(),
      )

      if (archivosAdjuntos.length > 0) {
        await Promise.all(
          archivosAdjuntos.map((archivo) =>
            subirArchivoDocumento(Number(id), archivo),
          ),
        )
      }

      setArchivosAdjuntos([])

      setSuccessMessage({
        title: "Documento actualizado exitosamente",
        description: `El documento "${actualizado.titulo}" se ha actualizado correctamente.`,
      })

      setSuccessOpen(true)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body?.fieldErrors?.length) {
          const map: Record<string, string> = {}
          for (const fe of err.body.fieldErrors) map[fe.field] = fe.message
          setFieldErrors(map)
          setError("Revisa los campos marcados.")
        } else if (err.status === 403) {
          setError("No tienes permiso para editar este documento.")
        } else {
          setError(err.message)
        }
      } else {
        setError(
          err instanceof Error ? err.message : "No se pudo actualizar el documento",
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const fieldErrorClass = (field: string) =>
    fieldErrors[field] ? "border-[#C8102E]" : "border-[#E0E0E0]"

  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <p className="mt-1 text-xs font-medium text-[#C8102E]">{fieldErrors[field]}</p>
    ) : null
  const returnLabel = returnPath.startsWith("/proyectos/") ? "Proyecto" : "Documentos"
  const detailPath = returnPath !== "/documentos"
    ? `/documentos/${id}?returnTo=${encodeURIComponent(returnPath)}`
    : `/documentos/${id}`

  // Estados disponibles según el permiso del usuario (RF-056)
  const estadosDisponibles: Array<{ value: EstadoDocumento; label: string }> =
    estadoOriginal === "BORRADOR"
      ? [
          { value: "BORRADOR", label: "Borrador" },
          { value: "EN_REVISION", label: "En revisión" },
        ]
      : estadoOriginal === "EN_REVISION"
        ? [
            { value: "EN_REVISION", label: "En revisión" },
            ...(puedeValidar
              ? [
                  { value: "BORRADOR" as EstadoDocumento, label: "Borrador" },
                  { value: "PUBLICADO" as EstadoDocumento, label: "Publicado" },
                ]
              : []),
          ]
        : [
            { value: "PUBLICADO", label: "Publicado" },
            ...(puedeValidar
              ? [{ value: "EN_REVISION" as EstadoDocumento, label: "En revisión" }]
              : []),
          ]

  return (
    <AppLayout title="Editar Documento">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href={returnPath} className="hover:text-[#1A1A1A]">
            {returnLabel}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={detailPath}
            className="max-w-xs truncate hover:text-[#1A1A1A]"
          >
            {tituloOriginal || "Documento"}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-[#1A1A1A]">Editar</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Editar Documento</h1>
          <p className="text-sm text-[#5C5C5C]">
            Modifica la información del documento o informe institucional
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#5C5C5C]">
            <Spinner />
            Cargando datos del documento...
          </div>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Información del documento */}
              <section className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
                <div className="border-b border-[#E0E0E0] px-6 py-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                    Información del Documento
                  </h2>
                </div>
                <div className="space-y-4 p-6">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                      Título del documento *
                    </label>
                    <input
                      type="text"
                      maxLength={TITULO_MAX}
                      value={formData.titulo}
                      onChange={(event) => updateField("titulo", event.target.value)}
                      className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] ${fieldErrorClass("titulo")}`}
                      placeholder="Ej: Informe sobre agua, minería y crisis climática 2025"
                    />
                    <FieldError field="titulo" />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                        Tipo de documento *
                      </label>
                      <select
                        value={formData.tipo}
                        onChange={(event) => updateField("tipo", event.target.value)}
                        className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] ${fieldErrorClass("tipo")}`}
                      >
                        <option value="">Seleccionar tipo</option>
                        {TIPOS_DOCUMENTO.map((tipo) => (
                          <option key={tipo} value={tipo}>
                            {tipo}
                          </option>
                        ))}
                      </select>
                      <FieldError field="tipo" />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                        Estado *
                      </label>
                      <select
                        value={formData.estado}
                        onChange={(event) =>
                          updateField("estado", event.target.value as EstadoDocumento)
                        }
                        className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                      >
                        {estadosDisponibles.map((estado) => (
                          <option key={estado.value} value={estado.value}>
                            {estado.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                        Fecha de carga *
                      </label>
                      <input
                        type="date"
                        value={formData.fechaCarga}
                        onChange={(event) =>
                          updateField("fechaCarga", event.target.value)
                        }
                        className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] ${fieldErrorClass("fechaCarga")}`}
                      />
                      <FieldError field="fechaCarga" />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                        Enlace externo
                      </label>
                      <input
                        type="url"
                        value={formData.enlace}
                        onChange={(event) => updateField("enlace", event.target.value)}
                        className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                      Descripción
                    </label>
                    <textarea
                      rows={4}
                      value={formData.descripcion}
                      onChange={(event) =>
                        updateField("descripcion", event.target.value)
                      }
                      className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                      placeholder="Describe brevemente el contenido y alcance del documento..."
                    />
                  </div>
                </div>
              </section>

              {/* Adjuntos */}
              <section className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
                <div className="border-b border-[#E0E0E0] px-6 py-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                    Archivos adjuntos
                  </h2>
                </div>

                <div className="space-y-4 p-6">
                  {archivosGuardados.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-[#5C5C5C]">
                        Archivos ya guardados
                      </p>

                      <div className="space-y-2">
                        {archivosGuardados.map((archivo) => (
                          <div
                            key={archivo.id}
                            className="flex items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-4 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFD600]/20 text-[#1A1A1A]">
                                <FileText className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#1A1A1A]">
                                  {archivo.nombre}
                                </p>
                                <p className="text-xs text-[#5C5C5C]">
                                  Archivo guardado
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDescargarArchivo(archivo)}
                              className="ml-3 rounded-lg border border-[#E0E0E0] px-3 py-2 text-xs font-medium text-[#5C5C5C] hover:bg-[#FFD600] hover:text-[#1A1A1A]"
                            >
                              Descargar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <label
                    htmlFor="archivosAdjuntos"
                    className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E0E0E0] bg-[#F7F7F7] px-6 py-8 text-center transition-colors hover:border-[#FFD600] hover:bg-[#FFD600]/10"
                  >
                    <Upload className="mb-3 h-8 w-8 text-[#5C5C5C]" />

                    <span className="text-sm font-semibold text-[#1A1A1A]">
                      Selecciona archivos para adjuntar
                    </span>

                    <span className="mt-1 text-xs text-[#5C5C5C]">
                      Puedes adjuntar archivos PDF, DOCX o XLSX de hasta 20 MB.
                    </span>

                    <span className="mt-2 text-xs font-medium text-[#C9A42B]">
                      Los nuevos archivos se subirán al guardar los cambios.
                    </span>

                    <input
                      id="archivosAdjuntos"
                      type="file"
                      multiple
                      accept=".pdf,.docx,.xlsx"
                      onChange={handleArchivosChange}
                      className="hidden"
                    />
                  </label>

                  {archivosAdjuntos.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-[#5C5C5C]">
                        {archivosAdjuntos.length} archivo
                        {archivosAdjuntos.length === 1 ? "" : "s"} seleccionado
                        {archivosAdjuntos.length === 1 ? "" : "s"} para adjuntar
                      </p>

                      <div className="space-y-2">
                        {archivosAdjuntos.map((archivo, index) => (
                          <div
                            key={`${archivo.name}-${archivo.size}-${archivo.lastModified}`}
                            className="flex items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-4 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFD600]/20 text-[#1A1A1A]">
                                <FileText className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#1A1A1A]">
                                  {archivo.name}
                                </p>
                                <p className="text-xs text-[#5C5C5C]">
                                  {formatFileSize(archivo.size)}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeArchivoAdjunto(index)}
                              className="ml-3 rounded-lg p-2 text-[#5C5C5C] hover:bg-[#C8102E]/10 hover:text-[#C8102E]"
                              aria-label={`Quitar archivo ${archivo.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#5C5C5C]">
                      Todavía no has seleccionado nuevos archivos para adjuntar.
                    </p>
                  )}
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
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                        Proyecto vinculado
                      </label>
                      <select
                        value={formData.idProyecto}
                        onChange={(event) =>
                          updateField("idProyecto", event.target.value)
                        }
                        disabled={idSubactividad !== null}
                        className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:bg-[#F7F7F7] disabled:opacity-80"
                      >
                        <option value="">Sin proyecto asociado</option>
                        {proyectos.map((proyecto) => (
                          <option key={proyecto.id} value={proyecto.id}>
                            {proyecto.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                        Eje temático
                      </label>
                      <select
                        value={formData.idEjeTematico}
                        onChange={(event) =>
                          updateField("idEjeTematico", event.target.value)
                        }
                        className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                      >
                        <option value="">Seleccionar eje temático</option>
                        {ejesTematicos.map((eje) => (
                          <option key={eje.id} value={eje.id}>
                            {eje.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-[#5C5C5C]">
                      Territorios asociados
                    </label>
                    {territorios.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {territorios.map((territorio) => {
                          const selected = formData.idTerritorios.includes(
                            String(territorio.id),
                          )
                          return (
                            <button
                              key={territorio.id}
                              type="button"
                              onClick={() => toggleTerritorio(territorio.id)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                selected
                                  ? "bg-[#FFD600] text-[#1A1A1A]"
                                  : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                              }`}
                            >
                              {territorio.nombre}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[#5C5C5C]">
                        No hay territorios configurados todavía.
                      </p>
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
                <div className="space-y-4 p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                        Responsable de elaboración *
                      </label>
                      <select
                        value={formData.idRespElaboracion}
                        onChange={(event) =>
                          updateField("idRespElaboracion", event.target.value)
                        }
                        disabled={responsableOptions.length === 0}
                        className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:opacity-60 ${fieldErrorClass("idRespElaboracion")}`}
                      >
                        <option value="">Seleccionar responsable</option>
                        {responsableOptions.map((opcion) => (
                          <option key={opcion.id} value={opcion.id}>
                            {opcion.label}
                          </option>
                        ))}
                      </select>
                      <FieldError field="idRespElaboracion" />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                        Responsable de validación
                      </label>
                      <select
                        value={formData.idRespValidacion}
                        onChange={(event) =>
                          updateField("idRespValidacion", event.target.value)
                        }
                        disabled={responsableOptions.length === 0}
                        className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:opacity-60 ${fieldErrorClass("idRespValidacion")}`}
                      >
                        <option value="">Sin validador asignado</option>
                        {responsableOptions
                          .filter(
                            (opcion) =>
                              String(opcion.id) !== formData.idRespElaboracion,
                          )
                          .map((opcion) => (
                            <option key={opcion.id} value={opcion.id}>
                              {opcion.label}
                            </option>
                          ))}
                      </select>
                      <FieldError field="idRespValidacion" />
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Link
                  href={detailPath}
                  className="rounded-lg border border-[#E0E0E0] bg-white px-6 py-2.5 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-6 py-2.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Spinner /> : <Save className="h-4 w-4" />}
                  {submitting ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </>
        )}
        {feedbackCards.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50 flex w-[min(92vw,420px)] flex-col gap-3">
            {feedbackCards.map((card) => (
              <div
                key={card.id}
                className="rounded-xl border border-[#C8102E]/20 bg-white p-4 shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#C8102E]">
                    <AlertCircle className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-[#C8102E]">
                      {card.title}
                    </p>

                    {card.description && (
                      <p className="mt-1 text-sm text-[#5C5C5C]">
                        {card.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFeedbackCard(card.id)}
                    className="text-[#5C5C5C] hover:text-[#1A1A1A]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <SuccessDialog
          open={successOpen}
          title={successMessage.title}
          description={successMessage.description}
          onClose={() => {
            setSuccessOpen(false)
            router.push(detailPath)
          }}
        />
      </div>
    </AppLayout>
  )
}
