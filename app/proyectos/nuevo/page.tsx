"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ChevronRight, Save } from "lucide-react"
import { AppLayout } from "@/components/layout/app-layout"
import { Spinner } from "@/components/ui/spinner"
import { api, ApiError } from "@/lib/api"
import type {
  EjeTematico,
  EstadoProyecto,
  Macroregion,
  PageResponse,
  ProyectoCreate,
  ProyectoResponse,
  Territorio,
  UsuarioResponse,
} from "@/lib/types"

const ESTADOS: Array<{ value: EstadoProyecto; label: string }> = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_CURSO", label: "En curso" },
  { value: "FINALIZADO", label: "Finalizado" },
]

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
  idResponsablePrincipal: string
  fechaInicio: string
  fechaFinEstimada: string
  estado: EstadoProyecto
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
  idResponsablePrincipal: "",
  fechaInicio: "",
  fechaFinEstimada: "",
  estado: "PENDIENTE",
  nivelPrioridad: "",
  presupuesto: "",
}

function toOptionalNumber(value: string): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function nombreCompleto(usuario: UsuarioResponse): string {
  return `${usuario.nombres} ${usuario.apellidos}`.trim()
}

export default function NuevoProyectoPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormState>(initialFormState)
  const [macroregiones, setMacroregiones] = useState<Macroregion[]>([])
  const [ejesTematicos, setEjesTematicos] = useState<EjeTematico[]>([])
  const [territorios, setTerritorios] = useState<Territorio[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [loadingCatalogos, setLoadingCatalogos] = useState(true)
  const [loadingUsuarios, setLoadingUsuarios] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState<{ objetivoGeneral?: boolean }>({})

  const isObjetivoGeneralInvalid = touched.objetivoGeneral && !formData.objetivoGeneral.trim()

  useEffect(() => {
    let cancelled = false

    async function loadCatalogos() {
      setLoadingCatalogos(true)
      setError(null)
      try {
        const [macroregionesData, ejesData, territoriosData] = await Promise.all([
          api.get<Macroregion[]>("/macroregiones"),
          api.get<EjeTematico[]>("/ejes-tematicos"),
          api.get<Territorio[]>("/territorios"),
        ])

        if (!cancelled) {
          setMacroregiones(macroregionesData)
          setEjesTematicos(ejesData)
          setTerritorios(territoriosData)
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

    loadCatalogos()
    loadUsuarios()

    return () => {
      cancelled = true
    }
  }, [])

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

  const toggleMacroregion = (id: number) => {
    const value = String(id)
    setFormData((current) => ({
      ...current,
      idMacroregiones: current.idMacroregiones.includes(value)
        ? current.idMacroregiones.filter((item) => item !== value)
        : [...current.idMacroregiones, value],
    }))
  }

  const buildPayload = (): ProyectoCreate => {
    const payload: ProyectoCreate = {
      nombre: formData.nombre.trim(),
      codigoInterno: formData.codigoInterno.trim(),
      fechaInicio: formData.fechaInicio,
      estado: formData.estado,
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (
      formData.idMacroregiones.length === 0 ||
      !formData.idEjeTematico ||
      !formData.fechaInicio ||
      !formData.nombre.trim() ||
      !formData.codigoInterno.trim() ||
      !formData.objetivoGeneral.trim()
    ) {
      setTouched((current) => ({ ...current, objetivoGeneral: true }))
      setError("Completa los campos obligatorios antes de crear el proyecto")
      return
    }

    if (
      formData.fechaFinEstimada &&
      formData.fechaInicio &&
      formData.fechaFinEstimada < formData.fechaInicio
    ) {
      setError("La fecha de fin estimada no puede ser anterior a la fecha de inicio")
      return
    }

    setSubmitting(true)
    try {
      const creado = await api.post<ProyectoResponse>("/proyectos", buildPayload())
      router.push(`/proyectos/${creado.id}`)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo crear el proyecto"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout title="Nuevo Proyecto">
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
            Registra los datos base del proyecto para el Sprint 1
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className={`rounded-lg border ${isObjetivoGeneralInvalid ? "border-[#C8102E]" : "border-[#E0E0E0]"} bg-white shadow-sm`}>
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Información General
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Nombre del proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(event) => updateField("nombre", event.target.value)}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                    placeholder="Ej: Monitoreo Ambiental Comunitario - Conga"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Código interno *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.codigoInterno}
                    onChange={(event) =>
                      updateField("codigoInterno", event.target.value)
                    }
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                    placeholder="Ej: PRY-2026-001"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Eje temático *
                  </label>
                  <select
                    required
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
                <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={formData.descripcion}
                  onChange={(event) => updateField("descripcion", event.target.value)}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="Describe brevemente el proyecto..."
                />
              </div>

              <div>
                <label className={`mb-1.5 block text-xs font-medium ${isObjetivoGeneralInvalid ? "text-[#C8102E]" : "text-[#5C5C5C]"}`}>
                  Objetivo general
                </label>
                <textarea
                  rows={2}
                  value={formData.objetivoGeneral}
                  onChange={(event) =>
                    updateField("objetivoGeneral", event.target.value)
                  }
                  onBlur={() => setTouched((current) => ({ ...current, objetivoGeneral: true }))}
                  className={`w-full rounded-lg border ${isObjetivoGeneralInvalid ? "border-[#C8102E]" : "border-[#E0E0E0]"} px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]`}
                  placeholder="Define el objetivo principal del proyecto..."
                />
                {isObjetivoGeneralInvalid && (
                  <p className="mt-2 text-xs text-[#C8102E]">
                    El objetivo general es obligatorio.
                  </p>
                )}
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
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#5C5C5C]">
                    Macroregiones *
                  </label>
                  {loadingCatalogos ? (
                    <div className="flex items-center gap-2 text-sm text-[#5C5C5C]">
                      <Spinner />
                      Cargando macroregiones...
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
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
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Responsable principal
                  </label>
                  <select
                    value={formData.idResponsablePrincipal}
                    onChange={(event) =>
                      updateField("idResponsablePrincipal", event.target.value)
                    }
                    disabled={loadingUsuarios || usuarios.length === 0}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600] disabled:opacity-60"
                  >
                    <option value="">
                      {usuarios.length === 0
                        ? "Sin usuarios disponibles"
                        : "Seleccionar responsable"}
                    </option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {nombreCompleto(usuario)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-[#5C5C5C]">
                  Territorios involucrados
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

          <section className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Temporalidad y Presupuesto
              </h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Fecha de inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaInicio}
                    onChange={(event) =>
                      updateField("fechaInicio", event.target.value)
                    }
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Fecha de fin estimada
                  </label>
                  <input
                    type="date"
                    value={formData.fechaFinEstimada}
                    onChange={(event) =>
                      updateField("fechaFinEstimada", event.target.value)
                    }
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Estado inicial
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(event) =>
                      updateField("estado", event.target.value as EstadoProyecto)
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
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                    Presupuesto
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.presupuesto}
                    onChange={(event) =>
                      updateField("presupuesto", event.target.value)
                    }
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                    placeholder="Ej: 85000"
                  />
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
              disabled={submitting || loadingCatalogos}
              className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-6 py-2.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner /> : <Save className="h-4 w-4" />}
              {submitting ? "Creando..." : "Crear proyecto"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
