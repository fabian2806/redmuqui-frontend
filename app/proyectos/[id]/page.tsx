"use client"

import React, { useEffect, useMemo, useState, use } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { AppLayout } from "@/components/layout/app-layout"
import { StatusBadge, MacroregionBadge, TypeBadge } from "@/components/ui/status-badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import { ProjectGantt } from "@/components/projects/project-gantt"
import {
  getProyectoById,
  getHitosByProyecto,
  getDocumentosByProyecto,
  getBitacoraByEntidad,
  hitos as allHitos
} from "@/lib/data"
import type { Hito as HitoMock, Proyecto as ProyectoMock } from "@/lib/data"
import { api, ApiError } from "@/lib/api"
import { ESTADOS_PROYECTO, normalizarEstadoProyecto } from "@/lib/project-status"
import type {
  MacroregionRef,
  Macroregion,
  EjeTematico,
  Territorio,
  Institucion,
  ProyectoResponse,
  ActividadResponse,
  EstadoActividad,
  SubactividadCreate,
  SubactividadResponse,
  UsuarioResponse,
  PageResponse,
  HitoCreate,
  HitoResponse,
  EstadoHito,
  EstadoProyecto,
  ProyectoUpdate,
  AsociarInstitucionesRequest
} from "@/lib/types"
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Download,
  Archive,
  Calendar,
  Save,
  User,
  MapPin,
  Building2,
  DollarSign,
  AlertTriangle,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  UserPlus
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type TabType = "resumen" | "actividades" | "hitos" | "informes" | "equipo" | "bitacora"
type HitoEstadoUi = "Pendiente" | "En curso" | "Finalizado"
type HitoDetalle = {
  id: string
  proyectoId: string
  nombre: string
  fecha: string
  estado: HitoEstadoUi
  descripcion: string
  porcentajeAvance: number
  fechaInicio: string | null
  fechaFin: string | null
  duracionDias: number
  totalActividades: number
  actividadesFinalizadas: number
  fuenteDatos: "api" | "mock" | "local"
}
type HitoForm = Pick<HitoDetalle, "nombre" | "fecha" | "estado" | "descripcion">
type ProyectoDetalle = Omit<ProyectoMock, "macroregion" | "ejeTematico" | "estado"> & {
  macroregion: string
  macroregiones?: MacroregionRef[]
  ejeTematico: string
  estado: string
  fuenteDatos: "api" | "mixto" | "mock"
}

const DIAS_ALERTA_ACTIVIDAD = 15
const ACTIVIDADES_POR_PAGINA = 15

function parseLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`)
}

function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function getDiasHastaFecha(date: string, today = startOfToday()): number {
  const fechaFin = parseLocalDate(date)
  return Math.ceil((fechaFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatLocalDate(date: string | null | undefined): string {
  if (!date) return "—"
  const [year, month, day] = date.split("-")
  if (!year || !month || !day) return date
  return `${day}/${month}/${year}`
}

function formatPercent(value: number | null | undefined, decimals = 1): string {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0
  return `${safeValue.toFixed(decimals)}%`
}

function getActividadAvance(actividad: { porcentajeAvance?: number | null; estado: string }): number {
  return actividad.porcentajeAvance ?? (actividad.estado === "FINALIZADA" ? 100 : 0)
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase()
}

function getAlertaVencimientoActividad(actividad: {
  fechaFin: string | null
  estado: string
}) {
  if (actividad.estado === "FINALIZADA" || actividad.estado === "COMPLETADA") return null
  if (!actividad.fechaFin) return null

  const diasRestantes = getDiasHastaFecha(actividad.fechaFin)

  if (diasRestantes < 0) {
    return {
      tipo: "vencida" as const,
      label: `Vencida hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) === 1 ? "" : "s"}`,
    }
  }

  if (diasRestantes === 0) {
    return {
      tipo: "vence-hoy" as const,
      label: "Vence hoy",
    }
  }

  if (diasRestantes <= DIAS_ALERTA_ACTIVIDAD) {
    return {
      tipo: "proxima" as const,
      label: `Vence en ${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`,
    }
  }

  return null
}

function getAlertaVencimientoHito(hito: {
  fecha: string
  estado: string
}) {
  if (hito.estado === "Finalizado") return null

  const diasRestantes = getDiasHastaFecha(hito.fecha)

  if (diasRestantes < 0) {
    return {
      tipo: "vencido" as const,
      label: `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) === 1 ? "" : "s"}`,
    }
  }

  if (diasRestantes === 0) {
    return {
      tipo: "vence-hoy" as const,
      label: "Vence hoy",
    }
  }

  if (diasRestantes <= DIAS_ALERTA_ACTIVIDAD) {
    return {
      tipo: "proximo" as const,
      label: `Vence en ${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`,
    }
  }

  return null
}


const PRIORIDADES_PROYECTO = [
  { value: "", label: "Sin prioridad" },
  { value: "1", label: "Baja" },
  { value: "2", label: "Media" },
  { value: "3", label: "Alta" },
]

const ROLES_PROYECTO = ["Equipo Técnico", "Coordinador", "Asesor", "Observador"]

function estadoProyectoParaFormulario(estado: string): EstadoProyecto {
  return normalizarEstadoProyecto(estado)
}

function optionalNumber(value: string): number | undefined {
  if (value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function apiMacroregiones(proyecto: ProyectoResponse): MacroregionRef[] {
  if (proyecto.macroregiones?.length) return proyecto.macroregiones
  if (proyecto.idMacroregion && proyecto.nombreMacroregion) {
    return [{ id: proyecto.idMacroregion, nombre: proyecto.nombreMacroregion }]
  }
  return []
}

function responsableApi(proyecto: ProyectoResponse): string | null {
  const responsable = proyecto.responsablePrincipal
  if (!responsable) return null
  return `${responsable.nombres} ${responsable.apellidos}`.trim()
}

function proyectoDesdeApi(apiProyecto: ProyectoResponse): ProyectoDetalle {
  const macroregiones = apiMacroregiones(apiProyecto)

  return {
    id: String(apiProyecto.id),
    nombre: apiProyecto.nombre,
    codigo: apiProyecto.codigoInterno,
    descripcion: apiProyecto.descripcion ?? "",
    objetivo: apiProyecto.objetivoGeneral ?? "",
    macroregion: macroregiones[0]?.nombre ?? "Sin macroregión",
    macroregiones,
    ejeTematico: apiProyecto.nombreEjeTematico ?? "Sin eje temático",
    territorios: apiProyecto.territorios.map(t => t.nombre),
    responsable: responsableApi(apiProyecto) ?? "Sin responsable",
    equipo: [],
    fechaInicio: apiProyecto.fechaInicio,
    fechaFin: apiProyecto.fechaFinEstimada ?? apiProyecto.fechaInicio,
    avance: apiProyecto.porcentajeAvance ?? 0,
    estado: apiProyecto.estado,
    institucionesMiembro: apiProyecto.instituciones?.map(i => i.nombre) ?? [],
    presupuesto: apiProyecto.presupuesto ?? undefined,
    fuentesDonantes: [],
    fuenteDatos: "api",
  }
}

function combinarProyecto(
  mockProyecto: ProyectoMock | undefined,
  apiProyecto: ProyectoResponse | null,
): ProyectoDetalle | null {
  if (!mockProyecto && !apiProyecto) return null
  if (!apiProyecto) {
    return {
      ...mockProyecto!,
      macroregiones: [{ id: 0, nombre: mockProyecto!.macroregion }],
      fuenteDatos: "mock",
    }
  }

  const real = proyectoDesdeApi(apiProyecto)
  if (!mockProyecto) return real

  return {
    ...mockProyecto,
    ...real,
    equipo: mockProyecto.equipo,
    institucionesMiembro: real.institucionesMiembro.length > 0 ? real.institucionesMiembro : mockProyecto.institucionesMiembro,
    fuentesDonantes: mockProyecto.fuentesDonantes,
    fuenteDatos: "mixto",
  }
}

function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.body?.message ?? error.message
  }
  if (error instanceof Error) return error.message
  return "No se pudo cargar la API del proyecto."
}

const hitoFormInicial: HitoForm = {
  nombre: "",
  fecha: "",
  estado: "Pendiente",
  descripcion: "",
}

function estadoHitoDesdeApi(estado: EstadoHito): HitoEstadoUi {
  if (estado === "FINALIZADO") return "Finalizado"
  if (estado === "EN_CURSO") return "En curso"
  return "Pendiente"
}

function estadoHitoParaApi(estado: HitoEstadoUi): EstadoHito {
  if (estado === "Finalizado") return "FINALIZADO"
  if (estado === "En curso") return "EN_CURSO"
  return "PENDIENTE"
}

function hitoDesdeApi(hito: HitoResponse): HitoDetalle {
  return {
    id: String(hito.id),
    proyectoId: String(hito.idProyecto),
    nombre: hito.nombre,
    fecha: hito.fechaClave,
    estado: estadoHitoDesdeApi(hito.estado),
    descripcion: hito.descripcion ?? "",
    porcentajeAvance: hito.porcentajeAvance ?? 0,
    fechaInicio: hito.fechaInicio,
    fechaFin: hito.fechaFin,
    duracionDias: hito.duracionDias ?? 0,
    totalActividades: hito.totalActividades ?? 0,
    actividadesFinalizadas: hito.actividadesFinalizadas ?? 0,
    fuenteDatos: "api",
  }
}

function hitoDesdeMock(hito: HitoMock): HitoDetalle {
  const estado =
    hito.estado === "Completado"
      ? "Finalizado"
      : hito.estado === "Vencido"
        ? "En curso"
        : "Pendiente"

  return {
    ...hito,
    estado,
    descripcion: "",
    porcentajeAvance: estado === "Finalizado" ? 100 : 0,
    fechaInicio: null,
    fechaFin: null,
    duracionDias: 0,
    totalActividades: 0,
    actividadesFinalizadas: 0,
    fuenteDatos: "mock",
  }
}

function payloadHito(form: HitoForm): HitoCreate {
  return {
    nombre: form.nombre.trim(),
    fechaClave: form.fecha,
    estado: estadoHitoParaApi(form.estado),
    descripcion: form.descripcion.trim() || null,
  }
}

function MockDataTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E0E0E0] bg-[#F7F7F7] px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[#5C5C5C]">
      Mock referencial
    </span>
  )
}

export default function ProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { loading: authLoading, hasPermission } = useAuth()
  const puedeVerProyectos = hasPermission("PROYECTOS_READ")
  const puedeActualizarProyectos = hasPermission("PROYECTOS_UPDATE")
  const puedeVerUsuarios = hasPermission("USUARIOS_READ")
  const puedeVerBitacora = hasPermission("BITACORA_READ")
  const mockProyecto = getProyectoById(id)
  const [apiProyecto, setApiProyecto] = useState<ProyectoResponse | null>(null)
  const [apiActividades, setApiActividades] = useState<ActividadResponse[]>([])
  const [usuariosSistema, setUsuariosSistema] = useState<UsuarioResponse[]>([])
  const [macroregionesCatalogo, setMacroregionesCatalogo] = useState<Macroregion[]>([])
  const [ejesCatalogo, setEjesCatalogo] = useState<EjeTematico[]>([])
  const [territoriosCatalogo, setTerritoriosCatalogo] = useState<Territorio[]>([])
  const [institucionesCatalogo, setInstitucionesCatalogo] = useState<Institucion[]>([])
  const [apiLoading, setApiLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const proyecto = useMemo(
    () => combinarProyecto(mockProyecto, apiProyecto),
    [mockProyecto, apiProyecto],
  )
  const [activeTab, setActiveTab] = useState<TabType>("resumen")
  const [equipo, setEquipo] = useState<{ nombre: string; rol: string }[]>(
    () => (mockProyecto?.equipo ?? []).map(nombre => ({ nombre, rol: "Equipo T\u00e9cnico" }))
  )
  const [apiEquipo, setApiEquipo] = useState<{ idUsuario: number; rolEnProyecto: string }[]>([])
  const [nuevoMiembroNombre, setNuevoMiembroNombre] = useState("")
  const [nuevoMiembroRol, setNuevoMiembroRol] = useState("Equipo Técnico")
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({})
  const [editSuccessModalOpen, setEditSuccessModalOpen] = useState(false)
  const [territorioSearch, setTerritorioSearch] = useState("")
  const [institucionSearch, setInstitucionSearch] = useState("")
  const [responsableSearch, setResponsableSearch] = useState("")
  const [editFormProyecto, setEditFormProyecto] = useState({
    nombre: "",
    codigoInterno: "",
    descripcion: "",
    objetivoGeneral: "",
    fechaInicio: "",
    fechaFinEstimada: "",
    estado: "ACTIVO" as EstadoProyecto,
    nivelPrioridad: "",
    porcentajeAvance: "0",
    presupuesto: "",
    idMacroregiones: [] as number[],
    idEjeTematico: "",
    idResponsablePrincipal: "",
    idTerritorios: [] as number[],
    instituciones: [] as Array<{ idInstitucion: number; tipoParticipacion: string }>,
  })

  // State for hitos
  const hitosData = getHitosByProyecto(id)
  const [hitosState, setHitosState] = useState<HitoDetalle[]>(
    () => hitosData.map(hitoDesdeMock)
  )
  const [hitosLoading, setHitosLoading] = useState(true)
  const [hitosError, setHitosError] = useState<string | null>(null)
  const [hitoSubmitting, setHitoSubmitting] = useState(false)
  const [addHitoOpen, setAddHitoOpen] = useState(false)
  const [editHito, setEditHito] = useState<HitoDetalle | null>(null)
  const [hitoForm, setHitoForm] = useState<HitoForm>(hitoFormInicial)
  const [hitoFieldErrors, setHitoFieldErrors] = useState<Record<string, string>>({})
  const [hitoSuccessModalOpen, setHitoSuccessModalOpen] = useState(false)
  const [hitoEsEdicion, setHitoEsEdicion] = useState(false)

  // ── Actividades desde API ──
  const [actividadesApi, setActividadesApi] = useState<ActividadResponse[]>([])
  const [actividadesLoading, setActividadesLoading] = useState(true)
  const [actividadesError, setActividadesError] = useState<string | null>(null)
  const [usuariosMap, setUsuariosMap] = useState<Map<number, string>>(new Map())

  const [createActividadOpen, setCreateActividadOpen] = useState(false)
  const [creandoActividad, setCreandoActividad] = useState(false)
  const [actFieldErrors, setActFieldErrors] = useState<Record<string, string>>({})
  const [actResponsableSearch, setActResponsableSearch] = useState("")
  const [actSuccessModalOpen, setActSuccessModalOpen] = useState(false)
  const [actForm, setActForm] = useState({
    nombre: "",
    descripcion: "",
    fechaInicio: "",
    fechaFin: "",
    idResponsables: [] as number[],
    idHito: "",
    estado: "PENDIENTE" as string,
  })

  // ── Editar actividad ──
  const [editActividadOpen, setEditActividadOpen] = useState(false)
  const [editandoActividad, setEditandoActividad] = useState(false)
  const [editingActividad, setEditingActividad] = useState<ActividadResponse | null>(null)
  const [editForm, setEditForm] = useState({
    nombre: "",
    descripcion: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "PENDIENTE" as EstadoActividad,
    idResponsables: [] as number[],
    idHito: "",
  })
  const [editActFieldErrors, setEditActFieldErrors] = useState<Record<string, string>>({})
  const [editActSuccessModalOpen, setEditActSuccessModalOpen] = useState(false)
  const [editActResponsableSearch, setEditActResponsableSearch] = useState("")

  // ── Crear Subactividad ──
  const [createSubactOpen, setCreateSubactOpen] = useState(false)
  const [creandoSubact, setCreandoSubact] = useState(false)
  const [targetActividadId, setTargetActividadId] = useState<number | null>(null)
  const [subactForm, setSubactForm] = useState({
    nombre: "",
    idResponsable: "",
    presupuesto: "",
    hombresInvolucrados: "",
    mujeresInvolucradas: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "PENDIENTE" as EstadoActividad,
    descripcion: "",
  })
  const [subactFieldErrors, setSubactFieldErrors] = useState<Record<string, string>>({})
  const [subactSuccessModalOpen, setSubactSuccessModalOpen] = useState(false)
  const [subactResponsableSearch, setSubactResponsableSearch] = useState("")

  // ── Editar Subactividad ──
  const [editSubactOpen, setEditSubactOpen] = useState(false)
  const [editandoSubact, setEditandoSubact] = useState(false)
  const [editingSubact, setEditingSubact] = useState<{ sub: SubactividadResponse; actId: number } | null>(null)
  const [editSubactForm, setEditSubactForm] = useState({
    nombre: "",
    idResponsable: "",
    presupuesto: "",
    hombresInvolucrados: "",
    mujeresInvolucradas: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "PENDIENTE" as EstadoActividad,
    descripcion: "",
  })
  const [editSubactFieldErrors, setEditSubactFieldErrors] = useState<Record<string, string>>({})
  const [editSubactSuccessModalOpen, setEditSubactSuccessModalOpen] = useState(false)
  const [editSubactResponsableSearch, setEditSubactResponsableSearch] = useState("")

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<"actividad" | "hito" | "subactividad" | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteNombre, setConfirmDeleteNombre] = useState("")
  const [confirmDeleteInput, setConfirmDeleteInput] = useState("")
  const [confirmDeleteParentId, setConfirmDeleteParentId] = useState<number | null>(null)
  const [expandedRespAct, setExpandedRespAct] = useState<Set<number>>(new Set())
  const [expandedSubacts, setExpandedSubacts] = useState<Set<number>>(new Set())
  const [expandedHitos, setExpandedHitos] = useState<Set<string>>(new Set())
  const [actividadHitoFilter, setActividadHitoFilter] = useState("todos")
  const [actividadEstadoFilter, setActividadEstadoFilter] = useState("todos")
  const [actividadPage, setActividadPage] = useState(1)

  const prepararFormularioEdicionProyecto = (proyectoApi: ProyectoResponse) => {
    setEditError(null)
    setEditFormProyecto({
      nombre: proyectoApi.nombre ?? "",
      codigoInterno: proyectoApi.codigoInterno ?? "",
      descripcion: proyectoApi.descripcion ?? "",
      objetivoGeneral: proyectoApi.objetivoGeneral ?? "",
      fechaInicio: proyectoApi.fechaInicio ?? "",
      fechaFinEstimada: proyectoApi.fechaFinEstimada ?? "",
      estado: estadoProyectoParaFormulario(proyectoApi.estado),
      nivelPrioridad: proyectoApi.nivelPrioridad ? String(proyectoApi.nivelPrioridad) : "",
      porcentajeAvance: String(proyectoApi.porcentajeAvance ?? 0),
      presupuesto: proyectoApi.presupuesto != null ? String(proyectoApi.presupuesto) : "",
      idMacroregiones: proyectoApi.macroregiones?.map(m => m.id) ?? [],
      idEjeTematico: proyectoApi.idEjeTematico ? String(proyectoApi.idEjeTematico) : "",
      idResponsablePrincipal: proyectoApi.responsablePrincipal ? String(proyectoApi.responsablePrincipal.id) : "",
      idTerritorios: proyectoApi.territorios?.map(t => t.id) ?? [],
      instituciones: proyectoApi.instituciones?.map(i => ({
        idInstitucion: i.id,
        tipoParticipacion: "Miembro",
      })) ?? [],
    })
  }

  const toggleEditMacroregion = (idMacroregion: number) => {
    setEditFormProyecto(prev => ({
      ...prev,
      idMacroregiones: prev.idMacroregiones.includes(idMacroregion)
        ? prev.idMacroregiones.filter(id => id !== idMacroregion)
        : [...prev.idMacroregiones, idMacroregion],
    }))
    setEditFieldErrors(p => {
      const { "edit-idMacroregiones": _, ...r } = p
      return r
    })
  }

  const toggleEditTerritorio = (idTerritorio: number) => {
    setEditFormProyecto(prev => ({
      ...prev,
      idTerritorios: prev.idTerritorios.includes(idTerritorio)
        ? prev.idTerritorios.filter(id => id !== idTerritorio)
        : [...prev.idTerritorios, idTerritorio],
    }))
  }

  const toggleEditInstitucion = (idInstitucion: number) => {
    setEditFormProyecto(prev => ({
      ...prev,
      instituciones: prev.instituciones.some(item => item.idInstitucion === idInstitucion)
        ? prev.instituciones.filter(item => item.idInstitucion !== idInstitucion)
        : [...prev.instituciones, { idInstitucion, tipoParticipacion: "Miembro" }],
    }))
  }

  const validarEditForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!editFormProyecto.nombre.trim()) {
      errors["edit-nombre"] = "El nombre del proyecto es obligatorio"
    }
    if (!editFormProyecto.codigoInterno.trim()) {
      errors["edit-codigoInterno"] = "El código interno es obligatorio"
    }
    if (!editFormProyecto.fechaInicio) {
      errors["edit-fechaInicio"] = "La fecha de inicio es obligatoria"
    }
    if (!editFormProyecto.idResponsablePrincipal) {
      errors["edit-idResponsablePrincipal"] = "Selecciona un responsable principal"
    }
    if (editFormProyecto.idMacroregiones.length === 0) {
      errors["edit-idMacroregiones"] = "Selecciona al menos una macrorregión"
    }
    if (
      editFormProyecto.fechaFinEstimada &&
      editFormProyecto.fechaInicio &&
      editFormProyecto.fechaFinEstimada < editFormProyecto.fechaInicio
    ) {
      errors["edit-fechaFinEstimada"] =
        "La fecha de fin estimada no puede ser anterior a la fecha de inicio"
    }
    const pct = Number(editFormProyecto.porcentajeAvance)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      errors["edit-porcentajeAvance"] = "El porcentaje de avance debe estar entre 0 y 100"
    }
    if (editFormProyecto.presupuesto && Number(editFormProyecto.presupuesto) < 0) {
      errors["edit-presupuesto"] = "El presupuesto no puede ser negativo"
    }
    return errors
  }

  const validarActForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!actForm.nombre.trim()) {
      errors["act-nombre"] = "El nombre de la actividad es obligatorio"
    }
    if (!actForm.idHito) {
      errors["act-idHito"] = "Selecciona el hito al que pertenece la actividad"
    }
    if (actForm.idResponsables.length === 0) {
      errors["act-idResponsables"] = "Selecciona al menos un responsable"
    }
    if (!actForm.fechaInicio) {
      errors["act-fechaInicio"] = "La fecha de inicio es obligatoria"
    }
    if (actForm.fechaInicio && actForm.fechaFin && actForm.fechaFin < actForm.fechaInicio) {
      errors["act-fechaFin"] = "La fecha de fin no puede ser anterior a la fecha de inicio"
    }
    return errors
  }

  const validarHitoForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!hitoForm.nombre.trim()) {
      errors["hito-nombre"] = "El nombre del hito es obligatorio"
    }
    if (!hitoForm.fecha) {
      errors["hito-fecha"] = "La fecha clave es obligatoria"
    }
    return errors
  }

  const validarEditActForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!editForm.nombre.trim()) {
      errors["edit-nombre"] = "El nombre de la actividad es obligatorio"
    }
    if (!editForm.idHito) {
      errors["edit-idHito"] = "Selecciona el hito al que pertenece la actividad"
    }
    if (editForm.idResponsables.length === 0) {
      errors["edit-idResponsables"] = "Selecciona al menos un responsable"
    }
    if (!editForm.fechaInicio) {
      errors["edit-inicio"] = "La fecha de inicio es obligatoria"
    }
    if (editForm.fechaInicio && editForm.fechaFin && editForm.fechaFin < editForm.fechaInicio) {
      errors["edit-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio"
    }
    return errors
  }

  const validarSubactForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!subactForm.nombre.trim()) {
      errors["sub-nombre"] = "El nombre de la subactividad es obligatorio"
    }
    if (!subactForm.idResponsable) {
      errors["sub-idResponsable"] = "Selecciona un responsable"
    }
    if (!subactForm.fechaInicio) {
      errors["sub-inicio"] = "La fecha de inicio es obligatoria"
    }
    if (subactForm.fechaInicio && subactForm.fechaFin && subactForm.fechaFin < subactForm.fechaInicio) {
      errors["sub-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio"
    }
    if (subactForm.presupuesto && Number(subactForm.presupuesto) < 0) {
      errors["sub-presu"] = "El presupuesto no puede ser negativo"
    }
    if (subactForm.hombresInvolucrados && Number(subactForm.hombresInvolucrados) < 0) {
      errors["sub-hombres"] = "El número no puede ser negativo"
    }
    if (subactForm.mujeresInvolucradas && Number(subactForm.mujeresInvolucradas) < 0) {
      errors["sub-mujeres"] = "El número no puede ser negativo"
    }
    return errors
  }

  const validarEditSubactForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!editSubactForm.nombre.trim()) {
      errors["edit-sub-nombre"] = "El nombre de la subactividad es obligatorio"
    }
    if (!editSubactForm.idResponsable) {
      errors["edit-sub-idResponsable"] = "Selecciona un responsable"
    }
    if (!editSubactForm.fechaInicio) {
      errors["edit-sub-inicio"] = "La fecha de inicio es obligatoria"
    }
    if (editSubactForm.fechaInicio && editSubactForm.fechaFin && editSubactForm.fechaFin < editSubactForm.fechaInicio) {
      errors["edit-sub-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio"
    }
    if (editSubactForm.presupuesto && Number(editSubactForm.presupuesto) < 0) {
      errors["edit-sub-presu"] = "El presupuesto no puede ser negativo"
    }
    if (editSubactForm.hombresInvolucrados && Number(editSubactForm.hombresInvolucrados) < 0) {
      errors["edit-sub-hombres"] = "El número no puede ser negativo"
    }
    if (editSubactForm.mujeresInvolucradas && Number(editSubactForm.mujeresInvolucradas) < 0) {
      errors["edit-sub-mujeres"] = "El número no puede ser negativo"
    }
    return errors
  }

  const guardarEdicionProyecto = async () => {
    if (!apiProyecto) return
    setEditError(null)
    setEditFieldErrors({})

    const errors = validarEditForm()
    if (Object.keys(errors).length > 0) {
      setEditFieldErrors(errors)
      const firstField = Object.keys(errors)[0]
      const el = document.querySelector(`[data-field="${firstField}"]`)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      const input = el?.querySelector("input, select, textarea, button")
      if (input instanceof HTMLElement) input.focus()
      return
    }

    const porcentajeAvance = Number(editFormProyecto.porcentajeAvance)

    const payload: ProyectoUpdate = {
      nombre: editFormProyecto.nombre.trim(),
      codigoInterno: editFormProyecto.codigoInterno.trim(),
      descripcion: editFormProyecto.descripcion.trim() || undefined,
      objetivoGeneral: editFormProyecto.objetivoGeneral.trim() || undefined,
      fechaInicio: editFormProyecto.fechaInicio,
      fechaFinEstimada: editFormProyecto.fechaFinEstimada || undefined,
      estado: editFormProyecto.estado,
      nivelPrioridad: optionalNumber(editFormProyecto.nivelPrioridad),
      porcentajeAvance,
      presupuesto: optionalNumber(editFormProyecto.presupuesto),
      idMacroregiones: editFormProyecto.idMacroregiones,
      idEjeTematico: editFormProyecto.idEjeTematico ? Number(editFormProyecto.idEjeTematico) : undefined,
      idResponsablePrincipal: editFormProyecto.idResponsablePrincipal ? Number(editFormProyecto.idResponsablePrincipal) : undefined,
      idTerritorios: editFormProyecto.idTerritorios,
    }

    setEditSubmitting(true)
    try {
      let actualizado = await api.put<ProyectoResponse>(`/proyectos/${id}`, payload)
      const institucionesPayload: AsociarInstitucionesRequest = {
        instituciones: Array.from(
          new Map(
            editFormProyecto.instituciones.map(item => [
              item.idInstitucion,
              {
                idInstitucion: item.idInstitucion,
                tipoParticipacion: "Miembro",
              },
            ]),
          ).values(),
        ),
      }
      await api.post<void>(`/proyectos/${id}/instituciones`, institucionesPayload)
      actualizado = await api.get<ProyectoResponse>(`/proyectos/${id}`)
      setApiProyecto(actualizado)
      prepararFormularioEdicionProyecto(actualizado)
      setEditModalOpen(false)
      setEditSuccessModalOpen(true)
    } catch (error) {
      setEditError(getApiErrorMessage(error))
    } finally {
      setEditSubmitting(false)
    }
  }

  useEffect(() => {
    if (authLoading || !puedeVerProyectos) return

    let cancelled = false

    async function cargarProyecto() {
      setApiLoading(true)
      setApiError(null)
      try {
        const data = await api.get<ProyectoResponse>(`/proyectos/${id}`)
        let acts: ActividadResponse[] = []
        let users: PageResponse<UsuarioResponse> = { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, first: true, last: true }
        let teamData: { idUsuario: number; rolEnProyecto: string }[] = []
        let macroregionesData: Macroregion[] = []
        let ejesData: EjeTematico[] = []
        let territoriosData: Territorio[] = []
        let institucionesData: Institucion[] = []
        try {
          const [actsResponse, usersResponse, teamResponse, macrosResponse, ejesResponse, territoriosResponse, institucionesResponse] = await Promise.all([
            api.get<ActividadResponse[]>(`/proyectos/${id}/actividades`),
            puedeVerUsuarios
              ? api.get<PageResponse<UsuarioResponse>>(`/usuarios?page=0&size=100&sort=apellidos,asc`)
              : Promise.resolve({ content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, first: true, last: true }),
            api.get<{ idUsuario: number; rolEnProyecto: string }[]>(`/proyectos/${id}/equipo`),
            api.get<Macroregion[]>(`/macroregiones`),
            api.get<EjeTematico[]>(`/ejes-tematicos`),
            api.get<Territorio[]>(`/territorios`),
            api.get<Institucion[]>(`/instituciones`),
          ])
          acts = actsResponse
          users = usersResponse
          teamData = teamResponse
          macroregionesData = macrosResponse
          ejesData = ejesResponse
          territoriosData = territoriosResponse
          institucionesData = institucionesResponse
        } catch (e) {
          console.error("Error al cargar actividades, usuarios, equipo o catálogos", e)
        }
        if (!cancelled) {
          setApiProyecto(data)
          prepararFormularioEdicionProyecto(data)
          setApiActividades(acts)
          setUsuariosSistema(users.content)
          setApiEquipo(teamData)
          setMacroregionesCatalogo(macroregionesData)
          setEjesCatalogo(ejesData)
          setTerritoriosCatalogo(territoriosData)
          setInstitucionesCatalogo(institucionesData)
        }
      } catch (error) {
        if (!cancelled) {
          setApiProyecto(null)
          setApiError(getApiErrorMessage(error))
        }
      } finally {
        if (!cancelled) {
          setApiLoading(false)
        }
      }
    }

    cargarProyecto()

    return () => {
      cancelled = true
    }
  }, [id, authLoading, puedeVerProyectos, puedeVerUsuarios])

  useEffect(() => {
    if (authLoading || !puedeVerProyectos) return

    let cancelled = false

    async function cargarActividades() {
      setActividadesLoading(true)
      setActividadesError(null)
      try {
        const data = await api.get<PageResponse<ActividadResponse>>(
          "/actividades?proyectoId=" + id + "&size=100"
        )
        if (!cancelled) setActividadesApi(data.content)
      } catch (error) {
        if (!cancelled) {
          setActividadesApi([])
          setActividadesError(getApiErrorMessage(error))
        }
      } finally {
        if (!cancelled) setActividadesLoading(false)
      }
    }

    async function cargarUsuarios() {
      try {
        const data = await api.get<PageResponse<UsuarioResponse>>("/usuarios?page=0&size=100&sort=apellidos,asc")
        if (!cancelled) {
          const map = new Map<number, string>()
          data.content.forEach(u => map.set(u.id, `${u.nombres} ${u.apellidos}`))
          setUsuariosMap(map)
        }
      } catch {
        // Silently fail — fallback a "Usuario #ID"
      }
    }

    async function cargarHitos() {
      setHitosLoading(true)
      setHitosError(null)
      setHitosState(getHitosByProyecto(id).map(hitoDesdeMock))
      try {
        const data = await api.get<HitoResponse[] | { content: HitoResponse[] }>(`/proyectos/${id}/hitos`)
        if (!cancelled) {
          const hitosApi = Array.isArray(data) ? data : data.content
          setHitosState(hitosApi.map(hitoDesdeApi))
        }
      } catch (error) {
        if (!cancelled) {
          setHitosError(getApiErrorMessage(error))
        }
      } finally {
        if (!cancelled) {
          setHitosLoading(false)
        }
      }
    }

    cargarActividades()
    if (puedeVerUsuarios) cargarUsuarios()
    cargarHitos()

    return () => { cancelled = true }
  }, [id, authLoading, puedeVerProyectos, puedeVerUsuarios])

  const sincronizarAvancePlan = async () => {
    try {
      const [proyectoActualizado, hitosActualizados, actividadesActualizadas] = await Promise.all([
        api.get<ProyectoResponse>(`/proyectos/${id}`),
        api.get<HitoResponse[] | { content: HitoResponse[] }>(`/proyectos/${id}/hitos`),
        api.get<PageResponse<ActividadResponse>>("/actividades?proyectoId=" + id + "&size=100"),
      ])
      setApiProyecto(proyectoActualizado)
      const listaHitos = Array.isArray(hitosActualizados) ? hitosActualizados : hitosActualizados.content
      setHitosState(listaHitos.map(hitoDesdeApi))
      setActividadesApi(actividadesActualizadas.content)
    } catch (error) {
      setHitosError(`La operación se guardó, pero no se pudo actualizar el resumen: ${getApiErrorMessage(error)}`)
    }
  }

  const abrirNuevoHito = () => {
    setHitoForm(hitoFormInicial)
    setEditHito(null)
    setHitosError(null)
    setHitoFieldErrors({})
    setHitoEsEdicion(false)
    setAddHitoOpen(true)
  }

  const abrirEditarHito = (hito: HitoDetalle) => {
    setEditHito(hito)
    setHitoForm({
      nombre: hito.nombre,
      fecha: hito.fecha,
      estado: hito.estado,
      descripcion: hito.descripcion,
    })
    setHitosError(null)
    setHitoFieldErrors({})
    setHitoEsEdicion(true)
    setAddHitoOpen(true)
  }

  const guardarHito = async () => {
    setHitoFieldErrors({})
    const errors = validarHitoForm()
    if (Object.keys(errors).length > 0) {
      setHitoFieldErrors(errors)
      const firstField = Object.keys(errors)[0]
      const el = document.querySelector(`[data-field="${firstField}"]`)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      const input = el?.querySelector("input, select, textarea, button")
      if (input instanceof HTMLElement) input.focus()
      return
    }

    setHitoSubmitting(true)
    setHitosError(null)

    try {
      if (editHito) {
        if (editHito.fuenteDatos === "api") {
          const actualizado = await api.put<HitoResponse>(
            `/proyectos/${id}/hitos/${editHito.id}`,
            payloadHito(hitoForm),
          )
          setHitosState(prev => prev.map(h => h.id === editHito.id ? hitoDesdeApi(actualizado) : h))
        } else {
          setHitosState(prev => prev.map(h => h.id === editHito.id ? { ...h, ...hitoForm, fuenteDatos: h.fuenteDatos } : h))
        }
      } else {
        try {
          const creado = await api.post<HitoResponse>(`/proyectos/${id}/hitos`, payloadHito(hitoForm))
          setHitosState(prev => [...prev, hitoDesdeApi(creado)])
        } catch (error) {
          const newId = `hito-${Date.now()}`
          setHitosState(prev => [...prev, { id: newId, proyectoId: id, ...hitoForm, porcentajeAvance: 0, fechaInicio: null, fechaFin: null, duracionDias: 0, totalActividades: 0, actividadesFinalizadas: 0, fuenteDatos: "local" }])
          setHitosError(`Hito guardado solo en esta sesion: ${getApiErrorMessage(error)}`)
        }
      }

      setAddHitoOpen(false)
      setEditHito(null)
      setHitoForm(hitoFormInicial)
      setHitoSuccessModalOpen(true)
    } catch (error) {
      setHitosError(getApiErrorMessage(error))
    } finally {
      setHitoSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget || !confirmDeleteId) return

    if (confirmDeleteTarget === "hito") {
      const previous = hitosState
      setHitosState(prev => prev.filter(item => item.id !== confirmDeleteId))

      const esMock = previous.find(h => h.id === confirmDeleteId)?.fuenteDatos !== "api"
      if (esMock) {
        setConfirmDeleteOpen(false)
        setConfirmDeleteInput("")
        return
      }

      try {
        await api.delete<void>(`/proyectos/${id}/hitos/${confirmDeleteId}`)
      } catch (error) {
        setHitosState(previous)
        setHitosError(getApiErrorMessage(error))
      }
    } else if (confirmDeleteTarget === "actividad") {
      const previous = actividadesApi
      setActividadesApi(prev => prev.filter(a => String(a.id) !== confirmDeleteId))
      try {
        await api.delete<void>(`/actividades/${confirmDeleteId}`)
        await sincronizarAvancePlan()
      } catch (error) {
        setActividadesApi(previous)
        setActividadesError(getApiErrorMessage(error))
      }
    } else if (confirmDeleteTarget === "subactividad") {
      const parentId = confirmDeleteParentId
      if (!parentId) return
      const previous = actividadesApi
      setActividadesApi(prev => prev.map(a => a.id === parentId ? { ...a, subactividades: (a.subactividades || []).filter(s => String(s.id) !== confirmDeleteId) } : a))
      try {
        await api.delete<void>(`/actividades/${parentId}/subactividades/${confirmDeleteId}`)
        await sincronizarAvancePlan()
      } catch (error) {
        setActividadesApi(previous)
        setActividadesError(getApiErrorMessage(error))
      }
    }

    setConfirmDeleteOpen(false)
    setConfirmDeleteInput("")
  }

  const actividades = useMemo(() =>
    actividadesApi.map(act => ({
      ...act,
      responsableDisplay: act.idResponsables
        .map(id => usuariosMap.get(id) ?? `Usuario #${id}`)
        .join(", "),
    })),
    [actividadesApi, usuariosMap]
  )

  if (!authLoading && !puedeVerProyectos) {
    return (
      <AppLayout>
        <PermissionGuard permiso="PROYECTOS_READ">
          <div />
        </PermissionGuard>
      </AppLayout>
    )
  }

  if (!proyecto && apiLoading) {
    return (
      <AppLayout>
        <div className="rounded-lg border border-[#E0E0E0] bg-white p-6 text-sm text-[#5C5C5C] shadow-sm">
          Cargando proyecto...
        </div>
      </AppLayout>
    )
  }

  if (!proyecto) {
    notFound()
  }


  const actividadesConAlertas = actividades
    .map((actividad) => ({
      ...actividad,
      alertaVencimiento: getAlertaVencimientoActividad(actividad),
    })
    )

  const actividadesFiltradas = actividadesConAlertas.filter(actividad => {
    const coincideHito = actividadHitoFilter === "todos" || String(actividad.idHito ?? "sin-hito") === actividadHitoFilter
    const coincideEstado = actividadEstadoFilter === "todos" || actividad.estado === actividadEstadoFilter
    return coincideHito && coincideEstado
  })

  const totalActividadPages = Math.max(1, Math.ceil(actividadesFiltradas.length / ACTIVIDADES_POR_PAGINA))
  const actividadPageSafe = Math.min(actividadPage, totalActividadPages)
  const actividadesPaginadas = actividadesFiltradas.slice(
    (actividadPageSafe - 1) * ACTIVIDADES_POR_PAGINA,
    actividadPageSafe * ACTIVIDADES_POR_PAGINA,
  )
  const actividadRangeStart = actividadesFiltradas.length === 0 ? 0 : (actividadPageSafe - 1) * ACTIVIDADES_POR_PAGINA + 1
  const actividadRangeEnd = Math.min(actividadPageSafe * ACTIVIDADES_POR_PAGINA, actividadesFiltradas.length)

  const navegarADetalleActividad = (actividadId: number, hitoId: string) => {
    const actividadesDelHito = actividadesConAlertas.filter(actividad => String(actividad.idHito ?? "sin-hito") === hitoId)
    const index = actividadesDelHito.findIndex(actividad => actividad.id === actividadId)
    setActividadHitoFilter(hitoId)
    setActividadEstadoFilter("todos")
    setActividadPage(index >= 0 ? Math.floor(index / ACTIVIDADES_POR_PAGINA) + 1 : 1)
    setExpandedSubacts(prev => new Set(prev).add(actividadId))
    setActiveTab("actividades")
  }

  const actividadesVencidas = actividadesConAlertas.filter(
    (actividad) => actividad.alertaVencimiento?.tipo === "vencida",
  )

  const actividadesProximasAVencer = actividadesConAlertas.filter(
    (actividad) =>
      actividad.alertaVencimiento?.tipo === "proxima" ||
      actividad.alertaVencimiento?.tipo === "vence-hoy",
  )

  const hitosConAlertas = hitosState.map((hito) => ({
    ...hito,
    alertaVencimiento: getAlertaVencimientoHito(hito),
  }))

  const hitosVencidos = hitosConAlertas.filter(
    (hito) => hito.alertaVencimiento?.tipo === "vencido",
  )

  const hitosProximosAVencer = hitosConAlertas.filter(
    (hito) =>
      hito.alertaVencimiento?.tipo === "proximo" ||
      hito.alertaVencimiento?.tipo === "vence-hoy",
  )

  const documentos = getDocumentosByProyecto(id)
  const bitacora = getBitacoraByEntidad(id)

  const equipoVisual = apiProyecto
    ? apiEquipo.map(miembro => {
      const user = usuariosSistema.find(u => u.id === miembro.idUsuario)
      return {
        id: miembro.idUsuario,
        nombre: user ? `${user.nombres} ${user.apellidos}` : `Usuario ${miembro.idUsuario}`,
        rol: miembro.rolEnProyecto
      }
    })
    : equipo.map((e, idx) => ({ id: idx, nombre: e.nombre, rol: e.rol }))

  const territoriosFiltrados = territoriosCatalogo.filter(territorio =>
    normalizeSearch(territorio.nombre).includes(normalizeSearch(territorioSearch)),
  )
  const institucionesFiltradas = institucionesCatalogo.filter(institucion =>
    normalizeSearch(institucion.nombre).includes(normalizeSearch(institucionSearch)),
  )
  const responsablesFiltrados = usuariosSistema.filter(usuario => {
    const texto = `${usuario.nombres} ${usuario.apellidos} ${usuario.email}`
    return normalizeSearch(texto).includes(normalizeSearch(responsableSearch))
  })

  const responsableSeleccionado = usuariosSistema.find(usuario =>
    String(usuario.id) === editFormProyecto.idResponsablePrincipal,
  )

  const responsablesEdicionVisibles = responsableSeleccionado && !responsablesFiltrados.some(usuario => usuario.id === responsableSeleccionado.id)
    ? [responsableSeleccionado, ...responsablesFiltrados]
    : responsablesFiltrados

  // Calculate days remaining without shifting LocalDate values by timezone
  const diasRestantes = getDiasHastaFecha(proyecto.fechaFin)

  const tabs = [
    { id: "resumen" as TabType, label: "Resumen" },
    { id: "hitos" as TabType, label: "Hitos y Cronograma" },
    { id: "actividades" as TabType, label: "Actividades" },
    { id: "informes" as TabType, label: "Informes y Productos" },
    { id: "equipo" as TabType, label: "Equipo" },
    { id: "bitacora" as TabType, label: "Bitácora" },
  ]
  const visibleTabs = tabs.filter((tab) => tab.id !== "bitacora" || puedeVerBitacora)

  return (
    <AppLayout>
      <PermissionGuard permiso="PROYECTOS_READ">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href="/proyectos" className="hover:text-[#1A1A1A]">Proyectos</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#1A1A1A] font-medium">{proyecto.nombre}</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-[#1A1A1A]">{proyecto.nombre}</h1>
              <p className="inline-flex items-center rounded-md border border-[#E0E0E0] bg-white px-2.5 py-1 text-xs font-medium text-[#5C5C5C]">
                Código interno: <span className="ml-1 font-semibold text-[#1A1A1A]">{proyecto.codigo || "Sin código"}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(proyecto.macroregiones?.length ? proyecto.macroregiones : [{ id: 0, nombre: proyecto.macroregion }]).map((macroregion) => (
                <MacroregionBadge key={macroregion.id} macroregion={macroregion.nombre} />
              ))}
              <TypeBadge tipo={proyecto.ejeTematico} />
              <StatusBadge estado={proyecto.estado} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {puedeActualizarProyectos && (
            <>
            <Dialog open={editModalOpen} onOpenChange={(open) => {
              if (open && apiProyecto) {
                prepararFormularioEdicionProyecto(apiProyecto)
                setEditFieldErrors({})
              }
              setEditModalOpen(open)
            }}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]">
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Editar Proyecto</DialogTitle>
                  <DialogDescription>Actualiza todos los campos vinculados al proyecto.</DialogDescription>
                </DialogHeader>
                {editError && <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm text-[#C8102E]">{editError}</div>}
                <div className="grid gap-5 py-4">
                  <section className="grid gap-4 rounded-lg border border-[#E0E0E0] p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#5C5C5C]">Información general</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2 md:col-span-2" data-field="edit-nombre"><Label htmlFor="edit-proyecto-nombre">Nombre del proyecto <span className="text-[#C8102E]">*</span></Label><Input id="edit-proyecto-nombre" maxLength={50} value={editFormProyecto.nombre} onChange={e => { setEditFormProyecto(f => ({ ...f, nombre: e.target.value })); setEditFieldErrors(p => { const { "edit-nombre": _, ...r } = p; return r }) }} className={editFieldErrors["edit-nombre"] ? "border-[#C8102E]" : ""} />{editFieldErrors["edit-nombre"] && <p className="text-xs text-[#C8102E]">{editFieldErrors["edit-nombre"]}</p>}</div>
                      <div className="grid gap-2" data-field="edit-codigoInterno"><Label htmlFor="edit-proyecto-codigo">Código interno <span className="text-[#C8102E]">*</span></Label><Input id="edit-proyecto-codigo" disabled value={editFormProyecto.codigoInterno} className="cursor-not-allowed border-[#E0E0E0] bg-gray-50 text-[#5C5C5C] opacity-70" /><div className="min-h-5"></div></div>
                      <div className="grid gap-2"><Label htmlFor="edit-proyecto-eje">Eje temático</Label><Select value={editFormProyecto.idEjeTematico || "sin-eje"} onValueChange={v => setEditFormProyecto(f => ({ ...f, idEjeTematico: v === "sin-eje" ? "" : v }))}><SelectTrigger id="edit-proyecto-eje"><SelectValue placeholder="Seleccionar eje" /></SelectTrigger><SelectContent><SelectItem value="sin-eje">Sin eje temático</SelectItem>{ejesCatalogo.map(eje => <SelectItem key={eje.id} value={String(eje.id)}>{eje.nombre}</SelectItem>)}</SelectContent></Select><div className="min-h-5"></div></div>
                      <div className="grid gap-2 md:col-span-2"><Label htmlFor="edit-proyecto-descripcion">Descripción</Label><Textarea id="edit-proyecto-descripcion" rows={3} maxLength={200} value={editFormProyecto.descripcion} onChange={e => setEditFormProyecto(f => ({ ...f, descripcion: e.target.value }))} /><div className="flex justify-end"><span className={`text-xs ${editFormProyecto.descripcion.length >= 200 ? "text-[#C8102E]" : editFormProyecto.descripcion.length > 160 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{editFormProyecto.descripcion.length}/200</span></div></div>
                      <div className="grid gap-2 md:col-span-2"><Label htmlFor="edit-proyecto-objetivo">Objetivo general</Label><Textarea id="edit-proyecto-objetivo" rows={2} maxLength={200} value={editFormProyecto.objetivoGeneral} onChange={e => setEditFormProyecto(f => ({ ...f, objetivoGeneral: e.target.value }))} /><div className="flex justify-end"><span className={`text-xs ${editFormProyecto.objetivoGeneral.length >= 200 ? "text-[#C8102E]" : editFormProyecto.objetivoGeneral.length > 160 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{editFormProyecto.objetivoGeneral.length}/200</span></div></div>
                    </div>
                  </section>
                  <section className="grid gap-4 rounded-lg border border-[#E0E0E0] p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#5C5C5C]">Fechas, estado, prioridad, avance y presupuesto</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="grid gap-2" data-field="edit-fechaInicio"><Label>Fecha de inicio <span className="text-[#C8102E]">*</span></Label><Input type="date" value={editFormProyecto.fechaInicio} onChange={e => { const v = e.target.value; setEditFormProyecto(f => ({ ...f, fechaInicio: v })); setEditFieldErrors(p => { const { "edit-fechaInicio": _, "edit-fechaFinEstimada": __, ...r } = p; if (v && editFormProyecto.fechaFinEstimada && editFormProyecto.fechaFinEstimada < v) { r["edit-fechaFinEstimada"] = "La fecha de fin estimada no puede ser anterior a la fecha de inicio" }; return r }) }} className={editFieldErrors["edit-fechaInicio"] ? "border-[#C8102E]" : ""} />{editFieldErrors["edit-fechaInicio"] && <p className="text-xs text-[#C8102E]">{editFieldErrors["edit-fechaInicio"]}</p>}<div className="min-h-5"></div></div>
                      <div className="grid gap-2" data-field="edit-fechaFinEstimada"><Label>Fecha de fin estimada</Label><Input type="date" value={editFormProyecto.fechaFinEstimada} onChange={e => { const v = e.target.value; setEditFormProyecto(f => ({ ...f, fechaFinEstimada: v })); setEditFieldErrors(p => { const { "edit-fechaFinEstimada": _, ...r } = p; if (v && editFormProyecto.fechaInicio && v < editFormProyecto.fechaInicio) { r["edit-fechaFinEstimada"] = "La fecha de fin estimada no puede ser anterior a la fecha de inicio" }; return r }) }} className={editFieldErrors["edit-fechaFinEstimada"] ? "border-[#C8102E]" : ""} />{editFieldErrors["edit-fechaFinEstimada"] && <p className="text-xs text-[#C8102E]">{editFieldErrors["edit-fechaFinEstimada"]}</p>}<div className="min-h-5"></div></div>
                      <div className="grid gap-2"><Label>Estado <span className="text-[#C8102E]">*</span></Label><Select value={editFormProyecto.estado} onValueChange={v => setEditFormProyecto(f => ({ ...f, estado: v as EstadoProyecto }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ESTADOS_PROYECTO.map(estado => <SelectItem key={estado.value} value={estado.value}>{estado.label}</SelectItem>)}</SelectContent></Select><div className="min-h-5"></div></div>
                      <div className="grid gap-2"><Label>Prioridad</Label><Select value={editFormProyecto.nivelPrioridad || "sin-prioridad"} onValueChange={v => setEditFormProyecto(f => ({ ...f, nivelPrioridad: v === "sin-prioridad" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORIDADES_PROYECTO.map(prioridad => <SelectItem key={prioridad.value || "sin-prioridad"} value={prioridad.value || "sin-prioridad"}>{prioridad.label}</SelectItem>)}</SelectContent></Select><div className="min-h-5"></div></div>
                      <div className="grid gap-2" data-field="edit-porcentajeAvance"><Label>Avance calculado (%)</Label><Input type="number" value={editFormProyecto.porcentajeAvance} disabled /><p className="text-xs text-[#777]">Se calcula según la duración y finalización de hitos y actividades.</p></div>
                      <div className="grid gap-2" data-field="edit-presupuesto"><Label>Presupuesto</Label><Input type="number" min="0" step="0.01" value={editFormProyecto.presupuesto} onChange={e => { const v = e.target.value; setEditFormProyecto(f => ({ ...f, presupuesto: v })); setEditFieldErrors(p => { const { "edit-presupuesto": _, ...r } = p; if (v && Number(v) < 0) { r["edit-presupuesto"] = "El presupuesto no puede ser negativo" }; return r }) }} className={editFieldErrors["edit-presupuesto"] ? "border-[#C8102E]" : ""} />{editFieldErrors["edit-presupuesto"] && <p className="text-xs text-[#C8102E]">{editFieldErrors["edit-presupuesto"]}</p>}<div className="min-h-5"></div></div>
                    </div>
                  </section>
                  <section className="grid gap-4 rounded-lg border border-[#E0E0E0] p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#5C5C5C]">Clasificación y relaciones</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2" data-field="edit-idMacroregiones">
                        <Label>Macroregiones <span className="text-[#C8102E]">*</span></Label>
                        <div className={`flex min-h-24 flex-wrap items-center gap-2 rounded-md border p-3 ${editFieldErrors["edit-idMacroregiones"] ? "border-[#C8102E]" : "border-[#E0E0E0]"}`}>
                          {macroregionesCatalogo.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => toggleEditMacroregion(m.id)}
                              className={`rounded-full px-3 py-1 text-xs font-medium ${editFormProyecto.idMacroregiones.includes(m.id) ? "bg-[#FFD600] text-[#1A1A1A]" : "border border-[#E0E0E0] text-[#5C5C5C]"}`}
                            >
                              {m.nombre}
                            </button>
                          ))}
                        </div>
                        {editFieldErrors["edit-idMacroregiones"] && <p className="text-xs text-[#C8102E]">{editFieldErrors["edit-idMacroregiones"]}</p>}<div className="min-h-5"></div>
                      </div>
                      <div className="grid gap-2" data-field="edit-idResponsablePrincipal">
                        <Label>Responsable principal <span className="text-[#C8102E]">*</span></Label>
                        <Input
                          placeholder="Buscar responsable..."
                          value={responsableSearch}
                          onChange={e => setResponsableSearch(e.target.value)}
                        />
                        <div className={`flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border p-3 ${editFieldErrors["edit-idResponsablePrincipal"] ? "border-[#C8102E]" : "border-[#E0E0E0]"}`}>
                          {responsablesEdicionVisibles.length > 0 ? responsablesEdicionVisibles.map(u => {
                            const selected = editFormProyecto.idResponsablePrincipal === String(u.id)
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => { setEditFormProyecto(f => ({ ...f, idResponsablePrincipal: String(u.id) })); setEditFieldErrors(p => { const { "edit-idResponsablePrincipal": _, ...r } = p; return r }) }}
                                className={`rounded-full px-3 py-1 text-xs font-medium ${selected ? "bg-[#FFD600] text-[#1A1A1A]" : "border border-[#E0E0E0] text-[#5C5C5C]"}`}
                              >
                                {u.nombres} {u.apellidos}
                              </button>
                            )
                          }) : <span className="text-xs text-[#5C5C5C]">No se encontraron responsables.</span>}
                        </div>
                        {editFieldErrors["edit-idResponsablePrincipal"] && <p className="text-xs text-[#C8102E]">{editFieldErrors["edit-idResponsablePrincipal"]}</p>}<div className="min-h-5"></div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Territorios (departamentos)</Label>
                        <Input
                          placeholder="Buscar departamento..."
                          value={territorioSearch}
                          onChange={e => setTerritorioSearch(e.target.value)}
                        />
                        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-[#E0E0E0] p-3">
                          {territoriosFiltrados.length > 0 ? territoriosFiltrados.map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleEditTerritorio(t.id)}
                              className={`rounded-full px-3 py-1 text-xs font-medium ${editFormProyecto.idTerritorios.includes(t.id) ? "bg-[#FFD600] text-[#1A1A1A]" : "border border-[#E0E0E0] text-[#5C5C5C]"}`}
                            >
                              {t.nombre}
                            </button>
                          )) : <span className="text-xs text-[#5C5C5C]">No se encontraron departamentos.</span>}
                        </div>
                        {editFormProyecto.idTerritorios.length > 0 && (
                          <p className="text-xs text-[#5C5C5C]">{editFormProyecto.idTerritorios.length} departamento(s) seleccionado(s)</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label>Instituciones miembro</Label>
                        <Input
                          placeholder="Buscar institución..."
                          value={institucionSearch}
                          onChange={e => setInstitucionSearch(e.target.value)}
                        />
                        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-[#E0E0E0] p-3">
                          {institucionesFiltradas.length > 0 ? institucionesFiltradas.map(inst => {
                            const selected = editFormProyecto.instituciones.some(item => item.idInstitucion === inst.id)
                            return (
                              <button
                                key={inst.id}
                                type="button"
                                onClick={() => toggleEditInstitucion(inst.id)}
                                className={`rounded-full px-3 py-1 text-xs font-medium ${selected ? "bg-[#FFD600] text-[#1A1A1A]" : "border border-[#E0E0E0] text-[#5C5C5C]"}`}
                              >
                                {inst.nombre}
                              </button>
                            )
                          }) : <span className="text-xs text-[#5C5C5C]">No se encontraron instituciones.</span>}
                        </div>
                        {editFormProyecto.instituciones.length > 0 && (
                          <p className="text-xs text-[#5C5C5C]">{editFormProyecto.instituciones.length} institución(es) seleccionada(s) como miembro.</p>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
                <DialogFooter><Button variant="outline" type="button" onClick={() => setEditModalOpen(false)} disabled={editSubmitting}>Cancelar</Button><Button type="button" onClick={guardarEdicionProyecto} disabled={editSubmitting} className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">{editSubmitting ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar cambios</>}</Button></DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={editSuccessModalOpen} onOpenChange={setEditSuccessModalOpen}>
              <DialogContent className="sm:max-w-md" showCloseButton={false}>
                <DialogHeader>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <DialogTitle className="text-center text-lg">
                    Proyecto actualizado exitosamente
                  </DialogTitle>
                  <DialogDescription className="text-center">
                    Los cambios se han guardado correctamente.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center">
                  <Button type="button" onClick={() => setEditSuccessModalOpen(false)} className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">
                    Aceptar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
            )}

            <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]">
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]">
              <Archive className="h-4 w-4" />
              Archivar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Main content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-[#F7F7F7] p-1">
              {visibleTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
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
              {/* Resumen Tab */}
              {activeTab === "resumen" && (
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                      Descripción
                    </h3>
                    <p className="text-sm text-[#1A1A1A] leading-relaxed">
                      {proyecto.descripcion}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                      Objetivo
                    </h3>
                    <p className="text-sm text-[#1A1A1A] leading-relaxed">
                      {proyecto.objetivo}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-2">
                        Territorios / departamentos
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {proyecto.territorios.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#F7F7F7] px-3 py-1 text-xs text-[#5C5C5C]">
                            <MapPin className="h-3 w-3" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                          Instituciones Miembro
                        </h3>
                        {proyecto.fuenteDatos !== "api" && <MockDataTag />}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {proyecto.institucionesMiembro.length > 0 ? proyecto.institucionesMiembro.map(i => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[#FFD600]/10 px-3 py-1 text-xs text-[#C9A42B]">
                            <Building2 className="h-3 w-3" />
                            {i}
                          </span>
                        )) : <span className="text-sm text-[#5C5C5C]">Sin instituciones vinculadas</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actividades Tab */}
              {activeTab === "actividades" && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                        Actividades del Proyecto
                      </h3>
                      {actividadesLoading && (
                        <span className="text-xs text-[#5C5C5C]">Sincronizando...</span>
                      )}
                    </div>
                    <Dialog open={createActividadOpen} onOpenChange={(open) => { setCreateActividadOpen(open); if (open) { setActForm({ nombre: "", descripcion: "", fechaInicio: "", fechaFin: "", idResponsables: [], idHito: "", estado: "PENDIENTE" }); setActFieldErrors({}); setActResponsableSearch("") } }}>
                      <DialogTrigger asChild>
                        <button className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#C9A42B]">
                          <Plus className="h-3.5 w-3.5" />
                          Agregar actividad
                        </button>
                      </DialogTrigger>
                      <DialogContent className="overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Nueva Actividad</DialogTitle>
                          <DialogDescription>Detalle la nueva actividad a registrar para este proyecto.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                          <div className="grid gap-2" data-field="act-nombre">
                            <Label htmlFor="act-nombre">Nombre de la actividad <span className="text-[#C8102E]">*</span></Label>
                            <div className="relative">
                              <Input id="act-nombre" maxLength={50} placeholder="Ej. Taller de sensibilización" value={actForm.nombre} onChange={e => { setActForm(f => ({ ...f, nombre: e.target.value })); setActFieldErrors(p => { const { "act-nombre": _, ...r } = p; return r }) }} className={actFieldErrors["act-nombre"] ? "border-[#C8102E] pr-16" : "pr-16"} />
                              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${actForm.nombre.length >= 50 ? "text-[#C8102E]" : actForm.nombre.length >= 40 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{actForm.nombre.length}/50</span>
                            </div>
                            {actFieldErrors["act-nombre"] && <p className="text-xs text-[#C8102E]">{actFieldErrors["act-nombre"]}</p>}
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="act-descripcion">Descripción</Label>
                            <Textarea id="act-descripcion" maxLength={200} rows={3} placeholder="Descripción de la actividad..." value={actForm.descripcion} onChange={e => setActForm(f => ({ ...f, descripcion: e.target.value }))} />
                            <div className="flex justify-end">
                              <span className={`text-xs ${actForm.descripcion.length >= 200 ? "text-[#C8102E]" : actForm.descripcion.length > 160 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{actForm.descripcion.length}/200</span>
                            </div>
                          </div>
                          <div className="grid gap-2" data-field="act-idResponsables">
                            <Label>Responsable(s) <span className="text-[#C8102E]">*</span></Label>
                            <Input
                              type="search"
                              placeholder="Buscar responsable..."
                              value={actResponsableSearch}
                              onChange={e => setActResponsableSearch(e.target.value)}
                            />
                            <div className={`flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border p-3 ${actFieldErrors["act-idResponsables"] ? "border-[#C8102E]" : "border-[#E0E0E0]"}`}>
                              {Array.from(usuariosMap.entries()).length > 0 ? (
                                Array.from(usuariosMap.entries())
                                  .filter(([, nombre]) => nombre.toLowerCase().includes(actResponsableSearch.toLowerCase()))
                                  .map(([id, nombre]) => {
                                    const selected = actForm.idResponsables.includes(id)
                                    return (
                                      <button
                                        key={id}
                                        type="button"
                                        onClick={() => { setActForm(f => ({ ...f, idResponsables: selected ? f.idResponsables.filter(i => i !== id) : [...f.idResponsables, id] })); setActFieldErrors(p => { const { "act-idResponsables": _, ...r } = p; return r }) }}
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${selected ? "bg-[#FFD600] text-[#1A1A1A]" : "border border-[#E0E0E0] text-[#5C5C5C]"}`}
                                      >
                                        {nombre}
                                      </button>
                                    )
                                  })
                              ) : (
                                <span className="text-sm text-[#5C5C5C]">Cargando usuarios...</span>
                              )}
                            </div>
                            {actFieldErrors["act-idResponsables"] && <p className="text-xs text-[#C8102E]">{actFieldErrors["act-idResponsables"]}</p>}
                          </div>
                          <div className="grid gap-2" data-field="act-idHito">
                            <Label>Hito relacionado <span className="text-[#C8102E]">*</span></Label>
                            <Select value={actForm.idHito} onValueChange={value => { setActForm(f => ({ ...f, idHito: value })); setActFieldErrors(prev => { const { "act-idHito": _, ...rest } = prev; return rest }) }}>
                              <SelectTrigger className={actFieldErrors["act-idHito"] ? "border-[#C8102E]" : ""}><SelectValue placeholder="Selecciona un hito" /></SelectTrigger>
                              <SelectContent>{hitosState.filter(h => h.fuenteDatos === "api").map(hito => <SelectItem key={hito.id} value={hito.id}>{hito.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            {actFieldErrors["act-idHito"] && <p className="text-xs text-[#C8102E]">{actFieldErrors["act-idHito"]}</p>}
                            {hitosState.filter(h => h.fuenteDatos === "api").length === 0 && <p className="text-xs text-[#8A6D00]">Primero registra un hito en “Hitos y Cronograma”.</p>}
                          </div>
                          <div className="grid gap-2">
                            <Label>Estado</Label>
                            <Select value={actForm.estado} onValueChange={v => setActForm(f => ({ ...f, estado: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                                <SelectItem value="EN_CURSO">En curso</SelectItem>
                                <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2" data-field="act-fechaInicio">
                              <Label htmlFor="act-inicio">Fecha de Inicio <span className="text-[#C8102E]">*</span></Label>
                              <Input id="act-inicio" type="date" value={actForm.fechaInicio} onChange={e => { const v = e.target.value; setActForm(f => ({ ...f, fechaInicio: v })); setActFieldErrors(p => { const { "act-fechaInicio": _, "act-fechaFin": __, ...r } = p; if (v && actForm.fechaFin && actForm.fechaFin < v) { r["act-fechaFin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={actFieldErrors["act-fechaInicio"] ? "border-[#C8102E]" : ""} />
                              {actFieldErrors["act-fechaInicio"] && <p className="text-xs text-[#C8102E]">{actFieldErrors["act-fechaInicio"]}</p>}
                            </div>
                            <div className="grid gap-2" data-field="act-fechaFin">
                              <Label htmlFor="act-fin">Fecha de Fin</Label>
                              <Input id="act-fin" type="date" value={actForm.fechaFin} onChange={e => { const v = e.target.value; setActForm(f => ({ ...f, fechaFin: v })); setActFieldErrors(p => { const { "act-fechaFin": _, ...r } = p; if (v && actForm.fechaInicio && v < actForm.fechaInicio) { r["act-fechaFin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={actFieldErrors["act-fechaFin"] ? "border-[#C8102E]" : ""} />
                              {actFieldErrors["act-fechaFin"] && <p className="text-xs text-[#C8102E]">{actFieldErrors["act-fechaFin"]}</p>}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setCreateActividadOpen(false)}>Cancelar</Button>
                          <Button
                            className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                            disabled={creandoActividad}
                            onClick={async () => {
                              const errors = validarActForm()
                              if (Object.keys(errors).length > 0) {
                                setActFieldErrors(errors)
                                const firstField = Object.keys(errors)[0]
                                const el = document.querySelector(`[data-field="${firstField}"]`)
                                el?.scrollIntoView({ behavior: "smooth", block: "center" })
                                const input = el?.querySelector("input, select, textarea, button")
                                if (input instanceof HTMLElement) input.focus()
                                return
                              }
                              setCreandoActividad(true)
                              try {
                                const creada = await api.post<ActividadResponse>("/actividades", {
                                  nombre: actForm.nombre.trim(),
                                  descripcion: actForm.descripcion.trim() || undefined,
                                  fechaInicio: actForm.fechaInicio || undefined,
                                  fechaFin: actForm.fechaFin || undefined,
                                  estado: actForm.estado as EstadoActividad,
                                  idProyecto: Number(id),
                                  idHito: Number(actForm.idHito),
                                  idResponsables: actForm.idResponsables.length > 0 ? actForm.idResponsables : undefined,
                                })
                                setActividadesApi(prev => [...prev, creada])
                                await sincronizarAvancePlan()
                                setActForm({ nombre: "", descripcion: "", fechaInicio: "", fechaFin: "", idResponsables: [], idHito: "", estado: "PENDIENTE" })
                                setCreateActividadOpen(false)
                                setActSuccessModalOpen(true)
                              } catch (err) {
                                console.error(err)
                              } finally {
                                setCreandoActividad(false)
                              }
                            }}
                          >
                            {creandoActividad ? "Creando..." : "Crear actividad"}
                          </Button>
                        </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={actSuccessModalOpen} onOpenChange={setActSuccessModalOpen}>
                    <DialogContent className="sm:max-w-md" showCloseButton={false}>
                      <DialogHeader>
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <DialogTitle className="text-center text-lg">
                          Actividad creada exitosamente
                        </DialogTitle>
                        <DialogDescription className="text-center">
                          La actividad se ha registrado correctamente.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="sm:justify-center">
                        <Button type="button" onClick={() => setActSuccessModalOpen(false)} className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">
                          Aceptar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* ── EDITAR ACTIVIDAD ── */}
                  <Dialog open={editActividadOpen} onOpenChange={(open) => { setEditActividadOpen(open); if (open) { setEditActFieldErrors({}); setEditActResponsableSearch("") } }}>
                    <DialogContent className="overflow-y-auto sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Editar Actividad</DialogTitle>
                        <DialogDescription>Modifica los datos de la actividad seleccionada.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-6">
                        <div className="grid gap-2" data-field="edit-nombre">
                          <Label htmlFor="edit-nombre">Nombre de la actividad <span className="text-[#C8102E]">*</span></Label>
                          <div className="relative">
                            <Input id="edit-nombre" maxLength={50} placeholder="Ej. Taller de sensibilización" value={editForm.nombre} onChange={e => { setEditForm(f => ({ ...f, nombre: e.target.value })); setEditActFieldErrors(p => { const { "edit-nombre": _, ...r } = p; return r }) }} className={`${editActFieldErrors["edit-nombre"] ? "border-[#C8102E] pr-16" : "pr-16"}`} />
                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${editForm.nombre.length >= 50 ? "text-[#C8102E]" : editForm.nombre.length >= 40 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{editForm.nombre.length}/50</span>
                          </div>
                          {editActFieldErrors["edit-nombre"] && <p className="text-xs text-[#C8102E]">{editActFieldErrors["edit-nombre"]}</p>}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-descripcion">Descripción</Label>
                          <Textarea id="edit-descripcion" maxLength={200} rows={3} placeholder="Descripción de la actividad..." value={editForm.descripcion} onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))} />
                          <div className="flex justify-end">
                            <span className={`text-xs ${editForm.descripcion.length >= 200 ? "text-[#C8102E]" : editForm.descripcion.length > 160 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{editForm.descripcion.length}/200</span>
                          </div>
                        </div>
                        <div className="grid gap-2" data-field="edit-idResponsables">
                          <Label>Responsable(s) <span className="text-[#C8102E]">*</span></Label>
                          <Input
                            type="search"
                            placeholder="Buscar responsable..."
                            value={editActResponsableSearch}
                            onChange={e => setEditActResponsableSearch(e.target.value)}
                          />
                          <div className={`flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border p-3 ${editActFieldErrors["edit-idResponsables"] ? "border-[#C8102E]" : "border-[#E0E0E0]"}`}>
                            {Array.from(usuariosMap.entries()).length > 0 ? (
                              Array.from(usuariosMap.entries())
                                .filter(([, nombre]) => nombre.toLowerCase().includes(editActResponsableSearch.toLowerCase()))
                                .map(([id, nombre]) => {
                                  const selected = editForm.idResponsables.includes(id)
                                  return (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() => { setEditForm(f => ({ ...f, idResponsables: selected ? f.idResponsables.filter(i => i !== id) : [...f.idResponsables, id] })); setEditActFieldErrors(p => { const { "edit-idResponsables": _, ...r } = p; return r }) }}
                                      className={`rounded-full px-3 py-1 text-xs font-medium ${selected ? "bg-[#FFD600] text-[#1A1A1A]" : "border border-[#E0E0E0] text-[#5C5C5C]"}`}
                                    >
                                      {nombre}
                                    </button>
                                  )
                                })
                            ) : (
                              <span className="text-sm text-[#5C5C5C]">Cargando usuarios...</span>
                            )}
                          </div>
                          {editActFieldErrors["edit-idResponsables"] && <p className="text-xs text-[#C8102E]">{editActFieldErrors["edit-idResponsables"]}</p>}
                        </div>
                        <div className="grid gap-2" data-field="edit-idHito">
                          <Label>Hito relacionado <span className="text-[#C8102E]">*</span></Label>
                          <Select value={editForm.idHito} onValueChange={value => { setEditForm(f => ({ ...f, idHito: value })); setEditActFieldErrors(prev => { const { "edit-idHito": _, ...rest } = prev; return rest }) }}>
                            <SelectTrigger className={editActFieldErrors["edit-idHito"] ? "border-[#C8102E]" : ""}><SelectValue placeholder="Selecciona un hito" /></SelectTrigger>
                            <SelectContent>{hitosState.filter(h => h.fuenteDatos === "api").map(hito => <SelectItem key={hito.id} value={hito.id}>{hito.nombre}</SelectItem>)}</SelectContent>
                          </Select>
                          {editActFieldErrors["edit-idHito"] && <p className="text-xs text-[#C8102E]">{editActFieldErrors["edit-idHito"]}</p>}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-estado">Estado</Label>
                          <Select value={editForm.estado} onValueChange={v => setEditForm(f => ({ ...f, estado: v as EstadoActividad }))}>
                            <SelectTrigger id="edit-estado"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                              <SelectItem value="EN_CURSO">En curso</SelectItem>
                              <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2" data-field="edit-inicio">
                            <Label htmlFor="edit-inicio">Fecha de Inicio <span className="text-[#C8102E]">*</span></Label>
                            <Input id="edit-inicio" type="date" value={editForm.fechaInicio} onChange={e => { const v = e.target.value; setEditForm(f => ({ ...f, fechaInicio: v })); setEditActFieldErrors(p => { const { "edit-inicio": _, "edit-fin": __, ...r } = p; if (v && editForm.fechaFin && editForm.fechaFin < v) { r["edit-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={editActFieldErrors["edit-inicio"] ? "border-[#C8102E]" : ""} />
                            {editActFieldErrors["edit-inicio"] && <p className="text-xs text-[#C8102E]">{editActFieldErrors["edit-inicio"]}</p>}
                          </div>
                          <div className="grid gap-2" data-field="edit-fin">
                            <Label htmlFor="edit-fin">Fecha de Fin</Label>
                            <Input id="edit-fin" type="date" value={editForm.fechaFin} onChange={e => { const v = e.target.value; setEditForm(f => ({ ...f, fechaFin: v })); setEditActFieldErrors(p => { const { "edit-fin": _, ...r } = p; if (v && editForm.fechaInicio && v < editForm.fechaInicio) { r["edit-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={editActFieldErrors["edit-fin"] ? "border-[#C8102E]" : ""} />
                            {editActFieldErrors["edit-fin"] && <p className="text-xs text-[#C8102E]">{editActFieldErrors["edit-fin"]}</p>}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditActividadOpen(false)}>Cancelar</Button>
                        <Button
                          className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                          disabled={editandoActividad}
                          onClick={async () => {
                            setEditActFieldErrors({})
                            const errors = validarEditActForm()
                            if (Object.keys(errors).length > 0) {
                              setEditActFieldErrors(errors)
                              const firstField = Object.keys(errors)[0]
                              const el = document.querySelector(`[data-field="${firstField}"]`)
                              el?.scrollIntoView({ behavior: "smooth", block: "center" })
                              return
                            }
                            if (!editingActividad) return
                            setEditandoActividad(true)
                            try {
                              const actualizada = await api.put<ActividadResponse>("/actividades/" + editingActividad.id, {
                                nombre: editForm.nombre.trim(),
                                descripcion: editForm.descripcion.trim() || undefined,
                                fechaInicio: editForm.fechaInicio || undefined,
                                fechaFin: editForm.fechaFin || undefined,
                                estado: editForm.estado,
                                idProyecto: editingActividad.idProyecto,
                                idHito: Number(editForm.idHito),
                                idResponsables: editForm.idResponsables.length > 0 ? editForm.idResponsables : undefined,
                              })
                              setActividadesApi(prev => prev.map(a => a.id === actualizada.id ? actualizada : a))
                              await sincronizarAvancePlan()
                              setEditActividadOpen(false)
                              setEditingActividad(null)
                              setEditActSuccessModalOpen(true)
                            } catch (err) {
                              console.error(err)
                            } finally {
                              setEditandoActividad(false)
                            }
                          }}
                        >
                          {editandoActividad ? "Guardando..." : "Guardar cambios"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={editActSuccessModalOpen} onOpenChange={setEditActSuccessModalOpen}>
                    <DialogContent className="sm:max-w-md" showCloseButton={false}>
                      <DialogHeader>
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <DialogTitle className="text-center text-lg">
                          Actividad actualizada exitosamente
                        </DialogTitle>
                        <DialogDescription className="text-center">
                          Los cambios se han guardado correctamente.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="sm:justify-center">
                        <Button type="button" onClick={() => setEditActSuccessModalOpen(false)} className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">
                          Aceptar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* ── CREAR SUBACTIVIDAD ── */}
                  <Dialog open={createSubactOpen} onOpenChange={(open) => { setCreateSubactOpen(open); if (open) { setSubactForm({ nombre: "", idResponsable: "", presupuesto: "", hombresInvolucrados: "", mujeresInvolucradas: "", fechaInicio: "", fechaFin: "", estado: "PENDIENTE", descripcion: "" }); setSubactFieldErrors({}); setSubactResponsableSearch("") } }}>
                    <DialogContent className="overflow-y-auto sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Nueva Subactividad</DialogTitle>
                        <DialogDescription>Añadir una subactividad a la actividad seleccionada.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={e => e.preventDefault()} noValidate>
                        <div className="grid gap-4 py-6">
                          <div className="grid gap-2" data-field="sub-nombre">
                            <Label htmlFor="sub-nombre">Nombre de la subactividad <span className="text-[#C8102E]">*</span></Label>
                            <div className="relative">
                              <Input id="sub-nombre" maxLength={50} placeholder="Ej. Sesión teórica" value={subactForm.nombre} onChange={e => { setSubactForm(f => ({ ...f, nombre: e.target.value })); setSubactFieldErrors(p => { const { "sub-nombre": _, ...r } = p; return r }) }} className={subactFieldErrors["sub-nombre"] ? "border-[#C8102E] pr-16" : "pr-16"} />
                              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${subactForm.nombre.length >= 50 ? "text-[#C8102E]" : subactForm.nombre.length >= 40 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{subactForm.nombre.length}/50</span>
                            </div>
                            {subactFieldErrors["sub-nombre"] && <p className="text-xs text-[#C8102E]">{subactFieldErrors["sub-nombre"]}</p>}
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="sub-descripcion">Descripción</Label>
                            <Textarea id="sub-descripcion" maxLength={200} rows={3} placeholder="Descripción..." value={subactForm.descripcion} onChange={e => setSubactForm(f => ({ ...f, descripcion: e.target.value }))} />
                            <div className="flex justify-end">
                              <span className={`text-xs ${subactForm.descripcion.length >= 200 ? "text-[#C8102E]" : subactForm.descripcion.length > 160 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{subactForm.descripcion.length}/200</span>
                            </div>
                          </div>
                          <div className="grid gap-2" data-field="sub-idResponsable">
                            <Label>Responsable <span className="text-[#C8102E]">*</span></Label>
                            <Input
                              type="search"
                              placeholder="Buscar responsable..."
                              value={subactResponsableSearch}
                              onChange={e => setSubactResponsableSearch(e.target.value)}
                            />
                            <div className={`flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border p-3 ${subactFieldErrors["sub-idResponsable"] ? "border-[#C8102E]" : "border-[#E0E0E0]"}`}>
                              {Array.from(usuariosMap.entries()).length > 0 ? (
                                Array.from(usuariosMap.entries())
                                  .filter(([, nombre]) => nombre.toLowerCase().includes(subactResponsableSearch.toLowerCase()))
                                  .map(([id, nombre]) => {
                                    const selected = subactForm.idResponsable === String(id)
                                    return (
                                      <button
                                        key={id}
                                        type="button"
                                        onClick={() => { setSubactForm(f => ({ ...f, idResponsable: selected ? "" : String(id) })); setSubactFieldErrors(p => { const { "sub-idResponsable": _, ...r } = p; return r }) }}
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${selected ? "bg-[#FFD600] text-[#1A1A1A]" : "border border-[#E0E0E0] text-[#5C5C5C]"}`}
                                      >
                                        {nombre}
                                      </button>
                                    )
                                  })
                              ) : (
                                <span className="text-sm text-[#5C5C5C]">Cargando usuarios...</span>
                              )}
                            </div>
                            {subactFieldErrors["sub-idResponsable"] && <p className="text-xs text-[#C8102E]">{subactFieldErrors["sub-idResponsable"]}</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2" data-field="sub-inicio">
                              <Label htmlFor="sub-inicio">Fecha de Inicio <span className="text-[#C8102E]">*</span></Label>
                              <Input id="sub-inicio" type="date" value={subactForm.fechaInicio} onChange={e => { const v = e.target.value; setSubactForm(f => ({ ...f, fechaInicio: v })); setSubactFieldErrors(p => { const { "sub-inicio": _, "sub-fin": __, ...r } = p; if (v && subactForm.fechaFin && subactForm.fechaFin < v) { r["sub-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={subactFieldErrors["sub-inicio"] ? "border-[#C8102E]" : ""} />
                              {subactFieldErrors["sub-inicio"] && <p className="text-xs text-[#C8102E]">{subactFieldErrors["sub-inicio"]}</p>}
                            </div>
                            <div className="grid gap-2" data-field="sub-fin">
                              <Label htmlFor="sub-fin">Fecha de Fin</Label>
                              <Input id="sub-fin" type="date" value={subactForm.fechaFin} onChange={e => { const v = e.target.value; setSubactForm(f => ({ ...f, fechaFin: v })); setSubactFieldErrors(p => { const { "sub-fin": _, ...r } = p; if (v && subactForm.fechaInicio && v < subactForm.fechaInicio) { r["sub-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={subactFieldErrors["sub-fin"] ? "border-[#C8102E]" : ""} />
                              {subactFieldErrors["sub-fin"] && <p className="text-xs text-[#C8102E]">{subactFieldErrors["sub-fin"]}</p>}
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="sub-estado">Estado</Label>
                            <Select value={subactForm.estado} onValueChange={value => setSubactForm(f => ({ ...f, estado: value as EstadoActividad }))}>
                              <SelectTrigger id="sub-estado">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                                <SelectItem value="EN_CURSO">En curso</SelectItem>
                                <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2" data-field="sub-presu">
                              <Label htmlFor="sub-presu">Presupuesto (S/)</Label>
                              <Input id="sub-presu" type="number" min="0" value={subactForm.presupuesto} onChange={e => { const v = e.target.value; setSubactForm(f => ({ ...f, presupuesto: v })); setSubactFieldErrors(p => { const { "sub-presu": _, ...r } = p; if (v && Number(v) < 0) { r["sub-presu"] = "El presupuesto no puede ser negativo" }; return r }) }} className={subactFieldErrors["sub-presu"] ? "border-[#C8102E]" : ""} />
                              {subactFieldErrors["sub-presu"] && <p className="text-xs text-[#C8102E]">{subactFieldErrors["sub-presu"]}</p>}
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="sub-hombres">Hombres Involucrados</Label>
                              <Input id="sub-hombres" type="number" min="0" value={subactForm.hombresInvolucrados} onChange={e => setSubactForm(f => ({ ...f, hombresInvolucrados: e.target.value }))} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="sub-mujeres">Mujeres Involucradas</Label>
                              <Input id="sub-mujeres" type="number" min="0" value={subactForm.mujeresInvolucradas} onChange={e => setSubactForm(f => ({ ...f, mujeresInvolucradas: e.target.value }))} />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setCreateSubactOpen(false)}>Cancelar</Button>
                          <Button
                            className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                            disabled={creandoSubact}
                            onClick={async () => {
                              setSubactFieldErrors({})
                              const errors = validarSubactForm()
                              if (Object.keys(errors).length > 0) {
                                setSubactFieldErrors(errors)
                                const firstField = Object.keys(errors)[0]
                                const el = document.querySelector(`[data-field="${firstField}"]`)
                                el?.scrollIntoView({ behavior: "smooth", block: "center" })
                                return
                              }
                              if (!targetActividadId) return
                              setCreandoSubact(true)
                              try {
                                const nuevaSub: SubactividadCreate = {
                                  nombre: subactForm.nombre.trim(),
                                  idResponsable: Number(subactForm.idResponsable),
                                  presupuesto: subactForm.presupuesto ? Number(subactForm.presupuesto) : undefined,
                                  hombresInvolucrados: subactForm.hombresInvolucrados ? Number(subactForm.hombresInvolucrados) : undefined,
                                  mujeresInvolucradas: subactForm.mujeresInvolucradas ? Number(subactForm.mujeresInvolucradas) : undefined,
                                  fechaInicio: subactForm.fechaInicio || undefined,
                                  fechaFin: subactForm.fechaFin || undefined,
                                  estado: subactForm.estado,
                                  descripcion: subactForm.descripcion.trim() || undefined,
                                }
                                const creada = await api.post<SubactividadResponse>(`/actividades/${targetActividadId}/subactividades`, nuevaSub)
                                setActividadesApi(prev => prev.map(a => a.id === targetActividadId ? { ...a, subactividades: [...(a.subactividades || []), creada] } : a))
                                await sincronizarAvancePlan()
                                setCreateSubactOpen(false)
                                setSubactForm({
                                  nombre: "", idResponsable: "", presupuesto: "", hombresInvolucrados: "", mujeresInvolucradas: "", fechaInicio: "", fechaFin: "", estado: "PENDIENTE", descripcion: ""
                                })
                                setSubactSuccessModalOpen(true)
                              } catch (err) {
                                console.error(err)
                              } finally {
                                setCreandoSubact(false)
                              }
                            }}
                          >
                            {creandoSubact ? "Guardando..." : "Crear subactividad"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* ── EDITAR SUBACTIVIDAD ── */}
                  <Dialog open={editSubactOpen} onOpenChange={(open) => { setEditSubactOpen(open); if (open) { setEditSubactFieldErrors({}); setEditSubactResponsableSearch("") } }}>
                    <DialogContent className="overflow-y-auto sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Editar Subactividad</DialogTitle>
                        <DialogDescription>Modifica los datos de la subactividad seleccionada.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={e => e.preventDefault()} noValidate>
                        <div className="grid gap-4 py-6">
                          <div className="grid gap-2" data-field="edit-sub-nombre">
                            <Label htmlFor="edit-sub-nombre">Nombre de la subactividad <span className="text-[#C8102E]">*</span></Label>
                            <div className="relative">
                              <Input id="edit-sub-nombre" maxLength={50} placeholder="Ej. Sesión teórica" value={editSubactForm.nombre} onChange={e => { setEditSubactForm(f => ({ ...f, nombre: e.target.value })); setEditSubactFieldErrors(p => { const { "edit-sub-nombre": _, ...r } = p; return r }) }} className={editSubactFieldErrors["edit-sub-nombre"] ? "border-[#C8102E] pr-16" : "pr-16"} />
                              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${editSubactForm.nombre.length >= 50 ? "text-[#C8102E]" : editSubactForm.nombre.length >= 40 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{editSubactForm.nombre.length}/50</span>
                            </div>
                            {editSubactFieldErrors["edit-sub-nombre"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-nombre"]}</p>}
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-sub-descripcion">Descripción</Label>
                            <Textarea id="edit-sub-descripcion" maxLength={200} rows={3} placeholder="Descripción..." value={editSubactForm.descripcion} onChange={e => setEditSubactForm(f => ({ ...f, descripcion: e.target.value }))} />
                            <div className="flex justify-end">
                              <span className={`text-xs ${editSubactForm.descripcion.length >= 200 ? "text-[#C8102E]" : editSubactForm.descripcion.length > 160 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>{editSubactForm.descripcion.length}/200</span>
                            </div>
                          </div>
                          <div className="grid gap-2" data-field="edit-sub-idResponsable">
                            <Label>Responsable <span className="text-[#C8102E]">*</span></Label>
                            <Input
                              type="search"
                              placeholder="Buscar responsable..."
                              value={editSubactResponsableSearch}
                              onChange={e => setEditSubactResponsableSearch(e.target.value)}
                            />
                            <div className={`flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border p-3 ${editSubactFieldErrors["edit-sub-idResponsable"] ? "border-[#C8102E]" : "border-[#E0E0E0]"}`}>
                              {Array.from(usuariosMap.entries()).length > 0 ? (
                                Array.from(usuariosMap.entries())
                                  .filter(([, nombre]) => nombre.toLowerCase().includes(editSubactResponsableSearch.toLowerCase()))
                                  .map(([id, nombre]) => {
                                    const selected = editSubactForm.idResponsable === String(id)
                                    return (
                                      <button
                                        key={id}
                                        type="button"
                                        onClick={() => { setEditSubactForm(f => ({ ...f, idResponsable: selected ? "" : String(id) })); setEditSubactFieldErrors(p => { const { "edit-sub-idResponsable": _, ...r } = p; return r }) }}
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${selected ? "bg-[#FFD600] text-[#1A1A1A]" : "border border-[#E0E0E0] text-[#5C5C5C]"}`}
                                      >
                                        {nombre}
                                      </button>
                                    )
                                  })
                              ) : (
                                <span className="text-sm text-[#5C5C5C]">Cargando usuarios...</span>
                              )}
                            </div>
                            {editSubactFieldErrors["edit-sub-idResponsable"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-idResponsable"]}</p>}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2" data-field="edit-sub-inicio">
                              <Label htmlFor="edit-sub-inicio">Fecha de Inicio <span className="text-[#C8102E]">*</span></Label>
                              <Input id="edit-sub-inicio" type="date" value={editSubactForm.fechaInicio} onChange={e => { const v = e.target.value; setEditSubactForm(f => ({ ...f, fechaInicio: v })); setEditSubactFieldErrors(p => { const { "edit-sub-inicio": _, "edit-sub-fin": __, ...r } = p; if (v && editSubactForm.fechaFin && editSubactForm.fechaFin < v) { r["edit-sub-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={editSubactFieldErrors["edit-sub-inicio"] ? "border-[#C8102E]" : ""} />
                              {editSubactFieldErrors["edit-sub-inicio"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-inicio"]}</p>}
                            </div>
                            <div className="grid gap-2" data-field="edit-sub-fin">
                              <Label htmlFor="edit-sub-fin">Fecha de Fin</Label>
                              <Input id="edit-sub-fin" type="date" value={editSubactForm.fechaFin} onChange={e => { const v = e.target.value; setEditSubactForm(f => ({ ...f, fechaFin: v })); setEditSubactFieldErrors(p => { const { "edit-sub-fin": _, ...r } = p; if (v && editSubactForm.fechaInicio && v < editSubactForm.fechaInicio) { r["edit-sub-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={editSubactFieldErrors["edit-sub-fin"] ? "border-[#C8102E]" : ""} />
                              {editSubactFieldErrors["edit-sub-fin"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-fin"]}</p>}
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-sub-estado">Estado</Label>
                            <Select value={editSubactForm.estado} onValueChange={value => setEditSubactForm(f => ({ ...f, estado: value as EstadoActividad }))}>
                              <SelectTrigger id="edit-sub-estado">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                                <SelectItem value="EN_CURSO">En curso</SelectItem>
                                <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2" data-field="edit-sub-presu">
                              <Label htmlFor="edit-sub-presu">Presupuesto (S/)</Label>
                              <Input id="edit-sub-presu" type="number" min="0" value={editSubactForm.presupuesto} onChange={e => { const v = e.target.value; setEditSubactForm(f => ({ ...f, presupuesto: v })); setEditSubactFieldErrors(p => { const { "edit-sub-presu": _, ...r } = p; if (v && Number(v) < 0) { r["edit-sub-presu"] = "El presupuesto no puede ser negativo" }; return r }) }} className={editSubactFieldErrors["edit-sub-presu"] ? "border-[#C8102E]" : ""} />
                              {editSubactFieldErrors["edit-sub-presu"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-presu"]}</p>}
                            </div>
                            <div className="grid gap-2" data-field="edit-sub-hombres">
                              <Label htmlFor="edit-sub-hombres">Hombres Involucrados</Label>
                              <Input id="edit-sub-hombres" type="number" min="0" value={editSubactForm.hombresInvolucrados} onChange={e => { setEditSubactForm(f => ({ ...f, hombresInvolucrados: e.target.value })); setEditSubactFieldErrors(p => { const { "edit-sub-hombres": _, ...r } = p; return r }) }} className={editSubactFieldErrors["edit-sub-hombres"] ? "border-[#C8102E]" : ""} />
                              {editSubactFieldErrors["edit-sub-hombres"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-hombres"]}</p>}
                            </div>
                            <div className="grid gap-2" data-field="edit-sub-mujeres">
                              <Label htmlFor="edit-sub-mujeres">Mujeres Involucradas</Label>
                              <Input id="edit-sub-mujeres" type="number" min="0" value={editSubactForm.mujeresInvolucradas} onChange={e => { setEditSubactForm(f => ({ ...f, mujeresInvolucradas: e.target.value })); setEditSubactFieldErrors(p => { const { "edit-sub-mujeres": _, ...r } = p; return r }) }} className={editSubactFieldErrors["edit-sub-mujeres"] ? "border-[#C8102E]" : ""} />
                              {editSubactFieldErrors["edit-sub-mujeres"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-mujeres"]}</p>}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditSubactOpen(false)}>Cancelar</Button>
                          <Button
                            className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                            disabled={editandoSubact}
                            onClick={async () => {
                              setEditSubactFieldErrors({})
                              const errors = validarEditSubactForm()
                              if (Object.keys(errors).length > 0) {
                                setEditSubactFieldErrors(errors)
                                const firstField = Object.keys(errors)[0]
                                const el = document.querySelector(`[data-field="${firstField}"]`)
                                el?.scrollIntoView({ behavior: "smooth", block: "center" })
                                return
                              }
                              if (!editingSubact) return
                              setEditandoSubact(true)
                              try {
                                const { sub, actId } = editingSubact
                                const actualizada = await api.put<SubactividadResponse>(`/actividades/${actId}/subactividades/${sub.id}`, {
                                  nombre: editSubactForm.nombre.trim(),
                                  idResponsable: Number(editSubactForm.idResponsable),
                                  presupuesto: editSubactForm.presupuesto ? Number(editSubactForm.presupuesto) : undefined,
                                  hombresInvolucrados: editSubactForm.hombresInvolucrados ? Number(editSubactForm.hombresInvolucrados) : undefined,
                                  mujeresInvolucradas: editSubactForm.mujeresInvolucradas ? Number(editSubactForm.mujeresInvolucradas) : undefined,
                                  fechaInicio: editSubactForm.fechaInicio || undefined,
                                  fechaFin: editSubactForm.fechaFin || undefined,
                                  estado: editSubactForm.estado,
                                  descripcion: editSubactForm.descripcion.trim() || undefined,
                                })
                                setActividadesApi(prev => prev.map(a => a.id === actId ? {
                                  ...a,
                                  subactividades: (a.subactividades || []).map(s => s.id === actualizada.id ? actualizada : s)
                                } : a))
                                await sincronizarAvancePlan()
                                setEditSubactOpen(false)
                                setEditingSubact(null)
                                setEditSubactSuccessModalOpen(true)
                              } catch (err) {
                                console.error(err)
                              } finally {
                                setEditandoSubact(false)
                              }
                            }}
                          >
                            {editandoSubact ? "Guardando..." : "Guardar cambios"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={subactSuccessModalOpen} onOpenChange={setSubactSuccessModalOpen}>
                    <DialogContent className="sm:max-w-md" showCloseButton={false}>
                      <DialogHeader>
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <DialogTitle className="text-center text-lg">
                          Subactividad creada exitosamente
                        </DialogTitle>
                        <DialogDescription className="text-center">
                          La subactividad se ha registrado correctamente.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="sm:justify-center">
                        <Button type="button" onClick={() => setSubactSuccessModalOpen(false)} className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">
                          Aceptar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={editSubactSuccessModalOpen} onOpenChange={setEditSubactSuccessModalOpen}>
                    <DialogContent className="sm:max-w-md" showCloseButton={false}>
                      <DialogHeader>
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <DialogTitle className="text-center text-lg">
                          Subactividad actualizada exitosamente
                        </DialogTitle>
                        <DialogDescription className="text-center">
                          Los cambios se han guardado correctamente.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="sm:justify-center">
                        <Button type="button" onClick={() => setEditSubactSuccessModalOpen(false)} className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">
                          Aceptar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                </div>
                  {actividadesLoading ? (
                <div className="text-center py-8 text-sm text-[#5C5C5C]">Cargando actividades...</div>
              ) : actividadesError ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[#C8102E]">Error al cargar actividades: {actividadesError}</p>
                </div>
              ) : actividades.length > 0 ? (
                actividadesConAlertas.length > 0 ? (
                  <>
                    {(actividadesVencidas.length > 0 || actividadesProximasAVencer.length > 0) && (
                      <div className="mb-4 grid gap-3 md:grid-cols-2">
                        {actividadesVencidas.length > 0 && (
                          <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 p-4">
                            <div className="mb-1 flex items-center gap-2 text-[#C8102E]">
                              <AlertTriangle className="h-4 w-4" />
                              <p className="text-sm font-bold">
                                {actividadesVencidas.length} actividad{actividadesVencidas.length === 1 ? "" : "es"} vencida{actividadesVencidas.length === 1 ? "" : "s"}
                              </p>
                            </div>
                            <p className="text-xs text-[#C8102E]">
                              Requiere seguimiento para regularizar el avance o actualizar la fecha de cierre.
                            </p>
                          </div>
                        )}
                        {actividadesProximasAVencer.length > 0 && (
                          <div className="rounded-lg border border-[#F57C00]/20 bg-[#F57C00]/5 p-4">
                            <div className="mb-1 flex items-center gap-2 text-[#F57C00]">
                              <Clock className="h-4 w-4" />
                              <p className="text-sm font-bold">
                                {actividadesProximasAVencer.length} actividad{actividadesProximasAVencer.length === 1 ? "" : "es"} próxima{actividadesProximasAVencer.length === 1 ? "" : "s"} a vencer
                              </p>
                            </div>
                            <p className="text-xs text-[#F57C00]">
                              Vencen dentro de los próximos {DIAS_ALERTA_ACTIVIDAD} días o durante el día actual.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[#E0E0E0] bg-[#FAFAFA] p-3 md:flex-row md:items-end md:justify-between">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                        <div className="grid gap-1.5">
                          <Label className="text-xs font-semibold uppercase text-[#5C5C5C]">Hito</Label>
                          <Select value={actividadHitoFilter} onValueChange={(value) => { setActividadHitoFilter(value); setActividadPage(1) }}>
                            <SelectTrigger className="h-9 min-w-56 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos los hitos</SelectItem>
                              <SelectItem value="sin-hito">Sin hito</SelectItem>
                              {hitosState.map(hito => (
                                <SelectItem key={hito.id} value={hito.id}>{hito.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs font-semibold uppercase text-[#5C5C5C]">Estado</Label>
                          <Select value={actividadEstadoFilter} onValueChange={(value) => { setActividadEstadoFilter(value); setActividadPage(1) }}>
                            <SelectTrigger className="h-9 min-w-48 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todos los estados</SelectItem>
                              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                              <SelectItem value="EN_CURSO">En curso</SelectItem>
                              <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={actividadHitoFilter === "todos" && actividadEstadoFilter === "todos"}
                          onClick={() => {
                            setActividadHitoFilter("todos")
                            setActividadEstadoFilter("todos")
                            setActividadPage(1)
                          }}
                          className="h-9"
                        >
                          Limpiar filtros
                        </Button>
                      </div>
                      <p className="text-xs text-[#5C5C5C]">
                        Mostrando {actividadRangeStart}-{actividadRangeEnd} de {actividadesFiltradas.length} actividades
                      </p>
                    </div>
                    <div className="max-h-[62vh] overflow-auto rounded-lg border border-[#E0E0E0]">
                      <table className="w-full min-w-[1120px]">
                        <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#E0E0E0]">
                          <tr>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Actividad</th>
                            <th className="w-44 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Hito</th>
                            <th className="w-48 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Responsable</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Inicio</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Fin</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Avance</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Estado</th>
                            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0E0E0]">
                          {actividadesPaginadas.map(act => (
                            <React.Fragment key={act.id}>
                              <tr className={
                                (act.alertaVencimiento?.tipo === "vencida"
                                  ? "bg-[#C8102E]/5 hover:bg-[#C8102E]/10"
                                  : act.alertaVencimiento
                                    ? "bg-[#F57C00]/5 hover:bg-[#F57C00]/10"
                                    : "hover:bg-[#FFFDE7]") + " group"
                              }>
                                <td className="px-3 py-3 text-sm font-medium text-[#1A1A1A]">
                                  <div className="flex flex-col gap-1">
                                    <span>{act.nombre}</span>
                                    {act.alertaVencimiento && (
                                      <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${act.alertaVencimiento.tipo === "vencida"
                                          ? "border-[#C8102E]/20 bg-[#C8102E]/10 text-[#C8102E]"
                                          : "border-[#F57C00]/20 bg-[#F57C00]/10 text-[#F57C00]"
                                        }`}>
                                        {act.alertaVencimiento.tipo === "vencida" ? (
                                          <AlertTriangle className="h-3 w-3" />
                                        ) : (
                                          <Clock className="h-3 w-3" />
                                        )}
                                        {act.alertaVencimiento.label}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-xs text-[#5C5C5C]">
                                  <span className="inline-flex rounded-full bg-[#FFF8CC] px-2.5 py-1 font-medium text-[#765D00]">{act.nombreHito ?? "Sin hito"}</span>
                                </td>
                                <td className="max-w-48 px-3 py-3 text-sm text-[#5C5C5C]">
                                  {(() => {
                                    const nombres = act.responsableDisplay.split(", ")
                                    const expanded = expandedRespAct.has(act.id)
                                    const visible = nombres.slice(0, 2)
                                    const rest = nombres.slice(2)
                                    return (
                                      <div>
                                        <div className="flex flex-wrap items-center gap-x-1">
                                          <span title={act.responsableDisplay}>{visible.join(", ")}</span>
                                          {rest.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => setExpandedRespAct(prev => { const n = new Set(prev); n.has(act.id) ? n.delete(act.id) : n.add(act.id); return n })}
                                              className="inline-flex items-center gap-0.5 rounded-full bg-[#F7F7F7] px-2 py-0.5 text-[11px] font-medium text-[#5C5C5C] hover:bg-[#E0E0E0] transition-colors shrink-0"
                                            >
                                              +{rest.length}
                                              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                                            </button>
                                          )}
                                        </div>
                                        {expanded && rest.length > 0 && (
                                          <div className="mt-1.5 space-y-0.5 border-t border-[#E0E0E0] pt-1.5">
                                            {rest.map((nombre, i) => (
                                              <div key={i} className="text-xs text-[#5C5C5C]">{nombre}</div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </td>
                                <td className="px-3 py-3 text-xs text-[#5C5C5C]">
                                  {act.fechaInicio ? act.fechaInicio.split('-').reverse().join('/') : "—"}
                                </td>
                                <td className="px-3 py-3 text-xs text-[#5C5C5C]">
                                  {act.fechaFin ? act.fechaFin.split('-').reverse().join('/') : "—"}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="w-28">
                                    <div className="mb-1 text-xs font-semibold text-[#1A1A1A]">{formatPercent(getActividadAvance(act))}</div>
                                    <ProgressBar value={getActividadAvance(act)} size="sm" />
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <StatusBadge estado={act.estado} />
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-1">
                                    {(act.subactividades?.length ?? 0) > 0 && (
                                      <button
                                        className="flex h-7 w-7 items-center justify-center rounded-full text-[#5C5C5C] hover:bg-[#F7F7F7]"
                                        title={expandedSubacts.has(act.id) ? "Ocultar subactividades" : "Ver subactividades"}
                                        onClick={() => setExpandedSubacts(prev => { const next = new Set(prev); next.has(act.id) ? next.delete(act.id) : next.add(act.id); return next })}
                                      >
                                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSubacts.has(act.id) ? "rotate-180" : ""}`} />
                                      </button>
                                    )}
                                    <button
                                      className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-full text-[#765D00] hover:bg-[#FFFDE7]"
                                      title="Agregar subactividad"
                                      onClick={() => {
                                        setTargetActividadId(act.id)
                                        setSubactForm({ nombre: "", idResponsable: "", presupuesto: "", hombresInvolucrados: "", mujeresInvolucradas: "", fechaInicio: "", fechaFin: "", estado: "PENDIENTE", descripcion: "" })
                                        setSubactFieldErrors({})
                                        setSubactResponsableSearch("")
                                        setCreateSubactOpen(true)
                                      }}
                                    >
                                      <UserPlus className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-full text-[#5C5C5C] hover:bg-[#F7F7F7]"
                                      title="Editar actividad"
                                      onClick={() => {
                                        setEditingActividad(act)
                                        setEditForm({
                                          nombre: act.nombre,
                                          descripcion: act.descripcion ?? "",
                                          fechaInicio: act.fechaInicio ?? "",
                                          fechaFin: act.fechaFin ?? "",
                                          estado: act.estado,
                                          idResponsables: [...act.idResponsables],
                                          idHito: act.idHito ? String(act.idHito) : "",
                                        })
                                        setEditActividadOpen(true)
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-full text-[#C8102E] hover:bg-[#C8102E]/10"
                                      title="Eliminar actividad"
                                      onClick={() => { setConfirmDeleteTarget("actividad"); setConfirmDeleteId(String(act.id)); setConfirmDeleteNombre(act.nombre); setConfirmDeleteInput(""); setConfirmDeleteOpen(true) }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {/* Render Subactividades */}
                              {expandedSubacts.has(act.id) && act.subactividades?.map((sub) => (
                                <tr key={`sub-${sub.id}`} className="bg-[#FAFAFA] border-none group">
                                <td className="relative py-2 pl-8 pr-3 text-xs font-medium text-[#5C5C5C]">
                                    <div className="absolute left-4 top-0 bottom-0 w-px bg-[#E0E0E0]" />
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[#1A1A1A] before:content-[''] before:absolute before:left-4 before:top-4 before:w-3 before:h-px before:bg-[#E0E0E0]">
                                        {sub.nombre}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-[#9CA3AF]">—</td>
                                  <td className="px-3 py-2 text-xs text-[#5C5C5C]">{sub.responsable || "—"}</td>
                                  <td className="px-3 py-2 text-xs text-[#5C5C5C]">
                                    {sub.fechaInicio ? sub.fechaInicio.split('-').reverse().join('/') : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-[#5C5C5C]">
                                    {sub.fechaFin ? sub.fechaFin.split('-').reverse().join('/') : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-xs font-semibold text-[#1A1A1A]">{formatPercent(getActividadAvance({ estado: sub.estado ?? "PENDIENTE" }))}</td>
                                  <td className="px-3 py-2">
                                    <StatusBadge estado={sub.estado ?? "PENDIENTE"} />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      <button
                                        className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-full text-[#5C5C5C] hover:bg-[#F7F7F7]"
                                        title="Editar subactividad"
                                        onClick={() => {
                                          let responsableId = ""
                                          if (sub.responsable) {
                                            for (const [id, nombre] of usuariosMap.entries()) {
                                              if (nombre === sub.responsable) { responsableId = String(id); break }
                                            }
                                          }
                                          setEditingSubact({ sub, actId: act.id })
                                          setEditSubactForm({
                                            nombre: sub.nombre,
                                            idResponsable: responsableId,
                                            presupuesto: sub.presupuesto ? String(sub.presupuesto) : "",
                                            hombresInvolucrados: sub.hombresInvolucrados ? String(sub.hombresInvolucrados) : "",
                                            mujeresInvolucradas: sub.mujeresInvolucradas ? String(sub.mujeresInvolucradas) : "",
                                            fechaInicio: sub.fechaInicio ?? "",
                                            fechaFin: sub.fechaFin ?? "",
                                            estado: sub.estado ?? "PENDIENTE",
                                            descripcion: sub.descripcion ?? "",
                                          })
                                          setEditSubactResponsableSearch("")
                                          setEditSubactFieldErrors({})
                                          setEditSubactOpen(true)
                                        }}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-full text-[#C8102E] hover:bg-[#C8102E]/10"
                                        title="Eliminar subactividad"
                                        onClick={() => { setConfirmDeleteTarget("subactividad"); setConfirmDeleteId(String(sub.id)); setConfirmDeleteNombre(sub.nombre); setConfirmDeleteInput(""); setConfirmDeleteParentId(act.id); setConfirmDeleteOpen(true) }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {/* Agregar subactividad */}
                              {expandedSubacts.has(act.id) && (
                              <tr className="bg-[#FAFAFA] border-none">
                                <td colSpan={8} className="relative py-2 pl-8 pr-3">
                                  <div className="absolute left-4 top-0 bottom-1/2 w-px bg-[#E0E0E0]" />
                                  <div className="flex items-center gap-2 relative before:content-[''] before:absolute before:-left-4 before:top-3 before:w-3 before:h-px before:bg-[#E0E0E0]">
                                    <button
                                      className="flex items-center gap-1 text-xs font-medium text-[#C9A42B] hover:text-[#1A1A1A] transition-colors"
                                      onClick={() => {
                                        setTargetActividadId(act.id)
                                        setSubactForm({ nombre: "", idResponsable: "", presupuesto: "", hombresInvolucrados: "", mujeresInvolucradas: "", fechaInicio: "", fechaFin: "", estado: "PENDIENTE", descripcion: "" })
                                        setSubactFieldErrors({})
                                        setSubactResponsableSearch("")
                                        setCreateSubactOpen(true)
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                      Agregar subactividad
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {actividadesFiltradas.length === 0 ? (
                      <div className="mt-4 rounded-lg border border-dashed border-[#D8D8D8] p-6 text-center text-sm text-[#5C5C5C]">
                        No hay actividades que coincidan con los filtros seleccionados.
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col gap-3 text-xs text-[#5C5C5C] md:flex-row md:items-center md:justify-between">
                        <span>Página {actividadPageSafe} de {totalActividadPages}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actividadPageSafe <= 1}
                            onClick={() => setActividadPage(page => Math.max(1, page - 1))}
                          >
                            Anterior
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actividadPageSafe >= totalActividadPages}
                            onClick={() => setActividadPage(page => Math.min(totalActividadPages, page + 1))}
                          >
                            Siguiente
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-sm text-[#5C5C5C]">
                    No hay actividades registradas para este proyecto.
                  </div>
                )
              ) : null}
            </div>
              )}

            <Dialog open={confirmDeleteOpen} onOpenChange={(open) => { setConfirmDeleteOpen(open); if (!open) setConfirmDeleteInput("") }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Eliminar {confirmDeleteTarget === "actividad" ? "actividad" : confirmDeleteTarget === "hito" ? "hito" : "subactividad"}</DialogTitle>
                  <DialogDescription>
                    Esta accion no se puede deshacer. Se eliminara permanentemente <strong>{confirmDeleteNombre}</strong> y todos sus datos asociados.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <p className="text-sm text-[#5C5C5C]">
                    Escribe <strong>ELIMINAR</strong> para confirmar:
                  </p>
                  <Input
                    value={confirmDeleteInput}
                    onChange={e => setConfirmDeleteInput(e.target.value)}
                    onPaste={e => e.preventDefault()}
                    placeholder="Escribe ELIMINAR"
                    className={confirmDeleteInput && confirmDeleteInput !== "ELIMINAR" ? "border-[#C8102E]" : ""}
                  />
                  {confirmDeleteInput && confirmDeleteInput !== "ELIMINAR" && (
                    <p className="text-xs text-[#C8102E]">Debes escribir exactamente "ELIMINAR" para confirmar</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setConfirmDeleteOpen(false); setConfirmDeleteInput("") }}>
                    Cancelar
                  </Button>
                  <Button
                    className="bg-[#C8102E] text-white hover:bg-[#A00D24]"
                    disabled={confirmDeleteInput !== "ELIMINAR"}
                    onClick={handleConfirmDelete}
                  >
                    Eliminar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Hitos Tab */}
            {activeTab === "hitos" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                      Cronograma e Hitos
                    </h3>
                    {hitosState.some(hito => hito.fuenteDatos !== "api") && <MockDataTag />}
                    {hitosLoading && (
                      <span className="text-xs text-[#5C5C5C]">Cargando hitos...</span>
                    )}
                  </div>
                  <button
                    onClick={abrirNuevoHito}
                    className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#C9A42B] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar hito
                  </button>
                </div>
                {hitosError && (
                  <div className="mb-4 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm text-[#C8102E]">
                    {hitosError}
                  </div>
                )}

                {/* Dialog agregar / editar hito */}
                <Dialog open={addHitoOpen} onOpenChange={(open) => { setAddHitoOpen(open); if (open) { setHitoFieldErrors({}); setHitosError(null) } }}>
                  <DialogContent className="overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editHito ? "Editar Hito" : "Nuevo Hito"}</DialogTitle>
                      <DialogDescription>
                        {editHito ? "Modifica los datos del hito seleccionado." : "Registra un nuevo hito para el cronograma."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div data-field="hito-nombre" className="grid gap-2">
                        <Label htmlFor="hito-nombre">Nombre del hito <span className="text-[#C8102E]">*</span></Label>
                        <div className="relative">
                          <Input
                            id="hito-nombre"
                            maxLength={50}
                            placeholder="Ej. Entrega de informe final"
                            value={hitoForm.nombre}
                            onChange={e => {
                              setHitoForm(f => ({ ...f, nombre: e.target.value }))
                              setHitoFieldErrors(p => { const { "hito-nombre": _, ...r } = p; return r })
                            }}
                            className={hitoFieldErrors["hito-nombre"] ? "border-[#C8102E] pr-16" : "pr-16"}
                          />
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${hitoForm.nombre.length >= 50 ? "text-[#C8102E]" : hitoForm.nombre.length >= 40 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>
                            {hitoForm.nombre.length}/50
                          </span>
                        </div>
                        {hitoFieldErrors["hito-nombre"] && <p className="text-xs text-[#C8102E]">{hitoFieldErrors["hito-nombre"]}</p>}
                      </div>
                      <div data-field="hito-descripcion" className="grid gap-2">
                        <Label htmlFor="hito-descripcion">Descripcion</Label>
                        <div className="relative">
                          <Textarea
                            id="hito-descripcion"
                            maxLength={200}
                            placeholder="Objetivo o alcance del hito"
                            value={hitoForm.descripcion}
                            onChange={e => {
                              setHitoForm(f => ({ ...f, descripcion: e.target.value }))
                              setHitoFieldErrors(p => { const { "hito-descripcion": _, ...r } = p; return r })
                            }}
                            rows={3}
                            className={`resize-none ${hitoFieldErrors["hito-descripcion"] ? "border-[#C8102E]" : ""}`}
                          />
                          <span className={`absolute right-3 bottom-3 text-xs ${hitoForm.descripcion.length >= 200 ? "text-[#C8102E]" : hitoForm.descripcion.length >= 180 ? "text-[#C9A42B]" : "text-[#9CA3AF]"}`}>
                            {hitoForm.descripcion.length}/200
                          </span>
                        </div>
                        {hitoFieldErrors["hito-descripcion"] && <p className="text-xs text-[#C8102E]">{hitoFieldErrors["hito-descripcion"]}</p>}
                      </div>
                      <div data-field="hito-fecha" className="grid gap-2">
                        <Label htmlFor="hito-fecha">Fecha clave <span className="text-[#C8102E]">*</span></Label>
                        <Input
                          id="hito-fecha"
                          type="date"
                          value={hitoForm.fecha}
                          onChange={e => {
                            setHitoForm(f => ({ ...f, fecha: e.target.value }))
                            setHitoFieldErrors(p => { const { "hito-fecha": _, ...r } = p; return r })
                          }}
                          className={hitoFieldErrors["hito-fecha"] ? "border-[#C8102E]" : ""}
                        />
                        {hitoFieldErrors["hito-fecha"] && <p className="text-xs text-[#C8102E]">{hitoFieldErrors["hito-fecha"]}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hito-estado">Estado</Label>
                        <Select value={hitoForm.estado} disabled>
                          <SelectTrigger id="hito-estado"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                            <SelectItem value="En curso">En curso</SelectItem>
                            <SelectItem value="Finalizado">Finalizado</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-[#777]">El estado se actualiza automáticamente según las actividades relacionadas.</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddHitoOpen(false)} disabled={hitoSubmitting}>Cancelar</Button>
                      <Button
                        className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                        onClick={guardarHito}
                        disabled={hitoSubmitting}
                      >
                        {hitoSubmitting ? "Guardando..." : editHito ? "Guardar cambios" : "Crear hito"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={hitoSuccessModalOpen} onOpenChange={setHitoSuccessModalOpen}>
                  <DialogContent className="sm:max-w-md" showCloseButton={false}>
                    <DialogHeader>
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                      <DialogTitle className="text-center text-lg">
                        {hitoEsEdicion ? "Hito actualizado exitosamente" : "Hito creado exitosamente"}
                      </DialogTitle>
                      <DialogDescription className="text-center">
                        El hito se ha registrado correctamente en el cronograma.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                      <Button type="button" onClick={() => setHitoSuccessModalOpen(false)} className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">
                        Aceptar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {hitosConAlertas.length > 0 ? (
                  <>
                    <div className="mb-6 grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] p-4">
                        <p className="text-xs font-semibold uppercase text-[#5C5C5C]">Avance ponderado</p>
                        <p className="mt-2 text-3xl font-bold text-[#1A1A1A]">{formatPercent(proyecto.avance)}</p>
                        <ProgressBar value={proyecto.avance} size="sm" />
                      </div>
                      <div className="rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] p-4">
                        <p className="text-xs font-semibold uppercase text-[#5C5C5C]">Hitos finalizados</p>
                        <p className="mt-2 text-3xl font-bold text-[#1A1A1A]">{hitosConAlertas.filter(h => h.estado === "Finalizado").length}<span className="text-base font-normal text-[#777]"> / {hitosConAlertas.length}</span></p>
                      </div>
                      <div className="rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] p-4">
                        <p className="text-xs font-semibold uppercase text-[#5C5C5C]">Actividades finalizadas</p>
                        <p className="mt-2 text-3xl font-bold text-[#1A1A1A]">{actividades.filter(a => a.estado === "FINALIZADA").length}<span className="text-base font-normal text-[#777]"> / {actividades.length}</span></p>
                      </div>
                    </div>
                    <div className="mb-6"><ProjectGantt hitos={hitosState} actividades={actividadesApi} /></div>
                    {(hitosVencidos.length > 0 || hitosProximosAVencer.length > 0) && (
                      <div className="mb-6 grid gap-3 md:grid-cols-2">
                        {hitosVencidos.length > 0 && (
                          <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 p-4">
                            <div className="mb-1 flex items-center gap-2 text-[#C8102E]">
                              <AlertTriangle className="h-4 w-4" />
                              <p className="text-sm font-bold">
                                {hitosVencidos.length} hito{hitosVencidos.length === 1 ? "" : "s"} vencido{hitosVencidos.length === 1 ? "" : "s"}
                              </p>
                            </div>
                            <p className="text-xs text-[#C8102E]">
                              Requiere revisar el cronograma o registrar el cumplimiento del hito.
                            </p>
                          </div>
                        )}
                        {hitosProximosAVencer.length > 0 && (
                          <div className="rounded-lg border border-[#F57C00]/20 bg-[#F57C00]/5 p-4">
                            <div className="mb-1 flex items-center gap-2 text-[#F57C00]">
                              <Clock className="h-4 w-4" />
                              <p className="text-sm font-bold">
                                {hitosProximosAVencer.length} hito{hitosProximosAVencer.length === 1 ? "" : "s"} próximo{hitosProximosAVencer.length === 1 ? "" : "s"} a vencer
                              </p>
                            </div>
                            <p className="text-xs text-[#F57C00]">
                              Vencen dentro de los próximos {DIAS_ALERTA_ACTIVIDAD} días o durante el día actual.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="relative max-h-[52vh] overflow-y-auto rounded-xl border border-[#E0E0E0] bg-white p-4">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#E0E0E0]" />
                      <div className="space-y-3">
                        {hitosConAlertas.map((hito) => (
                          <div key={hito.id} className="relative flex gap-4 pl-10 group">
                            <div className={`absolute left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full ${hito.estado === "Finalizado" ? "bg-[#2E7D32]" :
                                hito.estado === "En curso" ? "bg-[#F57C00]" : "bg-[#E0E0E0]"
                              }`}>
                              {hito.estado === "Finalizado" ? (
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              ) : hito.estado === "En curso" ? (
                                <Clock className="h-3 w-3 text-white" />
                              ) : (
                                <Circle className="h-3 w-3 text-[#5C5C5C]" />
                              )}
                            </div>
                            <div className={`flex-1 rounded-lg border p-4 transition-colors ${hito.alertaVencimiento?.tipo === "vencido"
                                ? "border-[#C8102E]/20 bg-[#C8102E]/5 hover:border-[#C8102E]/40"
                                : hito.alertaVencimiento
                                  ? "border-[#F57C00]/20 bg-[#F57C00]/5 hover:border-[#F57C00]/40"
                                  : "border-[#E0E0E0] hover:border-[#FFD600]"
                              }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#1A1A1A]">{hito.nombre}</p>
                                  <p className="text-xs text-[#5C5C5C] mt-1">
                                    {new Date(hito.fecha).toLocaleDateString("es-PE", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric"
                                    })}
                                  </p>
                                  {hito.descripcion && (
                                    <p className="mt-3 text-sm leading-relaxed text-[#5C5C5C]">
                                      {hito.descripcion}
                                    </p>
                                  )}
                                  <div className="mt-4 rounded-lg bg-[#F7F7F7] p-3">
                                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                                      <span className="font-semibold text-[#1A1A1A]">{hito.actividadesFinalizadas} de {hito.totalActividades} actividades finalizadas</span>
                                      <span className="font-bold text-[#1A1A1A]">{formatPercent(hito.porcentajeAvance)}</span>
                                    </div>
                                    <ProgressBar value={hito.porcentajeAvance} size="sm" />
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#777]">
                                      <span>Periodo: {formatLocalDate(hito.fechaInicio)} – {formatLocalDate(hito.fechaFin)}</span>
                                      <span>Peso temporal: {hito.duracionDias} día{hito.duracionDias === 1 ? "" : "s"}</span>
                                    </div>
                                  </div>
                                  <div className="mt-3 space-y-1.5">
                                    {hito.totalActividades > 0 && (
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 rounded-md border border-[#E0E0E0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5C5C5C] hover:border-[#FFD600] hover:bg-[#FFFDE7]"
                                        onClick={() => setExpandedHitos(prev => { const next = new Set(prev); next.has(hito.id) ? next.delete(hito.id) : next.add(hito.id); return next })}
                                      >
                                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedHitos.has(hito.id) ? "rotate-180" : ""}`} />
                                        {expandedHitos.has(hito.id) ? "Ocultar actividades" : `Ver ${hito.totalActividades} actividades`}
                                      </button>
                                    )}
                                    {expandedHitos.has(hito.id) && actividades.filter(a => String(a.idHito) === hito.id).map(actividad => (
                                      <div key={actividad.id} className="flex items-center justify-between gap-3 rounded-md border border-[#E8E8E8] bg-white px-3 py-2 text-xs">
                                        <span className="truncate text-[#1A1A1A]">{actividad.nombre}</span>
                                        <div className="flex shrink-0 items-center gap-2">
                                          <StatusBadge estado={actividad.estado} />
                                          <button
                                            type="button"
                                            className="inline-flex items-center gap-1 rounded-md border border-[#E0E0E0] px-2 py-1 font-semibold text-[#5C5C5C] hover:border-[#FFD600] hover:bg-[#FFFDE7] hover:text-[#1A1A1A]"
                                            onClick={() => navegarADetalleActividad(actividad.id, hito.id)}
                                          >
                                            Ver detalle
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                    {hito.totalActividades === 0 && <p className="text-xs text-[#777]">Sin actividades relacionadas.</p>}
                                    {hito.fuenteDatos === "api" && puedeActualizarProyectos && (
                                      <button
                                        type="button"
                                        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#E0E0E0] bg-white px-2.5 py-1.5 font-semibold text-[#765D00] hover:border-[#FFD600] hover:bg-[#FFFDE7]"
                                        onClick={() => {
                                          setActForm({ nombre: "", descripcion: "", fechaInicio: "", fechaFin: "", idResponsables: [], idHito: hito.id, estado: "PENDIENTE" })
                                          setActiveTab("actividades")
                                          setCreateActividadOpen(true)
                                        }}
                                      >
                                        <Plus className="h-3.5 w-3.5" /> Agregar actividad a este hito
                                      </button>
                                    )}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5C5C5C]">
                                    {hito.fuenteDatos !== "api" && (
                                      <span className="inline-flex items-center rounded-full bg-[#F7F7F7] px-2.5 py-1">
                                        {hito.fuenteDatos === "local" ? "Sesion local" : "Mock referencial"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <StatusBadge estado={hito.estado} />
                                  <button
                                    onClick={() => abrirEditarHito(hito)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-full text-[#5C5C5C] hover:bg-[#F7F7F7]"
                                    title="Editar hito"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { setConfirmDeleteTarget("hito"); setConfirmDeleteId(hito.id); setConfirmDeleteNombre(hito.nombre); setConfirmDeleteInput(""); setConfirmDeleteOpen(true) }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-full text-[#C8102E] hover:bg-[#C8102E]/10"
                                    title="Eliminar hito"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-sm text-[#5C5C5C]">
                    No hay hitos registrados para este proyecto.
                  </div>
                )}
              </div>
            )}

            {/* Informes Tab */}
            {activeTab === "informes" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                      Informes y Productos
                    </h3>
                    <MockDataTag />
                  </div>
                  <Link
                    href="/informes/nuevo"
                    className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#C9A42B]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo documento
                  </Link>
                </div>
                {documentos.length > 0 ? (
                  <div className="space-y-3">
                    {documentos.map(doc => (
                      <div key={doc.id} className="flex items-center gap-4 rounded-lg border border-[#E0E0E0] p-4 hover:bg-[#FFFDE7]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFD600]/20">
                          <FileText className="h-5 w-5 text-[#C9A42B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">{doc.titulo}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <TypeBadge tipo={doc.tipo} />
                            <span className="text-xs text-[#5C5C5C]">
                              {new Date(doc.fechaElaboracion).toLocaleDateString("es-PE")}
                            </span>
                          </div>
                        </div>
                        <StatusBadge estado={doc.estado} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-[#5C5C5C]">
                    No hay documentos asociados a este proyecto.
                  </div>
                )}
              </div>
            )}

            {/* Equipo Tab */}
            {activeTab === "equipo" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                      Equipo del Proyecto
                    </h3>
                  </div>
                  <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                    <DialogTrigger asChild>
                      <button className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#C9A42B] transition-colors">
                        <UserPlus className="h-3.5 w-3.5" />
                        Agregar miembro
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Agregar Miembro</DialogTitle>
                        <DialogDescription>Añade un nuevo integrante al equipo del proyecto.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={async e => {
                        e.preventDefault()
                        if (!nuevoMiembroNombre || !nuevoMiembroRol) return

                        if (apiProyecto) {
                          try {
                            await api.post(`/proyectos/${id}/equipo`, { idUsuario: parseInt(nuevoMiembroNombre), rolEnProyecto: nuevoMiembroRol })
                            const team = await api.get<any[]>(`/proyectos/${id}/equipo`)
                            setApiEquipo(team)
                            setNuevoMiembroNombre("")
                            setNuevoMiembroRol("Equipo Técnico")
                            setAddMemberOpen(false)
                          } catch (err) {
                            console.error(err)
                          }
                        } else {
                          setEquipo(prev => [...prev, { nombre: nuevoMiembroNombre.trim(), rol: nuevoMiembroRol }])
                          setNuevoMiembroNombre("")
                          setNuevoMiembroRol("Equipo Técnico")
                          setAddMemberOpen(false)
                        }
                      }}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="miembro-nombre">Miembro <span className="text-red-500">*</span></Label>
                            {apiProyecto ? (
                              <Select value={nuevoMiembroNombre} onValueChange={setNuevoMiembroNombre} required>
                                <SelectTrigger id="miembro-nombre"><SelectValue placeholder="Seleccione un usuario" /></SelectTrigger>
                                <SelectContent>
                                  {usuariosSistema.map(u => (
                                    <SelectItem key={u.id} value={String(u.id)}>{u.nombres} {u.apellidos}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id="miembro-nombre"
                                placeholder="Ej. Juan Pérez"
                                value={nuevoMiembroNombre}
                                onChange={e => setNuevoMiembroNombre(e.target.value)}
                                required
                              />
                            )}
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="miembro-rol">Rol en el proyecto <span className="text-[#C8102E]">*</span></Label>
                            <Select value={nuevoMiembroRol} onValueChange={setNuevoMiembroRol}>
                              <SelectTrigger id="miembro-rol">
                                <SelectValue placeholder="Seleccione un rol" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES_PROYECTO.map(rol => (
                                  <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline" type="button">Cancelar</Button>
                          </DialogClose>
                          <Button type="submit" className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">
                            Agregar
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Responsable principal */}
                  <div className="rounded-lg border-2 border-[#FFD600] bg-[#FFFDE7] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD600]">
                        <User className="h-5 w-5 text-[#1A1A1A]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">{proyecto.responsable}</p>
                        <p className="text-xs text-[#C9A42B] font-medium">Responsable Principal</p>
                      </div>
                    </div>
                  </div>
                  {/* Equipo dinámico */}
                  {equipoVisual.map((miembro) => (
                    <div key={miembro.id} className="group relative rounded-lg border border-[#E0E0E0] p-4 hover:border-[#FFD600] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F7]">
                          <User className="h-5 w-5 text-[#5C5C5C]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">{miembro.nombre}</p>
                          <p className="text-xs text-[#5C5C5C]">{miembro.rol}</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (apiProyecto) {
                              try {
                                await api.delete(`/proyectos/${id}/equipo/${miembro.id}`)
                                setApiEquipo(prev => prev.filter(m => m.idUsuario !== miembro.id))
                              } catch (err) {
                                console.error(err)
                              }
                            } else {
                              setEquipo(prev => prev.filter((_, i) => i !== miembro.id))
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-full text-[#C8102E] hover:bg-[#C8102E]/10"
                          title="Eliminar miembro"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {equipo.length === 0 && (
                  <p className="mt-4 text-center text-sm text-[#5C5C5C]">No hay miembros en el equipo. Agrega uno.</p>
                )}
              </div>
            )}

            {/* Bitácora Tab */}
            {activeTab === "bitacora" && (
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                    Historial de Cambios
                  </h3>
                  <MockDataTag />
                </div>
                {bitacora.length > 0 ? (
                  <div className="space-y-4">
                    {bitacora.map(entry => (
                      <div key={entry.id} className="flex gap-4 rounded-lg border border-[#E0E0E0] p-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7]">
                          <Clock className="h-4 w-4 text-[#5C5C5C]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#1A1A1A]">{entry.usuario}</span>
                            <span className="text-xs text-[#5C5C5C]">•</span>
                            <span className="text-xs text-[#5C5C5C]">{entry.accion}</span>
                          </div>
                          <p className="text-sm text-[#5C5C5C] mt-1">{entry.descripcion}</p>
                          <p className="text-xs text-[#5C5C5C] mt-2">{entry.fecha}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-[#5C5C5C]">
                    No hay registros en la bitácora.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Info card */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-4">
              Información
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-[#5C5C5C] mt-0.5" />
                <div>
                  <p className="text-xs text-[#5C5C5C]">Responsable</p>
                  <p className="text-sm font-medium text-[#1A1A1A]">{proyecto.responsable}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-[#5C5C5C] mt-0.5" />
                <div>
                  <p className="text-xs text-[#5C5C5C]">Periodo</p>
                  <p className="text-sm text-[#1A1A1A]">
                    {formatLocalDate(proyecto.fechaInicio)} - {formatLocalDate(proyecto.fechaFin)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-[#5C5C5C] mt-0.5" />
                <div>
                  <p className="text-xs text-[#5C5C5C]">Días restantes</p>
                  <p className={`text-sm font-semibold ${diasRestantes < 30 ? "text-[#C8102E]" :
                      diasRestantes < 90 ? "text-[#F57C00]" : "text-[#2E7D32]"
                    }`}>
                    {diasRestantes > 0 ? `${diasRestantes} días` : "Vencido"}
                  </p>
                </div>
              </div>
              {proyecto.presupuesto && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-[#5C5C5C] mt-0.5" />
                  <div>
                    <p className="text-xs text-[#5C5C5C]">Presupuesto</p>
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      S/ {proyecto.presupuesto.toLocaleString("es-PE")}
                    </p>
                  </div>
                </div>
              )}
              {proyecto.fuentesDonantes && proyecto.fuentesDonantes.length > 0 && (
                <div className="flex items-start gap-3 border-t border-[#E0E0E0] pt-4 mt-4">
                  <Building2 className="h-4 w-4 text-[#5C5C5C] mt-0.5" />
                  <div className="w-full">
                    <p className="text-xs text-[#5C5C5C] mb-2">Fuentes Donantes</p>
                    <div className="space-y-2">
                      {proyecto.fuentesDonantes.map((fuente, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#F7F7F7] border border-[#E0E0E0] rounded-md px-3 py-2">
                          <span className="text-sm font-medium text-[#1A1A1A]">{fuente.nombre}</span>
                          <Link href={fuente.contratoUrl} className="text-[#C9A42B] hover:text-[#FFD600] flex items-center gap-1 text-xs font-medium bg-white px-2 py-1 rounded shadow-sm border border-[#E0E0E0]" title="Ver contrato">
                            <FileText className="h-3 w-3" /> Contrato
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress card */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
              Avance
            </h3>
            <div className="mb-4 text-center">
              <span className="text-4xl font-bold text-[#1A1A1A]">{formatPercent(proyecto.avance)}</span>
            </div>
            <ProgressBar value={proyecto.avance} showLabel={false} size="lg" />
            {apiProyecto && <p className="mt-3 text-xs leading-relaxed text-[#5C5C5C]">Calculado automáticamente ponderando la duración de las actividades dentro de cada hito y la duración de cada hito dentro del proyecto.</p>}
          </div>

          {/* Alerts card */}
          {proyecto.estado === "SUSPENDIDO" && (
            <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 p-5">
              <div className="flex items-center gap-2 text-[#C8102E] mb-2">
                <AlertTriangle className="h-4 w-4" />
                <h3 className="text-sm font-bold">Alertas Activas</h3>
              </div>
              <ul className="space-y-2 text-sm text-[#C8102E]">
                <li>• Actividades con retraso</li>
                <li>• Requiere atención inmediata</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
      </PermissionGuard>
    </AppLayout >
  )
}
