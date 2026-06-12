"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SuccessDialog } from "@/components/ui/success-dialog"
import { AlertCircle, ChevronRight, Save, X} from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/hooks/useAuth"
import { api, ApiError } from "@/lib/api"
import {
  TIPOS_DOCUMENTO,
  type DocumentoCreate,
  type DocumentoResponse,
  type EjeTematico,
  type EstadoDocumento,
  type PageResponse,
  type ProyectoResponse,
  type Territorio,
  type UsuarioResponse,
} from "@/lib/types"

const ESTADOS: Array<{ value: EstadoDocumento; label: string }> = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "EN_REVISION", label: "En revisión" },
  { value: "PUBLICADO", label: "Publicado" },
]

const TITULO_MAX = 255

interface FormState {
  titulo: string
  tipo: string
  descripcion: string
  idProyecto: string
  idEjeTematico: string
  idTerritorios: string[]
  idRespElaboracion: string
  idRespValidacion: string
  estado: EstadoDocumento
}

const initialFormState: FormState = {
  titulo: "",
  tipo: "",
  descripcion: "",
  idProyecto: "",
  idEjeTematico: "",
  idTerritorios: [],
  idRespElaboracion: "",
  idRespValidacion: "",
  estado: "BORRADOR",
}

type FeedbackCard = {
  id: number
  type: "error"
  title: string
  description?: string
}

/** Convierte un value de <select> a number seguro (nunca NaN). */
function toId(value: string): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function nombreCompleto(usuario: UsuarioResponse): string {
  return `${usuario.nombres} ${usuario.apellidos}`.trim()
}

