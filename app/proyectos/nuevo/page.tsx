"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, ChevronRight, Save } from "lucide-react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { AppLayout } from "@/components/layout/app-layout"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/hooks/useAuth"
import { api, ApiError } from "@/lib/api"
import type {
  AsociarInstitucionesRequest,
  EjeTematico,
  Institucion,
  Macroregion,
  PageResponse,
  ProyectoCreate,
  ProyectoResponse,
  Territorio,
  UsuarioResponse,
} from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const PRIORIDADES = [
  { value: "", label: "Sin prioridad" },
  { value: "3", label: "Alta" },
  { value: "2", label: "Media" },
  { value: "1", label: "Baja" },
]

interface FormState {
  nombre: string
  codigoInterno: string
  descripcion: string
  objetivoGeneral: string
  idMacroregiones: string[]
  idEjeTematico: string
  idTerritorios: string[]
  idInstituciones: string[]
  idResponsablePrincipal: string
  fechaInicio: string
  fechaFinEstimada: string
  nivelPrioridad: string
  presupuesto: string
}

const initialFormState: FormState = {
  nombre: "",
  codigoInterno: "",
  descripcion: "",
  objetivoGeneral: "",
  idMacroregiones: [],
  idEjeTematico: "",
  idTerritorios: [],
  idInstituciones: [],
  idResponsablePrincipal: "",
  fechaInicio: "",
  fechaFinEstimada: "",
  nivelPrioridad: "",
  presupuesto: "",
}

function toOptionalNumber(value: string): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime())
}

function nombreCompleto(usuario: UsuarioResponse): string {
  return `${usuario.nombres} ${usuario.apellidos}`.trim()
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase()
}

function generarSiguienteCodigo(ultimoCodigo: string | null): string {
  const currentYear = new Date().getFullYear()
  if (!ultimoCodigo) {
    return `PRY-${currentYear}-0001`
  }
  const match = ultimoCodigo.match(/^PRY-(\d{4})-(\d+)$/i)
  if (!match) {
    return `PRY-${currentYear}-0001`
  }
  const lastYear = Number.parseInt(match[1], 10)
  const lastSeq = Number.parseInt(match[2], 10)
  if (lastYear < currentYear) {
    return `PRY-${currentYear}-0001`
  }
  return `PRY-${currentYear}-${String(lastSeq + 1).padStart(4, "0")}`
}

function getProyectoFormErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permisos suficientes para registrar proyectos. Cierra sesión y vuelve a ingresar para actualizar tus permisos."
    }
    if (error.status === 400 && error.body?.message?.includes("JSON")) {
      return "Revisa los campos del formulario. Alguna fecha o valor seleccionado no tiene un formato válido."
    }
    return error.body?.message ?? error.message
  }
  if (error instanceof Error) return error.message
  return "No se pudo crear el proyecto"
}