export default function NuevoDocumentoPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [formData, setFormData] = useState<FormState>(initialFormState)
  const [proyectos, setProyectos] = useState<ProyectoResponse[]>([])
  const [ejesTematicos, setEjesTematicos] = useState<EjeTematico[]>([])
  const [territorios, setTerritorios] = useState<Territorio[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(true)
  const [loadingCatalogos, setLoadingCatalogos] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [feedbackCards, setFeedbackCards] = useState<FeedbackCard[]>([])
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
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState({
    title: "",
    description: "",
  })

  useEffect(() => {
    let cancelled = false

    async function loadCatalogos() {
      setLoadingCatalogos(true)
      setError(null)
      try {
        const [proyectosData, ejesData, territoriosData] = await Promise.all([
          api.get<PageResponse<ProyectoResponse>>(
            "/proyectos?page=0&size=100&sort=nombre,asc",
          ),
          api.get<EjeTematico[]>("/ejes-tematicos"),
          api.get<Territorio[]>("/territorios"),
        ])

        if (cancelled) return
        setProyectos(proyectosData.content)
        setEjesTematicos(ejesData)
        setTerritorios(territoriosData)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los catálogos",
          )
        }
      } finally {
        if (!cancelled) setLoadingCatalogos(false)
      }
    }

    loadCatalogos()
    return () => {
      cancelled = true
    }
  }, [])

  // Prefijar el responsable de elaboración con el usuario actual (editable).
  useEffect(() => {
    if (user?.id) {
      setFormData((current) =>
        current.idRespElaboracion
          ? current
          : { ...current, idRespElaboracion: String(user.id) },
      )
    }
  }, [user?.id])

  // /usuarios requiere USUARIOS_READ (solo ADMINISTRADOR/COORDINADOR). Un
  // TECNICO no lo tiene: lo cargamos por separado para que su 403 NO tumbe el
  // resto del formulario. Si falla, degradamos al usuario actual como único
  // responsable seleccionable (la elaboración ya viene prefijada con él).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoadingUsuarios(true)
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
      .finally(() => {
        if (!cancelled) setLoadingUsuarios(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const toggleTerritorio = (id: number) => {
    const value = String(id)
    setFormData((current) => ({
      ...current,
      idTerritorios: current.idTerritorios.includes(value)
        ? current.idTerritorios.filter((item) => item !== value)
        : [...current.idTerritorios, value],
    }))
  }

  const buildPayload = (): DocumentoCreate => {
    const payload: DocumentoCreate = {
      titulo: formData.titulo.trim(),
      tipo: formData.tipo,
      estado: formData.estado,
      idRespElaboracion: Number(formData.idRespElaboracion),
    }

    if (formData.descripcion.trim()) payload.descripcion = formData.descripcion.trim()

    const idProyecto = toId(formData.idProyecto)
    if (idProyecto !== undefined) payload.idProyecto = idProyecto

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

  /** Validación cliente, espejo de las reglas del backend. */
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
      const creado = await api.post<DocumentoResponse>(
        "/documentos",
        buildPayload(),
      )

      setSuccessMessage({
        title: "Documento registrado exitosamente",
        description: `El documento "${creado.titulo}" se ha guardado correctamente.`,
      })

      setSuccessOpen(true)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.body?.fieldErrors?.length) {
          const map: Record<string, string> = {}
          for (const fe of err.body.fieldErrors) map[fe.field] = fe.message
          setFieldErrors(map)
          const mensajes = Object.values(map)
          if (mensajes.length === 1) {
            addFeedbackCard({
              type: "error",
              title: mensajes[0],
              description: "Revisa el campo marcado en el formulario.",
            })
          } else {
            addFeedbackCard({
              type: "error",
              title: "No se pudo registrar el documento",
              description: "Revisa los campos marcados en el formulario.",
            })
          }
        } else if (err.status === 403) {
          addFeedbackCard({
            type: "error",
            title: "No tienes permiso para registrar documentos",
            description: "Requiere rol Técnico o Administrador.",
          })
        } else {
          addFeedbackCard({
            type: "error",
            title: "No se pudo registrar el documento",
            description: err.message,
          })
        }
      } else {
        addFeedbackCard({
          type: "error",
          title: "No se pudo registrar el documento",
          description:
            err instanceof Error ? err.message : "Inténtalo nuevamente.",
        })
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

  return (
    <AppLayout title="Nuevo Documento">
      <div className="mx-auto max-w-4xl space-y-6">
        <nav className="flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href="/documentos" className="hover:text-[#1A1A1A]">
            Documentos
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-[#1A1A1A]">Nuevo Documento</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Registrar Documento</h1>
          <p className="text-sm text-[#5C5C5C]">
            Completa la información del documento o informe institucional
          </p>
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
                    Estado inicial
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(event) =>
                      updateField("estado", event.target.value as EstadoDocumento)
                    }
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                  Descripción
                </label>
                <textarea
                  rows={4}
                  value={formData.descripcion}
                  onChange={(event) => updateField("descripcion", event.target.value)}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="Describe brevemente el contenido y alcance del documento..."
                />
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
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Proyecto vinculado
                  </label>
                  <select
                    value={formData.idProyecto}
                    onChange={(event) => updateField("idProyecto", event.target.value)}
                    disabled={loadingCatalogos}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:opacity-60"
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
                    disabled={loadingCatalogos}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:opacity-60"
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
                {loadingCatalogos ? (
                  <div className="flex items-center gap-2 text-sm text-[#5C5C5C]">
                    <Spinner />
                    Cargando territorios...
                  </div>
                ) : territorios.length > 0 ? (
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

          {/* Responsables */}
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
                    disabled={loadingCatalogos || loadingUsuarios}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:opacity-60 ${fieldErrorClass("idRespElaboracion")}`}
                  >
                    <option value="">
                      {loadingUsuarios
                        ? "Cargando usuarios..."
                        : usuarios.length === 0
                          ? "Sin usuarios disponibles"
                          : "Seleccionar responsable"}
                    </option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {nombreCompleto(usuario)}
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
                    disabled={loadingCatalogos || loadingUsuarios}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:opacity-60 ${fieldErrorClass("idRespValidacion")}`}                  >
                    <option value="">Sin validador asignado</option>
                    {usuarios
                      .filter(
                        (usuario) =>
                          String(usuario.id) !== formData.idRespElaboracion,
                      )
                      .map((usuario) => (
                        <option key={usuario.id} value={usuario.id}>
                          {nombreCompleto(usuario)}
                        </option>
                      ))}
                  </select>
                  <FieldError field="idRespValidacion" />
                </div>
              </div>

              <p className="text-xs text-[#5C5C5C]">
                La fecha de carga se asigna automáticamente al registrar el documento.
              </p>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/documentos"
              className="rounded-lg border border-[#E0E0E0] bg-white px-6 py-2.5 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting || loadingCatalogos}
              className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-6 py-2.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner /> : <Save className="h-4 w-4" />}
              {submitting ? "Registrando..." : "Registrar documento"}
            </button>
          </div>
        </form>

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
            router.push("/documentos")
          }}
        />

      </div>
    </AppLayout>
  )
}