export default function NuevoProyectoPage() {
  const router = useRouter()
  const { loading: authLoading, hasPermission } = useAuth()
  const puedeCrearProyectos = hasPermission("PROYECTOS_CREATE")
  const [formData, setFormData] = useState<FormState>(initialFormState)
  const [macroregiones, setMacroregiones] = useState<Macroregion[]>([])
  const [ejesTematicos, setEjesTematicos] = useState<EjeTematico[]>([])
  const [territorios, setTerritorios] = useState<Territorio[]>([])
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [loadingCatalogos, setLoadingCatalogos] = useState(true)
  const [loadingUsuarios, setLoadingUsuarios] = useState(true)
  const [loadingCodigo, setLoadingCodigo] = useState(true)
  const [territorioSearch, setTerritorioSearch] = useState("")
  const [institucionSearch, setInstitucionSearch] = useState("")
  const [responsableSearch, setResponsableSearch] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null)

  useEffect(() => {
    if (authLoading || !puedeCrearProyectos) return

    let cancelled = false

    async function loadCatalogos() {
      setLoadingCatalogos(true)
      setError(null)
      try {
        const [macroregionesData, ejesData, territoriosData, institucionesData] = await Promise.all([
          api.get<Macroregion[]>("/macroregiones"),
          api.get<EjeTematico[]>("/ejes-tematicos"),
          api.get<Territorio[]>("/territorios"),
          api.get<Institucion[]>("/instituciones"),
        ])

        if (!cancelled) {
          setMacroregiones(macroregionesData)
          setEjesTematicos(ejesData)
          setTerritorios(territoriosData)
          setInstituciones(institucionesData)
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los catálogos"
          setError(message)
        }
      } finally {
        if (!cancelled) setLoadingCatalogos(false)
      }
    }

    async function loadUsuarios() {
      setLoadingUsuarios(true)
      try {
        const data = await api.get<PageResponse<UsuarioResponse>>(
          "/usuarios?page=0&size=100&sort=apellidos,asc",
        )
        if (!cancelled) setUsuarios(data.content.filter((usuario) => usuario.estado))
      } catch {
        if (!cancelled) setUsuarios([])
      } finally {
        if (!cancelled) setLoadingUsuarios(false)
      }
    }

    async function loadUltimoCodigo() {
      try {
        const data = await api.get<{ ultimoCodigo: string }>("/proyectos/ultimo-codigo")
        if (!cancelled) {
          const codigo = generarSiguienteCodigo(data.ultimoCodigo || null)
          setFormData((current) => ({ ...current, codigoInterno: codigo }))
        }
      } catch {
        if (!cancelled) {
          setFormData((current) => ({
            ...current,
            codigoInterno: generarSiguienteCodigo(null),
          }))
        }
      } finally {
        if (!cancelled) setLoadingCodigo(false)
      }
    }

    loadCatalogos()
    loadUsuarios()
    loadUltimoCodigo()

    return () => {
      cancelled = true
    }
  }, [authLoading, puedeCrearProyectos])

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((current) => ({ ...current, [field]: value }))
    setFieldErrors((prev) => {
      const { [field]: _, ...rest } = prev
      return rest
    })
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

  const toggleMacroregion = (id: number) => {
    const value = String(id)
    setFormData((current) => ({
      ...current,
      idMacroregiones: current.idMacroregiones.includes(value)
        ? current.idMacroregiones.filter((item) => item !== value)
        : [...current.idMacroregiones, value],
    }))
    setFieldErrors((prev) => {
      const { idMacroregiones: _, ...rest } = prev
      return rest
    })
  }

  const toggleInstitucion = (id: number) => {
    const value = String(id)
    setFormData((current) => ({
      ...current,
      idInstituciones: current.idInstituciones.includes(value)
        ? current.idInstituciones.filter((item) => item !== value)
        : [...current.idInstituciones, value],
    }))
  }

  const buildPayload = (): ProyectoCreate => {
    const payload: ProyectoCreate = {
      nombre: formData.nombre.trim(),
      codigoInterno: formData.codigoInterno.trim(),
      fechaInicio: formData.fechaInicio,
    }

    if (formData.descripcion.trim()) {
      payload.descripcion = formData.descripcion.trim()
    }
    if (formData.objetivoGeneral.trim()) {
      payload.objetivoGeneral = formData.objetivoGeneral.trim()
    }
    if (formData.fechaFinEstimada) {
      payload.fechaFinEstimada = formData.fechaFinEstimada
    }
    if (formData.idMacroregiones.length > 0) {
      payload.idMacroregiones = formData.idMacroregiones.map(Number)
    }
    if (formData.idEjeTematico) {
      payload.idEjeTematico = Number(formData.idEjeTematico)
    }
    if (formData.idResponsablePrincipal) {
      payload.idResponsablePrincipal = Number(formData.idResponsablePrincipal)
    }
    if (formData.idTerritorios.length > 0) {
      payload.idTerritorios = formData.idTerritorios.map(Number)
    }

    const nivelPrioridad = toOptionalNumber(formData.nivelPrioridad)
    if (nivelPrioridad !== undefined) payload.nivelPrioridad = nivelPrioridad

    const presupuesto = toOptionalNumber(formData.presupuesto)
    if (presupuesto !== undefined) payload.presupuesto = presupuesto

    return payload
  }

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!formData.nombre.trim()) {
      errors.nombre = "El nombre del proyecto es obligatorio"
    }
    if (!formData.idEjeTematico) {
      errors.idEjeTematico = "Selecciona un eje temático"
    }
    if (formData.idMacroregiones.length === 0) {
      errors.idMacroregiones = "Selecciona al menos una macrorregión"
    }
    if (!formData.idResponsablePrincipal) {
      errors.idResponsablePrincipal = "Selecciona un responsable principal"
    }
    if (!formData.fechaInicio) {
      errors.fechaInicio = "La fecha de inicio es obligatoria"
    } else if (!isIsoDate(formData.fechaInicio)) {
      errors.fechaInicio = "La fecha de inicio no tiene un formato válido"
    }
    if (formData.fechaFinEstimada && !isIsoDate(formData.fechaFinEstimada)) {
      errors.fechaFinEstimada = "La fecha de fin estimada no tiene un formato válido"
    }
    if (
      formData.fechaFinEstimada &&
      formData.fechaInicio &&
      isIsoDate(formData.fechaFinEstimada) &&
      isIsoDate(formData.fechaInicio) &&
      formData.fechaFinEstimada < formData.fechaInicio
    ) {
      errors.fechaFinEstimada =
        "La fecha de fin estimada no puede ser anterior a la fecha de inicio"
    }
    if (formData.presupuesto && !Number.isFinite(Number(formData.presupuesto))) {
      errors.presupuesto = "El presupuesto debe ser un número válido"
    } else if (formData.presupuesto && Number(formData.presupuesto) < 0) {
      errors.presupuesto = "El presupuesto no puede ser negativo"
    }
    return errors
  }

  const territoriosFiltrados = territorios.filter((territorio) =>
    normalizeSearch(territorio.nombre).includes(normalizeSearch(territorioSearch)),
  )

  const institucionesFiltradas = instituciones.filter((institucion) =>
    normalizeSearch(institucion.nombre).includes(normalizeSearch(institucionSearch)),
  )

  const responsablesFiltrados = usuarios.filter((usuario) => {
    const texto = `${usuario.nombres} ${usuario.apellidos} ${usuario.email}`
    return normalizeSearch(texto).includes(normalizeSearch(responsableSearch))
  })

  const responsableSeleccionado = usuarios.find((usuario) =>
    String(usuario.id) === formData.idResponsablePrincipal,
  )

  const responsablesVisibles = responsableSeleccionado && !responsablesFiltrados.some((usuario) => usuario.id === responsableSeleccionado.id)
    ? [responsableSeleccionado, ...responsablesFiltrados]
    : responsablesFiltrados

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstField = Object.keys(errors)[0]
      const el = document.querySelector(`[data-field="${firstField}"]`)
      el?.scrollIntoView({ behavior: "smooth", block: "start" })
      const input = el?.querySelector("input, select, textarea, button")
      if (input instanceof HTMLElement) input.focus()
      return
    }

    setSubmitting(true)
    try {
      const creado = await api.post<ProyectoResponse>("/proyectos", buildPayload())
      if (formData.idInstituciones.length > 0) {
        const institucionesPayload: AsociarInstitucionesRequest = {
          instituciones: formData.idInstituciones.map((idInstitucion) => ({
            idInstitucion: Number(idInstitucion),
            tipoParticipacion: "Miembro",
          })),
        }
        await api.post<void>(`/proyectos/${creado.id}/instituciones`, institucionesPayload)
      }
      setCreatedProjectId(creado.id)
      setShowSuccessModal(true)
    } catch (err) {
      if (err instanceof ApiError && err.body?.fieldErrors?.length) {
        const backendErrors: Record<string, string> = {}
        err.body.fieldErrors.forEach((fieldError) => {
          backendErrors[fieldError.field] = fieldError.message
        })
        setFieldErrors(backendErrors)
        const firstField = err.body.fieldErrors[0]?.field
        const el = firstField ? document.querySelector(`[data-field="${firstField}"]`) : null
        el?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      setError(getProyectoFormErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout title="Nuevo Proyecto">
      <PermissionGuard permiso="PROYECTOS_CREATE">
      <div className="mx-auto max-w-4xl space-y-6">
        <nav className="flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href="/proyectos" className="hover:text-[#1A1A1A]">
            Proyectos
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-[#1A1A1A]">Nuevo Proyecto</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            Crear Nuevo Proyecto
          </h1>
          <p className="text-sm text-[#5C5C5C]">
            Registra los datos base del proyecto
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

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <section className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Información General
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2" data-field="nombre">
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Nombre del proyecto <span className="text-[#C8102E]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={50}
                      value={formData.nombre}
                      onChange={(event) => updateField("nombre", event.target.value)}
                      className={`w-full rounded-lg border px-4 py-2.5 pr-16 text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 ${
                        fieldErrors.nombre
                          ? "border-[#C8102E] focus:border-[#C8102E] focus:ring-[#C8102E]"
                          : "border-[#E0E0E0] focus:border-[#FFD600] focus:ring-[#FFD600]"
                      }`}
                      placeholder="Ej: Monitoreo Ambiental Comunitario - Conga"
                    />
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${formData.nombre.length >= 50 ? "text-[#C8102E]" : formData.nombre.length >= 40 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{formData.nombre.length}/50</span>
                  </div>
                  {fieldErrors.nombre && (
                    <p className="mt-1 text-xs text-[#C8102E]">{fieldErrors.nombre}</p>
                  )}
                </div>
                <div data-field="codigoInterno">
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Código interno <span className="text-[#C8102E]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled
                    value={formData.codigoInterno}
                    className="w-full cursor-not-allowed rounded-lg border border-[#E0E0E0] bg-gray-50 px-4 py-2.5 text-sm text-[#5C5C5C] opacity-70"
                    placeholder="Generando código..."
                  />
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Código autogenerado
                  </p>
                </div>
                <div data-field="idEjeTematico">
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Eje temático <span className="text-[#C8102E]">*</span>
                  </label>
                  <select
                    required
                    value={formData.idEjeTematico}
                    onChange={(event) =>
                      updateField("idEjeTematico", event.target.value)
                    }
                    disabled={loadingCatalogos}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 disabled:opacity-60 ${
                      fieldErrors.idEjeTematico
                        ? "border-[#C8102E] focus:border-[#C8102E] focus:ring-[#C8102E]"
                        : "border-[#E0E0E0] focus:border-[#FFD600] focus:ring-[#FFD600]"
                    }`}
                  >
                    <option value="">Seleccionar eje temático</option>
                    {ejesTematicos.map((eje) => (
                      <option key={eje.id} value={eje.id}>
                        {eje.nombre}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.idEjeTematico && (
                    <p className="mt-1 text-xs text-[#C8102E]">{fieldErrors.idEjeTematico}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={formData.descripcion}
                  onChange={(event) => updateField("descripcion", event.target.value)}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="Describe brevemente el proyecto..."
                />
                <div className="mt-1 flex justify-end">
                  <span
                    className={`text-xs ${
                      formData.descripcion.length >= 200
                        ? "text-[#C8102E]"
                        : formData.descripcion.length > 160
                          ? "text-[#C9A42B]"
                          : "text-[#9CA3AF]"
                    }`}
                  >
                    {formData.descripcion.length}/200
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                  Objetivo general
                </label>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={formData.objetivoGeneral}
                  onChange={(event) =>
                    updateField("objetivoGeneral", event.target.value)
                  }
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="Define el objetivo principal del proyecto..."
                />
                <div className="mt-1 flex justify-end">
                  <span
                    className={`text-xs ${
                      formData.objetivoGeneral.length >= 200
                        ? "text-[#C8102E]"
                        : formData.objetivoGeneral.length > 160
                          ? "text-[#C9A42B]"
                          : "text-[#9CA3AF]"
                    }`}
                  >
                    {formData.objetivoGeneral.length}/200
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Clasificación
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div data-field="idMacroregiones" className="scroll-mt-24">
                  <label className="mb-2 block text-xs font-medium text-[#5C5C5C]">
                    Macroregiones <span className="text-[#C8102E]">*</span>
                  </label>
                  {loadingCatalogos ? (
                    <div className="flex items-center gap-2 text-sm text-[#5C5C5C]">
                      <Spinner />
                      Cargando macroregiones...
                    </div>
                  ) : (
                    <div className={`flex flex-wrap gap-2 rounded-lg border p-3 ${fieldErrors.idMacroregiones ? "border-[#C8102E]" : "border-[#E0E0E0]"}`}>
                      {macroregiones.map((macroregion) => {
                        const selected = formData.idMacroregiones.includes(
                          String(macroregion.id),
                        )
                        return (
                          <button
                            key={macroregion.id}
                            type="button"
                            onClick={() => toggleMacroregion(macroregion.id)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                              selected
                                ? macroregion.nombre === "Norte"
                                  ? "bg-[#C8102E] text-white"
                                  : macroregion.nombre === "Centro"
                                    ? "bg-[#C9A42B] text-white"
                                    : "bg-[#424242] text-white"
                                : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                            }`}
                          >
                            {macroregion.nombre}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {fieldErrors.idMacroregiones && (
                    <p className="mt-1 text-xs text-[#C8102E]">{fieldErrors.idMacroregiones}</p>
                  )}
                </div>

                <div data-field="idResponsablePrincipal">
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Responsable principal <span className="text-[#C8102E]">*</span>
                  </label>
                  <input
                    type="search"
                    value={responsableSearch}
                    onChange={(event) => setResponsableSearch(event.target.value)}
                    className={`mb-2 w-full rounded-lg border px-4 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 ${
                      fieldErrors.idResponsablePrincipal
                        ? "border-[#C8102E] focus:border-[#C8102E] focus:ring-[#C8102E]"
                        : "border-[#E0E0E0] focus:border-[#FFD600] focus:ring-[#FFD600]"
                    }`}
                    placeholder="Buscar responsable por nombre o correo..."
                  />
                  {loadingUsuarios ? (
                    <div className="flex items-center gap-2 text-sm text-[#5C5C5C]">
                      <Spinner />
                      Cargando responsables...
                    </div>
                  ) : usuarios.length > 0 ? (
                    <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[#E0E0E0] p-3">
                      {responsablesVisibles.length > 0 ? responsablesVisibles.map((usuario) => {
                        const selected = formData.idResponsablePrincipal === String(usuario.id)
                        return (
                          <button
                            key={usuario.id}
                            type="button"
                            onClick={() => updateField("idResponsablePrincipal", String(usuario.id))}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              selected
                                ? "bg-[#FFD600] text-[#1A1A1A]"
                                : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                            }`}
                          >
                            {nombreCompleto(usuario)}
                          </button>
                        )
                      }) : (
                        <p className="text-sm text-[#5C5C5C]">No se encontraron responsables.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[#5C5C5C]">Sin usuarios disponibles.</p>
                  )}
                  {fieldErrors.idResponsablePrincipal && (
                    <p className="mt-1 text-xs text-[#C8102E]">{fieldErrors.idResponsablePrincipal}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[#5C5C5C]">
                  Territorios involucrados (departamentos)
                </label>
                {loadingCatalogos ? (
                  <div className="flex items-center gap-2 text-sm text-[#5C5C5C]">
                    <Spinner />
                    Cargando departamentos...
                  </div>
                ) : territorios.length > 0 ? (
                  <div className="space-y-2">
                    <input
                      type="search"
                      value={territorioSearch}
                      onChange={(event) => setTerritorioSearch(event.target.value)}
                      className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                      placeholder="Buscar territorio..."
                    />
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[#E0E0E0] p-3">
                      {territoriosFiltrados.length > 0 ? territoriosFiltrados.map((territorio) => {
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
                      }) : (
                        <p className="text-sm text-[#5C5C5C]">No se encontraron territorios.</p>
                      )}
                    </div>
                    {formData.idTerritorios.length > 0 && (
                      <p className="text-xs text-[#5C5C5C]">
                        {formData.idTerritorios.length} departamento(s) seleccionado(s)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#5C5C5C]">
                    No hay departamentos configurados todavía.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[#5C5C5C]">
                  Instituciones miembro
                </label>
                {loadingCatalogos ? (
                  <div className="flex items-center gap-2 text-sm text-[#5C5C5C]">
                    <Spinner />
                    Cargando instituciones...
                  </div>
                ) : instituciones.length > 0 ? (
                  <div className="space-y-2">
                    <input
                      type="search"
                      value={institucionSearch}
                      onChange={(event) => setInstitucionSearch(event.target.value)}
                      className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                      placeholder="Buscar institución..."
                    />
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[#E0E0E0] p-3">
                      {institucionesFiltradas.length > 0 ? institucionesFiltradas.map((institucion) => {
                        const selected = formData.idInstituciones.includes(String(institucion.id))
                        return (
                          <button
                            key={institucion.id}
                            type="button"
                            onClick={() => toggleInstitucion(institucion.id)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              selected
                                ? "bg-[#FFD600] text-[#1A1A1A]"
                                : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                            }`}
                          >
                            {institucion.nombre}
                          </button>
                        )
                      }) : (
                        <p className="text-sm text-[#5C5C5C]">No se encontraron instituciones.</p>
                      )}
                    </div>
                    {formData.idInstituciones.length > 0 && (
                      <p className="text-xs text-[#5C5C5C]">
                        {formData.idInstituciones.length} institución(es) seleccionada(s) como miembro.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#5C5C5C]">
                    No hay instituciones configuradas todavía.
                  </p>
                )}
              </div>

            </div>
          </section>

          <section className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Temporalidad y Presupuesto
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div data-field="fechaInicio">
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Fecha de inicio <span className="text-[#C8102E]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaInicio}
                    onChange={(event) => {
                      const newValue = event.target.value
                      setFormData((current) => ({ ...current, fechaInicio: newValue }))
                      setFieldErrors((prev) => {
                        const { fechaInicio: _, fechaFinEstimada: __, ...rest } = prev
                        if (newValue && formData.fechaFinEstimada && formData.fechaFinEstimada < newValue) {
                          rest.fechaFinEstimada = "La fecha de fin estimada no puede ser anterior a la fecha de inicio"
                        }
                        return rest
                      })
                    }}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 ${
                      fieldErrors.fechaInicio
                        ? "border-[#C8102E] focus:border-[#C8102E] focus:ring-[#C8102E]"
                        : "border-[#E0E0E0] focus:border-[#FFD600] focus:ring-[#FFD600]"
                    }`}
                  />
                  <div className="min-h-5">
                    {fieldErrors.fechaInicio && (
                      <p className="mt-1 text-xs text-[#C8102E]">{fieldErrors.fechaInicio}</p>
                    )}
                  </div>
                </div>
                <div data-field="fechaFinEstimada">
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Fecha de fin estimada
                  </label>
                  <input
                    type="date"
                    value={formData.fechaFinEstimada}
                    onChange={(event) => {
                      const newValue = event.target.value
                      setFormData((current) => ({ ...current, fechaFinEstimada: newValue }))
                      setFieldErrors((prev) => {
                        const { fechaFinEstimada: _, ...rest } = prev
                        if (newValue && formData.fechaInicio && newValue < formData.fechaInicio) {
                          rest.fechaFinEstimada = "La fecha de fin estimada no puede ser anterior a la fecha de inicio"
                        }
                        return rest
                      })
                    }}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 ${
                      fieldErrors.fechaFinEstimada
                        ? "border-[#C8102E] focus:border-[#C8102E] focus:ring-[#C8102E]"
                        : "border-[#E0E0E0] focus:border-[#FFD600] focus:ring-[#FFD600]"
                    }`}
                  />
                  <div className="min-h-5">
                    {fieldErrors.fechaFinEstimada && (
                      <p className="mt-1 text-xs text-[#C8102E]">{fieldErrors.fechaFinEstimada}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Estado inicial
                  </label>
                  <input
                    type="text"
                    value="Activo"
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-[#E0E0E0] bg-gray-50 px-4 py-2.5 text-sm text-[#5C5C5C] opacity-70"
                  />
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    Asignado automáticamente
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Nivel de prioridad
                  </label>
                  <select
                    value={formData.nivelPrioridad}
                    onChange={(event) =>
                      updateField("nivelPrioridad", event.target.value)
                    }
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    {PRIORIDADES.map((prioridad) => (
                      <option key={prioridad.value || "none"} value={prioridad.value}>
                        {prioridad.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div data-field="presupuesto">
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Presupuesto
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.presupuesto}
                    onChange={(event) => {
                      const newValue = event.target.value
                      setFormData((current) => ({ ...current, presupuesto: newValue }))
                      setFieldErrors((prev) => {
                        const { presupuesto: _, ...rest } = prev
                        if (newValue && Number(newValue) < 0) {
                          rest.presupuesto = "El presupuesto no puede ser negativo"
                        }
                        return rest
                      })
                    }}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-1 ${
                      fieldErrors.presupuesto
                        ? "border-[#C8102E] focus:border-[#C8102E] focus:ring-[#C8102E]"
                        : "border-[#E0E0E0] focus:border-[#FFD600] focus:ring-[#FFD600]"
                    }`}
                    placeholder="Ej: 85000"
                  />
                  {fieldErrors.presupuesto && (
                    <p className="mt-1 text-xs text-[#C8102E]">{fieldErrors.presupuesto}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/proyectos"
              className="rounded-lg border border-[#E0E0E0] bg-white px-6 py-2.5 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting || loadingCatalogos || loadingCodigo}
              className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-6 py-2.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner /> : <Save className="h-4 w-4" />}
              {submitting ? "Creando..." : "Crear proyecto"}
            </button>
          </div>
        </form>
      </div>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-lg">
              Proyecto creado exitosamente
            </DialogTitle>
            <DialogDescription className="text-center">
              El proyecto se ha registrado correctamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <button
              type="button"
              onClick={() => createdProjectId && router.push(`/proyectos/${createdProjectId}`)}
              className="rounded-lg bg-[#FFD600] px-6 py-2.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B]"
            >
              Ver proyecto
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PermissionGuard>
    </AppLayout>
  )
}
