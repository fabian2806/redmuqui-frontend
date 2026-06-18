"use client"

import { SuccessDialog } from "@/components/ui/success-dialog"
import React, { useEffect, useMemo, useState, use } from "react"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { AppLayout } from "@/components/layout/app-layout"
import { StatusBadge, MacroregionBadge, TypeBadge } from "@/components/ui/status-badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import { ProjectGantt } from "@/components/projects/project-gantt"
import { ResumenIaCard } from "@/components/proyectos/resumen-ia-card"
import { ProjectResponsibilityTree } from "@/components/projects/project-responsibility-tree"
import {
  getProyectoById,
  getHitosByProyecto,
  hitos as allHitos
} from "@/lib/data"
import {
  consultarBitacoraPorEntidad,
  crearObservacion,
  listarObservacionesPorEntidad,
  resolverObservacion,
  type BitacoraConsultaDTO,
  type ObservacionResponseDTO,
} from "@/lib/trazabilidad"
import type { Hito as HitoMock, Proyecto as ProyectoMock } from "@/lib/data"
import { api, ApiError } from "@/lib/api"
import { formatDateOnly, parseDateOnly } from "@/lib/date-only"
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
  AsociarInstitucionesRequest,
  DocumentoResponse,
  OrganigramaProyecto,
  CronogramaReprogramacion,
  FaseCreate,
  FaseResponse,
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
  UserPlus,
  Search,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

type TabType = "resumen" | "actividades" | "hitos" | "informes" | "equipo" | "bitacora" | "observaciones"
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
  fechaCumplimientoReal: string | null
  idFase: number
  nombreFase: string
  idsActividades: number[]
  desfaseDias: number | null
  estadoCronograma: "PENDIENTE" | "EN_FECHA" | "ADELANTADO" | "ATRASADO"
  reprogramaciones: CronogramaReprogramacion[]
  fuenteDatos: "api" | "mock" | "local"
}
type HitoForm = Pick<HitoDetalle, "nombre" | "fecha" | "estado" | "descripcion"> & {
  idFase: string
  idsActividades: number[]
  motivoReprogramacion: string
}
type ProyectoDetalle = Omit<ProyectoMock, "macroregion" | "ejeTematico" | "estado"> & {
  macroregion: string
  macroregiones?: MacroregionRef[]
  ejeTematico: string
  estado: string
  fuenteDatos: "api" | "mixto" | "mock"
}

const DIAS_ALERTA_ACTIVIDAD = 15
const ACTIVIDADES_POR_PAGINA = 15
const ENTIDAD_REFERENCIADA_PROYECTO = "PROYECTO"
const TRAZABILIDAD_PAGE_SIZE = 10

function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function getDiasHastaFecha(date: string, today = startOfToday()): number {
  const fechaFin = parseDateOnly(date)
  return Math.ceil((fechaFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatLocalDate(date: string | null | undefined): string {
  return formatDateOnly(date)
}

function formatPercent(value: number | null | undefined, decimals = 1): string {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0
  return `${safeValue.toFixed(decimals)}%`
}

function getActividadAvance(actividad: {
  porcentajeAvance?: number | null
  estado: string
}): number {
  return actividad.porcentajeAvance
    ?? (actividad.estado === "FINALIZADA" ? 100 : 0)
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—"

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  return date.toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase()
}

function getAlertaVencimientoActividad(actividad: {
  fechaFinPlanificada: string | null
  estado: string
}) {
  if (actividad.estado === "FINALIZADA" || actividad.estado === "COMPLETADA") return null
  if (!actividad.fechaFinPlanificada) return null

  const diasRestantes = getDiasHastaFecha(actividad.fechaFinPlanificada)

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
  idFase: "",
  idsActividades: [],
  motivoReprogramacion: "",
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
    fechaInicio: hito.fechaInicioPlanificada,
    fechaFin: hito.fechaFinPlanificada,
    duracionDias: hito.duracionDias ?? 0,
    totalActividades: hito.totalActividades ?? 0,
    actividadesFinalizadas: hito.actividadesFinalizadas ?? 0,
    fechaCumplimientoReal: hito.fechaCumplimientoReal,
    idFase: hito.idFase,
    nombreFase: hito.nombreFase,
    idsActividades: hito.idsActividades ?? [],
    desfaseDias: hito.desfaseDias,
    estadoCronograma: hito.estadoCronograma,
    reprogramaciones: hito.reprogramaciones ?? [],
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
    fechaCumplimientoReal: null,
    idFase: 0,
    nombreFase: "Sin fase",
    idsActividades: [],
    desfaseDias: null,
    estadoCronograma: "PENDIENTE",
    reprogramaciones: [],
    fuenteDatos: "mock",
  }
}

function payloadHito(form: HitoForm): HitoCreate {
  return {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim() || null,
    idFase: Number(form.idFase),
    idsActividades: form.idsActividades,
    motivoReprogramacion: form.motivoReprogramacion.trim() || undefined,
  }
}

function formatProjectCurrency(value: number | null | undefined, currency = "PEN"): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)
}

function budgetAlertStyle(alert: ProyectoResponse["alertaPresupuesto"]) {
  if (alert === "EXCEDIDO") return "border-[#C8102E]/30 bg-[#C8102E]/5 text-[#C8102E]"
  if (alert === "CRITICO") return "border-[#F57C00]/30 bg-[#F57C00]/5 text-[#F57C00]"
  if (alert === "PREVENTIVO") return "border-[#FFD600]/50 bg-[#FFF8CC] text-[#8A6D00]"
  return "border-[#2E7D32]/30 bg-[#2E7D32]/5 text-[#2E7D32]"
}

function cronogramaLabel(estado?: string, dias?: number | null): string {
  if (estado === "ATRASADO") return `Retrasado ${Math.abs(dias ?? 0)} día(s)`
  if (estado === "ADELANTADO") return `Adelantado ${Math.abs(dias ?? 0)} día(s)`
  if (estado === "EN_FECHA") return "Completado en fecha"
  return "Pendiente de cierre"
}

function cronogramaTextClass(estado?: string): string {
  if (estado === "ATRASADO") return "text-[#C8102E]"
  if (estado === "ADELANTADO" || estado === "EN_FECHA") return "text-[#2E7D32]"
  return "text-[#777]"
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
  const { toast } = useToast()
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
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab")
    const tabsPermitidos: TabType[] = [
      "resumen",
      "actividades",
      "hitos",
      "informes",
      "equipo",
      "bitacora",
      "observaciones",
    ]
    if (tab && tabsPermitidos.includes(tab as TabType)) {
      setActiveTab(tab as TabType)
    }
  }, [])
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

const [bitacoraData, setBitacoraData] = useState<BitacoraConsultaDTO[]>([])
const [bitacoraPage, setBitacoraPage] = useState(0)
const [bitacoraTotalPages, setBitacoraTotalPages] = useState(0)
const [bitacoraFirst, setBitacoraFirst] = useState(true)
const [bitacoraLast, setBitacoraLast] = useState(true)
const [bitacoraLoading, setBitacoraLoading] = useState(false)
const [bitacoraSearch, setBitacoraSearch] = useState("")
const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({})

const [observacionesData, setObservacionesData] = useState<ObservacionResponseDTO[]>([])
const [observacionesPage, setObservacionesPage] = useState(0)
const [observacionesTotalPages, setObservacionesTotalPages] = useState(0)
const [observacionesFirst, setObservacionesFirst] = useState(true)
const [observacionesLast, setObservacionesLast] = useState(true)
const [observacionesLoading, setObservacionesLoading] = useState(false)
const [observacionesReloadKey, setObservacionesReloadKey] = useState(0)
const [observacionModalOpen, setObservacionModalOpen] = useState(false)
const [observacionDescripcion, setObservacionDescripcion] = useState("")
const [observacionCriticidad, setObservacionCriticidad] = useState<"BAJA" | "MEDIA" | "ALTA" | "CRITICA">("MEDIA")
const [observacionResponsable, setObservacionResponsable] = useState("")
const [observacionSubmitting, setObservacionSubmitting] = useState(false)
const [resolverIncidencia, setResolverIncidencia] = useState<ObservacionResponseDTO | null>(null)
const [comentarioResolucion, setComentarioResolucion] = useState("")
const [resolviendoIncidencia, setResolviendoIncidencia] = useState(false)
const [documentosProyecto, setDocumentosProyecto] = useState<DocumentoResponse[]>([])
const [organigrama, setOrganigrama] = useState<OrganigramaProyecto | null>(null)

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
    moneda: "PEN",
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

  // Fases del cronograma
  const [fases, setFases] = useState<FaseResponse[]>([])
  const [fasesLoading, setFasesLoading] = useState(true)
  const [faseOpen, setFaseOpen] = useState(false)
  const [faseEditando, setFaseEditando] = useState<FaseResponse | null>(null)
  const [faseSubmitting, setFaseSubmitting] = useState(false)
  const [faseError, setFaseError] = useState<string | null>(null)
  const [faseForm, setFaseForm] = useState({
    nombre: "",
    descripcion: "",
    fechaInicioPlanificada: "",
    fechaFinPlanificada: "",
    motivoReprogramacion: "",
  })

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
    idFase: "",
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
    fechaFinReal: "",
    motivoReprogramacion: "",
    estado: "PENDIENTE" as EstadoActividad,
    idResponsables: [] as number[],
    idFase: "",
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
    costoReal: "",
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
  const [editSubactSubmitError, setEditSubactSubmitError] = useState<string | null>(null)
  const [editSubactForm, setEditSubactForm] = useState({
    nombre: "",
    idResponsable: "",
    presupuesto: "",
    costoReal: "",
    hombresInvolucrados: "",
    mujeresInvolucradas: "",
    fechaInicio: "",
    fechaFin: "",
    fechaInicioReal: "",
    fechaFinReal: "",
    motivoReprogramacion: "",
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
  const [actividadFaseFilter, setActividadFaseFilter] = useState("todos")
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
      moneda: proyectoApi.moneda || "PEN",
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
    if (!editFormProyecto.fechaFinEstimada) {
      errors["edit-fechaFinEstimada"] = "La fecha de fin estimada es obligatoria"
    }
    if (!editFormProyecto.presupuesto) {
      errors["edit-presupuesto"] = "El presupuesto es obligatorio"
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
    if (!actForm.idFase) {
      errors["act-idFase"] = "Selecciona la fase a la que pertenece la actividad"
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
    const fase = fases.find(item => String(item.id) === actForm.idFase)
    if (fase && actForm.fechaInicio && actForm.fechaInicio < fase.fechaInicioPlanificada) {
      errors["act-fechaInicio"] = "La actividad no puede iniciar antes que su fase"
    }
    if (fase && actForm.fechaFin && actForm.fechaFin > fase.fechaFinPlanificada) {
      errors["act-fechaFin"] = "La actividad no puede terminar después que su fase"
    }
    return errors
  }

  const validarHitoForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!hitoForm.nombre.trim()) {
      errors["hito-nombre"] = "El nombre del hito es obligatorio"
    }
    if (!hitoForm.idFase) {
      errors["hito-fase"] = "Selecciona la fase del hito"
    }
    if (hitoForm.idsActividades.length === 0) {
      errors["hito-actividades"] = "Selecciona al menos una actividad"
    }
    const fechaCalculada = actividadesApi
      .filter(a => hitoForm.idsActividades.includes(a.id))
      .map(a => a.fechaFinPlanificada)
      .filter((fecha): fecha is string => Boolean(fecha))
      .sort()
      .at(-1) ?? ""
    if (editHito && fechaCalculada !== editHito.fecha && !hitoForm.motivoReprogramacion.trim()) {
      errors["hito-motivo"] = "Indica el motivo de la reprogramación"
    }
    return errors
  }

  const validarEditActForm = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!editForm.nombre.trim()) {
      errors["edit-nombre"] = "El nombre de la actividad es obligatorio"
    }
    if (!editForm.idFase) {
      errors["edit-idFase"] = "Selecciona la fase a la que pertenece la actividad"
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
    const fase = fases.find(item => String(item.id) === editForm.idFase)
    if (fase && editForm.fechaInicio && editForm.fechaInicio < fase.fechaInicioPlanificada) {
      errors["edit-inicio"] = "La actividad no puede iniciar antes que su fase"
    }
    if (fase && editForm.fechaFin && editForm.fechaFin > fase.fechaFinPlanificada) {
      errors["edit-fin"] = "La actividad no puede terminar después que su fase"
    }
    if (
      editingActividad
      && (editForm.fechaInicio !== (editingActividad.fechaInicioPlanificada ?? "")
        || editForm.fechaFin !== (editingActividad.fechaFinPlanificada ?? ""))
      && !editForm.motivoReprogramacion.trim()
    ) {
      errors["edit-motivo"] = "Indica el motivo de la reprogramación"
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
    const actividad = actividadesApi.find(item => item.id === targetActividadId)
    if (actividad?.fechaInicioPlanificada && subactForm.fechaInicio && subactForm.fechaInicio < actividad.fechaInicioPlanificada) {
      errors["sub-inicio"] = "La subactividad no puede iniciar antes que su actividad"
    }
    if (actividad?.fechaFinPlanificada && subactForm.fechaFin && subactForm.fechaFin > actividad.fechaFinPlanificada) {
      errors["sub-fin"] = "La subactividad no puede terminar después que su actividad"
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
    const tieneEntregablePublicado = (editingSubact?.sub.documentosEntregables ?? [])
      .some(documento => documento.estado === "PUBLICADO")
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
    const actividad = actividadesApi.find(item => item.id === editingSubact?.actId)
    if (actividad?.fechaInicioPlanificada && editSubactForm.fechaInicio && editSubactForm.fechaInicio < actividad.fechaInicioPlanificada) {
      errors["edit-sub-inicio"] = "La subactividad no puede iniciar antes que su actividad"
    }
    if (actividad?.fechaFinPlanificada && editSubactForm.fechaFin && editSubactForm.fechaFin > actividad.fechaFinPlanificada) {
      errors["edit-sub-fin"] = "La subactividad no puede terminar después que su actividad"
    }
    if (editSubactForm.presupuesto && Number(editSubactForm.presupuesto) < 0) {
      errors["edit-sub-presu"] = "El presupuesto no puede ser negativo"
    }
    if (editSubactForm.estado === "FINALIZADA" && !editSubactForm.costoReal) {
      errors["edit-sub-costo-real"] = "Registra el costo real para finalizar"
    }
    if (
      editSubactForm.estado === "FINALIZADA"
      && editingSubact?.sub.estado !== "FINALIZADA"
      && !tieneEntregablePublicado
    ) {
      errors["edit-sub-entregable"] = "Publica el entregable de la subactividad antes de finalizarla"
    }
    if (editSubactForm.estado !== "PENDIENTE" && !editSubactForm.fechaInicioReal) {
      errors["edit-sub-inicio-real"] = "Registra la fecha real de inicio"
    }
    if (editSubactForm.estado === "FINALIZADA" && !editSubactForm.fechaFinReal) {
      errors["edit-sub-fin-real"] = "Registra la fecha real de finalización"
    }
    if (
      editSubactForm.fechaInicioReal
      && editSubactForm.fechaInicio
      && editSubactForm.fechaInicioReal < editSubactForm.fechaInicio
    ) {
      errors["edit-sub-inicio-real"] = "La fecha real de inicio no puede ser anterior a la planificada"
    }
    if (
      editSubactForm.fechaInicioReal
      && editSubactForm.fechaFinReal
      && editSubactForm.fechaFinReal < editSubactForm.fechaInicioReal
    ) {
      errors["edit-sub-fin-real"] = "La fecha real de fin no puede ser anterior al inicio real"
    }
    if (
      editingSubact
      && (editSubactForm.fechaInicio !== (editingSubact.sub.fechaInicioPlanificada ?? "")
        || editSubactForm.fechaFin !== (editingSubact.sub.fechaFinPlanificada ?? ""))
      && !editSubactForm.motivoReprogramacion.trim()
    ) {
      errors["edit-sub-motivo"] = "Indica el motivo de la reprogramación"
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
      fechaFinEstimada: editFormProyecto.fechaFinEstimada,
      estado: editFormProyecto.estado,
      nivelPrioridad: optionalNumber(editFormProyecto.nivelPrioridad),
      porcentajeAvance,
      presupuesto: Number(editFormProyecto.presupuesto),
      moneda: editFormProyecto.moneda,
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

    async function cargarFases() {
      setFasesLoading(true)
      try {
        const data = await api.get<FaseResponse[]>(`/proyectos/${id}/fases`)
        if (!cancelled) setFases(data)
      } catch (error) {
        if (!cancelled) setFaseError(getApiErrorMessage(error))
      } finally {
        if (!cancelled) setFasesLoading(false)
      }
    }

    cargarActividades()
    if (puedeVerUsuarios) cargarUsuarios()
    cargarFases()
    cargarHitos()

    return () => { cancelled = true }
  }, [id, authLoading, puedeVerProyectos, puedeVerUsuarios])

const sincronizarAvancePlan = async () => {
  try {
    const [
      proyectoActualizado,
      hitosActualizados,
      actividadesActualizadas,
      fasesActualizadas,
    ] = await Promise.all([
      api.get<ProyectoResponse>(`/proyectos/${id}`),
      api.get<HitoResponse[] | { content: HitoResponse[] }>(
        `/proyectos/${id}/hitos`,
      ),
      api.get<PageResponse<ActividadResponse>>(
        `/actividades?proyectoId=${id}&size=100`,
      ),
      api.get<FaseResponse[]>(`/proyectos/${id}/fases`),
    ])

    setApiProyecto(proyectoActualizado)

    const listaHitos = Array.isArray(hitosActualizados)
      ? hitosActualizados
      : hitosActualizados.content

    setHitosState(listaHitos.map(hitoDesdeApi))
    setActividadesApi(actividadesActualizadas.content)
    setFases(fasesActualizadas)
  } catch (error) {
    setHitosError(
      `La operación se guardó, pero no se pudo actualizar el resumen: ${getApiErrorMessage(error)}`,
    )
  }
}
  useEffect(() => {
    setBitacoraPage(0)
    setObservacionesPage(0)
  }, [id])

  useEffect(() => {
    const proyectoId = Number(id)
    if (Number.isNaN(proyectoId) || authLoading || !puedeVerProyectos) return
    let cancelled = false
    Promise.all([
      api.get<PageResponse<DocumentoResponse>>(
        `/documentos?idProyecto=${proyectoId}&page=0&size=100&sort=fechaCarga,desc`,
      ),
      api.get<OrganigramaProyecto>(`/proyectos/${proyectoId}/organigrama`),
    ]).then(([documentosPage, organigramaData]) => {
      if (!cancelled) {
        setDocumentosProyecto(documentosPage.content)
        setOrganigrama(organigramaData)
      }
    }).catch(() => {
      if (!cancelled) {
        setDocumentosProyecto([])
        setOrganigrama(null)
      }
    })
    return () => { cancelled = true }
  }, [id, authLoading, puedeVerProyectos, actividadesApi])

  useEffect(() => {
    if (authLoading || !puedeVerBitacora || activeTab !== "bitacora") return

    const proyectoId = Number(id)
    if (Number.isNaN(proyectoId)) return

    let cancelled = false

    async function cargarBitacora() {
      setBitacoraLoading(true)
      try {
        const page = await consultarBitacoraPorEntidad(
          ENTIDAD_REFERENCIADA_PROYECTO,
          proyectoId,
          { page: bitacoraPage, size: TRAZABILIDAD_PAGE_SIZE },
          bitacoraSearch,
        )
        if (!cancelled) {
          setBitacoraData(page.content)
          setBitacoraTotalPages(page.totalPages)
          setBitacoraFirst(page.first)
          setBitacoraLast(page.last)
        }
      } catch (error) {
        if (!cancelled) {
          setBitacoraData([])
          toast({
            variant: "destructive",
            title: "Error al cargar la bitácora",
            description: getApiErrorMessage(error),
          })
        }
      } finally {
        if (!cancelled) {
          setBitacoraLoading(false)
        }
      }
    }

    cargarBitacora()

    return () => {
      cancelled = true
    }
  }, [id, authLoading, puedeVerBitacora, activeTab, bitacoraPage, bitacoraSearch, toast])

  useEffect(() => {
    if (authLoading || !puedeVerProyectos || activeTab !== "observaciones") return

    const proyectoId = Number(id)
    if (Number.isNaN(proyectoId)) return

    let cancelled = false

    async function cargarObservaciones() {
      setObservacionesLoading(true)
      try {
        const page = await listarObservacionesPorEntidad(
          ENTIDAD_REFERENCIADA_PROYECTO,
          proyectoId,
          { page: observacionesPage, size: TRAZABILIDAD_PAGE_SIZE },
        )
        if (!cancelled) {
          setObservacionesData(page.content)
          setObservacionesTotalPages(page.totalPages)
          setObservacionesFirst(page.first)
          setObservacionesLast(page.last)
        }
      } catch (error) {
        if (!cancelled) {
          setObservacionesData([])
          toast({
            variant: "destructive",
            title: "Error al cargar observaciones",
            description: getApiErrorMessage(error),
          })
        }
      } finally {
        if (!cancelled) {
          setObservacionesLoading(false)
        }
      }
    }

    cargarObservaciones()

    return () => {
      cancelled = true
    }
  }, [id, authLoading, puedeVerProyectos, activeTab, observacionesPage, observacionesReloadKey, toast])

  const toggleBitacoraEntry = (key: string) =>
    setExpandedEntries((prev) => ({ ...prev, [key]: !prev[key] }))

  const registrarObservacion = async () => {
    const descripcion = observacionDescripcion.trim()
    if (!descripcion) {
      toast({
        variant: "destructive",
        title: "Descripción requerida",
        description: "Ingresa el detalle de la incidencia antes de enviar.",
      })
      return
    }

    const proyectoId = Number(id)
    if (Number.isNaN(proyectoId)) {
      toast({
        variant: "destructive",
        title: "Proyecto inválido",
        description: "No se pudo identificar el proyecto para registrar la observación.",
      })
      return
    }

    setObservacionSubmitting(true)
    try {
      await crearObservacion({
        descripcion,
        entidadReferenciada: ENTIDAD_REFERENCIADA_PROYECTO,
        idEntidadReferenciada: proyectoId,
        criticidad: observacionCriticidad,
        idResponsable: observacionResponsable ? Number(observacionResponsable) : undefined,
      })
      setObservacionModalOpen(false)
      setObservacionDescripcion("")
      setObservacionCriticidad("MEDIA")
      setObservacionResponsable("")
      setObservacionesPage(0)
      setObservacionesReloadKey((current) => current + 1)
      toast({
        title: "Incidencia registrada",
        description: "La observación se guardó correctamente.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo registrar la incidencia",
        description: getApiErrorMessage(error),
      })
    } finally {
      setObservacionSubmitting(false)
    }
  }

  const abrirNuevoHito = () => {
    setHitoForm({ ...hitoFormInicial, idFase: fases.length === 1 ? String(fases[0].id) : "" })
    setEditHito(null)
    setHitosError(null)
    setHitoFieldErrors({})
    setHitoEsEdicion(false)
    setAddHitoOpen(true)
  }

  const abrirNuevaFase = () => {
    setFaseEditando(null)
    setFaseError(null)
    setFaseForm({
      nombre: "",
      descripcion: "",
      fechaInicioPlanificada: apiProyecto?.fechaInicio ?? "",
      fechaFinPlanificada: apiProyecto?.fechaFinEstimada ?? "",
      motivoReprogramacion: "",
    })
    setFaseOpen(true)
  }

  const abrirEditarFase = (fase: FaseResponse) => {
    setFaseEditando(fase)
    setFaseError(null)
    setFaseForm({
      nombre: fase.nombre,
      descripcion: fase.descripcion ?? "",
      fechaInicioPlanificada: fase.fechaInicioPlanificada,
      fechaFinPlanificada: fase.fechaFinPlanificada,
      motivoReprogramacion: "",
    })
    setFaseOpen(true)
  }

  const guardarFase = async () => {
    if (!faseForm.nombre.trim()
      || !faseForm.fechaInicioPlanificada
      || !faseForm.fechaFinPlanificada) {
      setFaseError("Nombre, fecha inicio planificada y fecha fin planificada son obligatorios")
      return
    }
    if (faseForm.fechaFinPlanificada < faseForm.fechaInicioPlanificada) {
      setFaseError("La fecha fin planificada no puede ser anterior a la fecha inicio planificada")
      return
    }
    if (faseEditando
      && (faseEditando.fechaInicioPlanificada !== faseForm.fechaInicioPlanificada
        || faseEditando.fechaFinPlanificada !== faseForm.fechaFinPlanificada)
      && !faseForm.motivoReprogramacion.trim()) {
      setFaseError("Indica el motivo de la reprogramación")
      return
    }
    const payload: FaseCreate = {
      nombre: faseForm.nombre.trim(),
      descripcion: faseForm.descripcion.trim() || null,
      fechaInicioPlanificada: faseForm.fechaInicioPlanificada,
      fechaFinPlanificada: faseForm.fechaFinPlanificada,
      motivoReprogramacion: faseForm.motivoReprogramacion.trim() || undefined,
    }
    setFaseSubmitting(true)
    setFaseError(null)
    try {
      if (faseEditando) {
        await api.put<FaseResponse>(`/proyectos/${id}/fases/${faseEditando.id}`, payload)
      } else {
        await api.post<FaseResponse>(`/proyectos/${id}/fases`, payload)
      }
      await sincronizarAvancePlan()
      setFaseOpen(false)
    } catch (error) {
      setFaseError(getApiErrorMessage(error))
    } finally {
      setFaseSubmitting(false)
    }
  }

  const eliminarFase = async (fase: FaseResponse) => {
    if (!window.confirm(`¿Eliminar la fase "${fase.nombre}"?`)) return
    setFaseError(null)
    try {
      await api.delete(`/proyectos/${id}/fases/${fase.id}`)
      await sincronizarAvancePlan()
    } catch (error) {
      setFaseError(getApiErrorMessage(error))
    }
  }

  const abrirEditarHito = (hito: HitoDetalle) => {
    setEditHito(hito)
    setHitoForm({
      nombre: hito.nombre,
      fecha: hito.fecha,
      estado: hito.estado,
      descripcion: hito.descripcion,
      idFase: String(hito.idFase),
      idsActividades: hito.idsActividades,
      motivoReprogramacion: "",
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
          setHitosState(prev => prev.map(h => h.id === editHito.id ? {
            ...h,
            nombre: hitoForm.nombre,
            fecha: hitoForm.fecha,
            estado: hitoForm.estado,
            descripcion: hitoForm.descripcion,
            idFase: Number(hitoForm.idFase),
            idsActividades: hitoForm.idsActividades,
            fuenteDatos: h.fuenteDatos,
          } : h))
        }
      } else {
        const creado = await api.post<HitoResponse>(`/proyectos/${id}/hitos`, payloadHito(hitoForm))
        setHitosState(prev => [...prev, hitoDesdeApi(creado)])
      }

      await sincronizarAvancePlan()
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

  const actividadesDisponiblesHito = actividadesApi.filter(actividad =>
    String(actividad.idFase) === hitoForm.idFase
    && (!actividad.idHito || editHito?.idsActividades.includes(actividad.id)),
  )
  const fechaClaveHitoCalculada = actividadesApi
    .filter(actividad => hitoForm.idsActividades.includes(actividad.id))
    .map(actividad => actividad.fechaFinPlanificada)
    .filter((fecha): fecha is string => Boolean(fecha))
    .sort()
    .at(-1) ?? ""
  const faseActividadNueva = fases.find(fase => String(fase.id) === actForm.idFase)
  const faseActividadEdicion = fases.find(fase => String(fase.id) === editForm.idFase)
  const actividadSubactividadNueva = actividadesApi.find(actividad => actividad.id === targetActividadId)
  const actividadSubactividadEdicion = actividadesApi.find(actividad => actividad.id === editingSubact?.actId)
  const entregableSubactividadEdicion = editingSubact?.sub.documentosEntregables?.[0] ?? null
  const entregableSubactividadPublicado = (editingSubact?.sub.documentosEntregables ?? [])
    .some(documento => documento.estado === "PUBLICADO")
  const urlNuevoEntregableSubactividad = editingSubact
    ? `/documentos/nuevo?proyecto=${id}&subactividad=${editingSubact.sub.id}&actividad=${editingSubact.actId}&nombreSubactividad=${encodeURIComponent(editingSubact.sub.nombre)}&returnTo=${encodeURIComponent(`/proyectos/${id}?tab=actividades`)}`
    : "/documentos/nuevo"

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
    const coincideFase = actividadFaseFilter === "todos" || String(actividad.idFase) === actividadFaseFilter
    const coincideEstado = actividadEstadoFilter === "todos" || actividad.estado === actividadEstadoFilter
    return coincideFase && coincideEstado
  })

  const totalActividadPages = Math.max(1, Math.ceil(actividadesFiltradas.length / ACTIVIDADES_POR_PAGINA))
  const actividadPageSafe = Math.min(actividadPage, totalActividadPages)
  const actividadesPaginadas = actividadesFiltradas.slice(
    (actividadPageSafe - 1) * ACTIVIDADES_POR_PAGINA,
    actividadPageSafe * ACTIVIDADES_POR_PAGINA,
  )
  const actividadRangeStart = actividadesFiltradas.length === 0 ? 0 : (actividadPageSafe - 1) * ACTIVIDADES_POR_PAGINA + 1
  const actividadRangeEnd = Math.min(actividadPageSafe * ACTIVIDADES_POR_PAGINA, actividadesFiltradas.length)

  const navegarADetalleActividad = (actividadId: number) => {
    const actividadObjetivo = actividadesConAlertas.find(actividad => actividad.id === actividadId)
    const faseId = actividadObjetivo ? String(actividadObjetivo.idFase) : "todos"
    const actividadesDeFase = actividadesConAlertas.filter(actividad => String(actividad.idFase) === faseId)
    const index = actividadesDeFase.findIndex(actividad => actividad.id === actividadId)
    setActividadFaseFilter(faseId)
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

  const documentos = documentosProyecto

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
    { id: "actividades" as TabType, label: "Fases y Actividades" },
    { id: "hitos" as TabType, label: "Hitos y Cronograma" },
    { id: "informes" as TabType, label: "Documentos" },
    { id: "equipo" as TabType, label: "Equipo" },
    { id: "bitacora" as TabType, label: "Bitácora" },
    { id: "observaciones" as TabType, label: "Incidencias" },
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
                      <div className="grid gap-2" data-field="edit-fechaFinEstimada"><Label>Fecha de fin estimada <span className="text-[#C8102E]">*</span></Label><Input required type="date" value={editFormProyecto.fechaFinEstimada} onChange={e => { const v = e.target.value; setEditFormProyecto(f => ({ ...f, fechaFinEstimada: v })); setEditFieldErrors(p => { const { "edit-fechaFinEstimada": _, ...r } = p; if (v && editFormProyecto.fechaInicio && v < editFormProyecto.fechaInicio) { r["edit-fechaFinEstimada"] = "La fecha de fin estimada no puede ser anterior a la fecha de inicio" }; return r }) }} className={editFieldErrors["edit-fechaFinEstimada"] ? "border-[#C8102E]" : ""} />{editFieldErrors["edit-fechaFinEstimada"] && <p className="text-xs text-[#C8102E]">{editFieldErrors["edit-fechaFinEstimada"]}</p>}<div className="min-h-5"></div></div>
                      <div className="grid gap-2"><Label>Estado <span className="text-[#C8102E]">*</span></Label><Select value={editFormProyecto.estado} onValueChange={v => setEditFormProyecto(f => ({ ...f, estado: v as EstadoProyecto }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ESTADOS_PROYECTO.map(estado => <SelectItem key={estado.value} value={estado.value}>{estado.label}</SelectItem>)}</SelectContent></Select><div className="min-h-5"></div></div>
                      <div className="grid gap-2"><Label>Prioridad</Label><Select value={editFormProyecto.nivelPrioridad || "sin-prioridad"} onValueChange={v => setEditFormProyecto(f => ({ ...f, nivelPrioridad: v === "sin-prioridad" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORIDADES_PROYECTO.map(prioridad => <SelectItem key={prioridad.value || "sin-prioridad"} value={prioridad.value || "sin-prioridad"}>{prioridad.label}</SelectItem>)}</SelectContent></Select><div className="min-h-5"></div></div>
                      <div className="grid gap-2" data-field="edit-porcentajeAvance"><Label>Avance calculado (%)</Label><Input type="number" value={editFormProyecto.porcentajeAvance} disabled /><p className="text-xs text-[#777]">Se calcula según la duración y finalización de hitos y actividades.</p></div>
                      <div className="grid gap-2" data-field="edit-presupuesto"><Label>Presupuesto <span className="text-[#C8102E]">*</span></Label><Input required type="number" min="0" step="0.01" value={editFormProyecto.presupuesto} onChange={e => { const v = e.target.value; setEditFormProyecto(f => ({ ...f, presupuesto: v })); setEditFieldErrors(p => { const { "edit-presupuesto": _, ...r } = p; if (v && Number(v) < 0) { r["edit-presupuesto"] = "El presupuesto no puede ser negativo" }; return r }) }} className={editFieldErrors["edit-presupuesto"] ? "border-[#C8102E]" : ""} />{editFieldErrors["edit-presupuesto"] && <p className="text-xs text-[#C8102E]">{editFieldErrors["edit-presupuesto"]}</p>}<div className="min-h-5"></div></div>
                      <div className="grid gap-2"><Label>Moneda <span className="text-[#C8102E]">*</span></Label><Select value={editFormProyecto.moneda} onValueChange={moneda => setEditFormProyecto(form => ({ ...form, moneda }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PEN">Soles (PEN)</SelectItem><SelectItem value="USD">Dólares (USD)</SelectItem><SelectItem value="EUR">Euros (EUR)</SelectItem></SelectContent></Select><div className="min-h-5"></div></div>
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

            <SuccessDialog
              open={editSuccessModalOpen}
              title="Proyecto actualizado exitosamente"
              description="Los cambios se han guardado correctamente."
              onClose={() => setEditSuccessModalOpen(false)}
            />
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
                  <ResumenIaCard proyectoId={id} />
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
                  <section className="mb-6 rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">Fases del proyecto</h3>
                        <p className="mt-1 text-xs text-[#777]">Cada actividad debe vivir dentro del periodo planificado de una fase.</p>
                      </div>
                      <Button type="button" size="sm" onClick={abrirNuevaFase} className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Nueva fase
                      </Button>
                    </div>
                    {faseError && !faseOpen && (
                      <p className="mb-3 rounded-md border border-[#C8102E]/20 bg-[#C8102E]/5 px-3 py-2 text-xs text-[#C8102E]">{faseError}</p>
                    )}
                    {fasesLoading ? (
                      <p className="text-sm text-[#5C5C5C]">Cargando fases...</p>
                    ) : fases.length > 0 ? (
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {fases.map(fase => (
                          <article key={fase.id} className="rounded-lg border border-[#E0E0E0] bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#1A1A1A]">{fase.nombre}</p>
                                <p className="mt-1 text-xs text-[#5C5C5C]">
                                  {formatLocalDate(fase.fechaInicioPlanificada)} - {formatLocalDate(fase.fechaFinPlanificada)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => abrirEditarFase(fase)} className="rounded-full p-1.5 text-[#5C5C5C] hover:bg-[#F2F2F2]" title="Editar fase">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => void eliminarFase(fase)} className="rounded-full p-1.5 text-[#C8102E] hover:bg-[#C8102E]/10" title="Eliminar fase">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span>{fase.actividadesFinalizadas} de {fase.totalActividades} actividades</span>
                              <span className={`font-semibold ${cronogramaTextClass(fase.estadoCronograma)}`}>
                                {cronogramaLabel(fase.estadoCronograma, fase.desfaseDias)}
                              </span>
                            </div>
                            <ProgressBar value={fase.porcentajeAvance} size="sm" />
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#D8D8D8] bg-white p-5 text-center text-sm text-[#5C5C5C]">
                        Crea la primera fase antes de registrar actividades.
                      </div>
                    )}
                  </section>

                  <Dialog open={faseOpen} onOpenChange={setFaseOpen}>
                    <DialogContent className="overflow-y-auto sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{faseEditando ? "Editar fase" : "Nueva fase"}</DialogTitle>
                        <DialogDescription>Define el periodo planificado que contendrá sus actividades y subactividades.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        {faseError && <p className="rounded-md border border-[#C8102E]/20 bg-[#C8102E]/5 px-3 py-2 text-xs text-[#C8102E]">{faseError}</p>}
                        <div className="grid gap-2">
                          <Label htmlFor="fase-nombre">Nombre <span className="text-[#C8102E]">*</span></Label>
                          <Input id="fase-nombre" value={faseForm.nombre} onChange={event => setFaseForm(form => ({ ...form, nombre: event.target.value }))} placeholder="Ej. Análisis y planificación" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="fase-descripcion">Descripción</Label>
                          <Textarea id="fase-descripcion" value={faseForm.descripcion} onChange={event => setFaseForm(form => ({ ...form, descripcion: event.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="fase-inicio">Inicio planificado <span className="text-[#C8102E]">*</span></Label>
                            <Input id="fase-inicio" type="date" value={faseForm.fechaInicioPlanificada} min={apiProyecto?.fechaInicio ?? undefined} max={apiProyecto?.fechaFinEstimada ?? undefined} onChange={event => setFaseForm(form => ({ ...form, fechaInicioPlanificada: event.target.value }))} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="fase-fin">Fin planificado <span className="text-[#C8102E]">*</span></Label>
                            <Input id="fase-fin" type="date" value={faseForm.fechaFinPlanificada} min={faseForm.fechaInicioPlanificada || apiProyecto?.fechaInicio || undefined} max={apiProyecto?.fechaFinEstimada ?? undefined} onChange={event => setFaseForm(form => ({ ...form, fechaFinPlanificada: event.target.value }))} />
                          </div>
                        </div>
                        {faseEditando && (
                          faseEditando.fechaInicioPlanificada !== faseForm.fechaInicioPlanificada
                          || faseEditando.fechaFinPlanificada !== faseForm.fechaFinPlanificada
                        ) && (
                          <div className="grid gap-2">
                            <Label htmlFor="fase-motivo">Motivo de reprogramación <span className="text-[#C8102E]">*</span></Label>
                            <Textarea id="fase-motivo" value={faseForm.motivoReprogramacion} onChange={event => setFaseForm(form => ({ ...form, motivoReprogramacion: event.target.value }))} />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setFaseOpen(false)} disabled={faseSubmitting}>Cancelar</Button>
                        <Button onClick={guardarFase} disabled={faseSubmitting} className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">
                          {faseSubmitting ? "Guardando..." : faseEditando ? "Guardar cambios" : "Crear fase"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                        Actividades por fase
                      </h3>
                      {actividadesLoading && (
                        <span className="text-xs text-[#5C5C5C]">Sincronizando...</span>
                      )}
                    </div>
                    <Dialog open={createActividadOpen} onOpenChange={(open) => { setCreateActividadOpen(open); if (open) { setActForm({ nombre: "", descripcion: "", fechaInicio: "", fechaFin: "", idResponsables: [], idFase: fases.length === 1 ? String(fases[0].id) : "", idHito: "", estado: "PENDIENTE" }); setActFieldErrors({}); setActResponsableSearch("") } }}>
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
                          <div className="grid gap-2" data-field="act-idFase">
                            <Label>Fase <span className="text-[#C8102E]">*</span></Label>
                            <Select value={actForm.idFase} onValueChange={value => { setActForm(f => ({ ...f, idFase: value, idHito: "" })); setActFieldErrors(prev => { const { "act-idFase": _, ...rest } = prev; return rest }) }}>
                              <SelectTrigger className={actFieldErrors["act-idFase"] ? "border-[#C8102E]" : ""}><SelectValue placeholder="Selecciona una fase" /></SelectTrigger>
                              <SelectContent>{fases.map(fase => <SelectItem key={fase.id} value={String(fase.id)}>{fase.nombre}</SelectItem>)}</SelectContent>
                            </Select>
                            {actFieldErrors["act-idFase"] && <p className="text-xs text-[#C8102E]">{actFieldErrors["act-idFase"]}</p>}
                            {fases.length === 0 && <p className="text-xs text-[#8A6D00]">Primero registra una fase.</p>}
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
                              <Label htmlFor="act-inicio">Fecha inicio planificada <span className="text-[#C8102E]">*</span></Label>
                              <Input id="act-inicio" type="date" min={faseActividadNueva?.fechaInicioPlanificada} max={faseActividadNueva?.fechaFinPlanificada} value={actForm.fechaInicio} onChange={e => { const v = e.target.value; setActForm(f => ({ ...f, fechaInicio: v })); setActFieldErrors(p => { const { "act-fechaInicio": _, "act-fechaFin": __, ...r } = p; if (v && actForm.fechaFin && actForm.fechaFin < v) { r["act-fechaFin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={actFieldErrors["act-fechaInicio"] ? "border-[#C8102E]" : ""} />
                              {actFieldErrors["act-fechaInicio"] && <p className="text-xs text-[#C8102E]">{actFieldErrors["act-fechaInicio"]}</p>}
                            </div>
                            <div className="grid gap-2" data-field="act-fechaFin">
                              <Label htmlFor="act-fin">Fecha fin planificada <span className="text-[#C8102E]">*</span></Label>
                              <Input id="act-fin" type="date" min={actForm.fechaInicio || faseActividadNueva?.fechaInicioPlanificada} max={faseActividadNueva?.fechaFinPlanificada} value={actForm.fechaFin} onChange={e => { const v = e.target.value; setActForm(f => ({ ...f, fechaFin: v })); setActFieldErrors(p => { const { "act-fechaFin": _, ...r } = p; if (v && actForm.fechaInicio && v < actForm.fechaInicio) { r["act-fechaFin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={actFieldErrors["act-fechaFin"] ? "border-[#C8102E]" : ""} />
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
                                  fechaInicioPlanificada: actForm.fechaInicio,
                                  fechaFinPlanificada: actForm.fechaFin,
                                  estado: actForm.estado as EstadoActividad,
                                  idProyecto: Number(id),
                                  idFase: Number(actForm.idFase),
                                  idResponsables: actForm.idResponsables.length > 0 ? actForm.idResponsables : undefined,
                                })
                                setActividadesApi(prev => [...prev, creada])
                                await sincronizarAvancePlan()
                                setActForm({ nombre: "", descripcion: "", fechaInicio: "", fechaFin: "", idResponsables: [], idFase: "", idHito: "", estado: "PENDIENTE" })
                                setCreateActividadOpen(false)
                                setActSuccessModalOpen(true)
                              } catch (err) {
                                toast({
                                  variant: "destructive",
                                  title: "No se pudo crear la actividad",
                                  description: getApiErrorMessage(err),
                                })
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
                        <div className="grid gap-2" data-field="edit-idFase">
                          <Label>Fase <span className="text-[#C8102E]">*</span></Label>
                          <Select value={editForm.idFase} onValueChange={value => { setEditForm(f => ({ ...f, idFase: value, idHito: "" })); setEditActFieldErrors(prev => { const { "edit-idFase": _, ...rest } = prev; return rest }) }}>
                            <SelectTrigger className={editActFieldErrors["edit-idFase"] ? "border-[#C8102E]" : ""}><SelectValue placeholder="Selecciona una fase" /></SelectTrigger>
                            <SelectContent>{fases.map(fase => <SelectItem key={fase.id} value={String(fase.id)}>{fase.nombre}</SelectItem>)}</SelectContent>
                          </Select>
                          {editActFieldErrors["edit-idFase"] && <p className="text-xs text-[#C8102E]">{editActFieldErrors["edit-idFase"]}</p>}
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
                            <Label htmlFor="edit-inicio">Fecha inicio planificada <span className="text-[#C8102E]">*</span></Label>
                              <Input id="edit-inicio" type="date" min={faseActividadEdicion?.fechaInicioPlanificada} max={faseActividadEdicion?.fechaFinPlanificada} value={editForm.fechaInicio} onChange={e => { const v = e.target.value; setEditForm(f => ({ ...f, fechaInicio: v })); setEditActFieldErrors(p => { const { "edit-inicio": _, "edit-fin": __, ...r } = p; if (v && editForm.fechaFin && editForm.fechaFin < v) { r["edit-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={editActFieldErrors["edit-inicio"] ? "border-[#C8102E]" : ""} />
                            {editActFieldErrors["edit-inicio"] && <p className="text-xs text-[#C8102E]">{editActFieldErrors["edit-inicio"]}</p>}
                          </div>
                          <div className="grid gap-2" data-field="edit-fin">
                            <Label htmlFor="edit-fin">Fecha fin planificada <span className="text-[#C8102E]">*</span></Label>
                              <Input id="edit-fin" type="date" min={editForm.fechaInicio || faseActividadEdicion?.fechaInicioPlanificada} max={faseActividadEdicion?.fechaFinPlanificada} value={editForm.fechaFin} onChange={e => { const v = e.target.value; setEditForm(f => ({ ...f, fechaFin: v })); setEditActFieldErrors(p => { const { "edit-fin": _, ...r } = p; if (v && editForm.fechaInicio && v < editForm.fechaInicio) { r["edit-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={editActFieldErrors["edit-fin"] ? "border-[#C8102E]" : ""} />
                            {editActFieldErrors["edit-fin"] && <p className="text-xs text-[#C8102E]">{editActFieldErrors["edit-fin"]}</p>}
                          </div>
                        </div>
                        {editingActividad && (
                          editForm.fechaInicio !== (editingActividad.fechaInicioPlanificada ?? "")
                          || editForm.fechaFin !== (editingActividad.fechaFinPlanificada ?? "")
                        ) && (
                          <div className="grid gap-2" data-field="edit-motivo">
                            <Label htmlFor="edit-motivo">Motivo de reprogramación <span className="text-[#C8102E]">*</span></Label>
                            <Textarea
                              id="edit-motivo"
                              value={editForm.motivoReprogramacion}
                              onChange={event => setEditForm(form => ({ ...form, motivoReprogramacion: event.target.value }))}
                              placeholder="Explica el cambio en las fechas planificadas"
                              className={editActFieldErrors["edit-motivo"] ? "border-[#C8102E]" : ""}
                            />
                            {editActFieldErrors["edit-motivo"] && <p className="text-xs text-[#C8102E]">{editActFieldErrors["edit-motivo"]}</p>}
                          </div>
                        )}
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
                                fechaInicioPlanificada: editForm.fechaInicio,
                                fechaFinPlanificada: editForm.fechaFin,
                                fechaFinReal: editForm.fechaFinReal || undefined,
                                motivoReprogramacion: editForm.motivoReprogramacion.trim() || undefined,
                                estado: editForm.estado,
                                idProyecto: editingActividad.idProyecto,
                                idFase: Number(editForm.idFase),
                                idHito: editForm.idHito ? Number(editForm.idHito) : undefined,
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
                  <Dialog open={createSubactOpen} onOpenChange={(open) => { setCreateSubactOpen(open); if (open) { setSubactForm({ nombre: "", idResponsable: "", presupuesto: "", costoReal: "", hombresInvolucrados: "", mujeresInvolucradas: "", fechaInicio: "", fechaFin: "", estado: "PENDIENTE", descripcion: "" }); setSubactFieldErrors({}); setSubactResponsableSearch("") } }}>
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
                              <Input id="sub-inicio" type="date" min={actividadSubactividadNueva?.fechaInicioPlanificada ?? undefined} max={actividadSubactividadNueva?.fechaFinPlanificada ?? undefined} value={subactForm.fechaInicio} onChange={e => { const v = e.target.value; setSubactForm(f => ({ ...f, fechaInicio: v })); setSubactFieldErrors(p => { const { "sub-inicio": _, "sub-fin": __, ...r } = p; if (v && subactForm.fechaFin && subactForm.fechaFin < v) { r["sub-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={subactFieldErrors["sub-inicio"] ? "border-[#C8102E]" : ""} />
                              {subactFieldErrors["sub-inicio"] && <p className="text-xs text-[#C8102E]">{subactFieldErrors["sub-inicio"]}</p>}
                            </div>
                            <div className="grid gap-2" data-field="sub-fin">
                              <Label htmlFor="sub-fin">Fecha de Fin</Label>
                              <Input id="sub-fin" type="date" min={subactForm.fechaInicio || actividadSubactividadNueva?.fechaInicioPlanificada || undefined} max={actividadSubactividadNueva?.fechaFinPlanificada ?? undefined} value={subactForm.fechaFin} onChange={e => { const v = e.target.value; setSubactForm(f => ({ ...f, fechaFin: v })); setSubactFieldErrors(p => { const { "sub-fin": _, ...r } = p; if (v && subactForm.fechaInicio && v < subactForm.fechaInicio) { r["sub-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={subactFieldErrors["sub-fin"] ? "border-[#C8102E]" : ""} />
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
                                <SelectItem value="FINALIZADA" disabled>Finalizada mediante entregable publicado</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-[#5C5C5C]">
                              La subactividad se finalizará automáticamente cuando su entregable pase a Publicado.
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2" data-field="sub-presu">
                              <Label htmlFor="sub-presu">Presupuesto ({apiProyecto?.moneda ?? "PEN"})</Label>
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
                                  costoReal: subactForm.costoReal ? Number(subactForm.costoReal) : undefined,
                                  hombresInvolucrados: subactForm.hombresInvolucrados ? Number(subactForm.hombresInvolucrados) : undefined,
                                  mujeresInvolucradas: subactForm.mujeresInvolucradas ? Number(subactForm.mujeresInvolucradas) : undefined,
                                  fechaInicioPlanificada: subactForm.fechaInicio,
                                  fechaFinPlanificada: subactForm.fechaFin,
                                  estado: subactForm.estado,
                                  descripcion: subactForm.descripcion.trim() || undefined,
                                }
                                const creada = await api.post<SubactividadResponse>(`/actividades/${targetActividadId}/subactividades`, nuevaSub)
                                setActividadesApi(prev => prev.map(a => a.id === targetActividadId ? { ...a, subactividades: [...(a.subactividades || []), creada] } : a))
                                await sincronizarAvancePlan()
                                setCreateSubactOpen(false)
                                setSubactForm({
                                  nombre: "", idResponsable: "", presupuesto: "", costoReal: "", hombresInvolucrados: "", mujeresInvolucradas: "", fechaInicio: "", fechaFin: "", estado: "PENDIENTE", descripcion: ""
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
                  <Dialog open={editSubactOpen} onOpenChange={(open) => {
                    setEditSubactOpen(open)
                    if (open) {
                      setEditSubactFieldErrors({})
                      setEditSubactSubmitError(null)
                      setEditSubactResponsableSearch("")
                    }
                  }}>
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
                              <Input id="edit-sub-inicio" type="date" min={actividadSubactividadEdicion?.fechaInicioPlanificada ?? undefined} max={actividadSubactividadEdicion?.fechaFinPlanificada ?? undefined} value={editSubactForm.fechaInicio} onChange={e => { const v = e.target.value; setEditSubactForm(f => ({ ...f, fechaInicio: v })); setEditSubactFieldErrors(p => { const { "edit-sub-inicio": _, "edit-sub-fin": __, ...r } = p; if (v && editSubactForm.fechaFin && editSubactForm.fechaFin < v) { r["edit-sub-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={editSubactFieldErrors["edit-sub-inicio"] ? "border-[#C8102E]" : ""} />
                              {editSubactFieldErrors["edit-sub-inicio"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-inicio"]}</p>}
                            </div>
                            <div className="grid gap-2" data-field="edit-sub-fin">
                              <Label htmlFor="edit-sub-fin">Fecha de Fin</Label>
                              <Input id="edit-sub-fin" type="date" min={editSubactForm.fechaInicio || actividadSubactividadEdicion?.fechaInicioPlanificada || undefined} max={actividadSubactividadEdicion?.fechaFinPlanificada ?? undefined} value={editSubactForm.fechaFin} onChange={e => { const v = e.target.value; setEditSubactForm(f => ({ ...f, fechaFin: v })); setEditSubactFieldErrors(p => { const { "edit-sub-fin": _, ...r } = p; if (v && editSubactForm.fechaInicio && v < editSubactForm.fechaInicio) { r["edit-sub-fin"] = "La fecha de fin no puede ser anterior a la fecha de inicio" }; return r }) }} className={editSubactFieldErrors["edit-sub-fin"] ? "border-[#C8102E]" : ""} />
                              {editSubactFieldErrors["edit-sub-fin"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-fin"]}</p>}
                            </div>
                          </div>
                          <div className="grid gap-2" data-field="edit-sub-entregable">
                            <Label htmlFor="edit-sub-estado">Estado</Label>
                            <Select value={editSubactForm.estado} onValueChange={value => setEditSubactForm(f => ({
                              ...f,
                              estado: value as EstadoActividad,
                              fechaInicioReal: value !== "PENDIENTE" && !f.fechaInicioReal
                                ? f.fechaInicio
                                : value === "PENDIENTE" ? "" : f.fechaInicioReal,
                              fechaFinReal: value === "FINALIZADA" && !f.fechaFinReal
                                ? f.fechaFin
                                : value === "FINALIZADA" ? f.fechaFinReal : "",
                            }))}>
                              <SelectTrigger id="edit-sub-estado">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                                <SelectItem value="EN_CURSO">En curso</SelectItem>
                                <SelectItem
                                  value="FINALIZADA"
                                  disabled={!entregableSubactividadPublicado && editingSubact?.sub.estado !== "FINALIZADA"}
                                >
                                  Finalizada
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {editSubactFieldErrors["edit-sub-entregable"] && (
                              <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-entregable"]}</p>
                            )}
                            {entregableSubactividadPublicado ? (
                              <div className="rounded-lg border border-[#2E7D32]/25 bg-[#E8F5E9] p-3 text-xs text-[#2E7D32]">
                                <div className="flex items-start gap-2">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-semibold">Entregable publicado</p>
                                    <p className="mt-0.5">
                                      La publicación del documento completa esta subactividad automáticamente.
                                    </p>
                                    {entregableSubactividadEdicion && (
                                      <Link
                                        href={`/documentos/${entregableSubactividadEdicion.id}`}
                                        className="mt-2 inline-flex font-semibold underline underline-offset-2"
                                      >
                                        Ver entregable
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-[#F9A825]/30 bg-[#FFFDE7] p-3 text-xs text-[#7A5B00]">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F9A825]" />
                                  <div className="min-w-0">
                                    <p className="font-semibold">
                                      {entregableSubactividadEdicion
                                        ? "El entregable todavía no está publicado"
                                        : "Esta subactividad aún no tiene un entregable"}
                                    </p>
                                    <p className="mt-0.5">
                                      Debes registrar el documento y llevarlo por Borrador, En revisión y Publicado.
                                      Solo entonces la subactividad pasará a Finalizada.
                                    </p>
                                    <Link
                                      href={entregableSubactividadEdicion
                                        ? `/documentos/${entregableSubactividadEdicion.id}`
                                        : urlNuevoEntregableSubactividad}
                                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-[#8A6500] underline underline-offset-2"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      {entregableSubactividadEdicion ? "Gestionar entregable" : "Registrar entregable"}
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          {editSubactForm.estado !== "PENDIENTE" && (
                            <div className="grid gap-2" data-field="edit-sub-inicio-real">
                              <Label htmlFor="edit-sub-inicio-real">Fecha real de inicio <span className="text-[#C8102E]">*</span></Label>
                              <Input
                                id="edit-sub-inicio-real"
                                type="date"
                                min={editSubactForm.fechaInicio || undefined}
                                max={editSubactForm.fechaFinReal || undefined}
                                value={editSubactForm.fechaInicioReal}
                                onChange={event => setEditSubactForm(form => ({ ...form, fechaInicioReal: event.target.value }))}
                                className={editSubactFieldErrors["edit-sub-inicio-real"] ? "border-[#C8102E]" : ""}
                              />
                              {editSubactFieldErrors["edit-sub-inicio-real"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-inicio-real"]}</p>}
                            </div>
                          )}
                          {editSubactForm.estado === "FINALIZADA" && (
                            <div className="grid gap-2" data-field="edit-sub-fin-real">
                              <Label htmlFor="edit-sub-fin-real">Fecha real de finalización <span className="text-[#C8102E]">*</span></Label>
                              <Input
                                id="edit-sub-fin-real"
                                type="date"
                                min={editSubactForm.fechaInicioReal || editSubactForm.fechaInicio || undefined}
                                value={editSubactForm.fechaFinReal}
                                onChange={event => setEditSubactForm(form => ({ ...form, fechaFinReal: event.target.value }))}
                                className={editSubactFieldErrors["edit-sub-fin-real"] ? "border-[#C8102E]" : ""}
                              />
                              {editSubactFieldErrors["edit-sub-fin-real"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-fin-real"]}</p>}
                            </div>
                          )}
                          {editingSubact && (
                            editSubactForm.fechaInicio !== (editingSubact.sub.fechaInicioPlanificada ?? "")
                            || editSubactForm.fechaFin !== (editingSubact.sub.fechaFinPlanificada ?? "")
                          ) && (
                            <div className="grid gap-2" data-field="edit-sub-motivo">
                              <Label htmlFor="edit-sub-motivo">Motivo de reprogramación <span className="text-[#C8102E]">*</span></Label>
                              <Textarea
                                id="edit-sub-motivo"
                                value={editSubactForm.motivoReprogramacion}
                                onChange={event => setEditSubactForm(form => ({ ...form, motivoReprogramacion: event.target.value }))}
                                placeholder="Explica el cambio de fechas planificadas"
                                className={editSubactFieldErrors["edit-sub-motivo"] ? "border-[#C8102E]" : ""}
                              />
                              {editSubactFieldErrors["edit-sub-motivo"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-motivo"]}</p>}
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2" data-field="edit-sub-presu">
                              <Label htmlFor="edit-sub-presu">Presupuesto ({apiProyecto?.moneda ?? "PEN"})</Label>
                              <Input id="edit-sub-presu" type="number" min="0" value={editSubactForm.presupuesto} onChange={e => { const v = e.target.value; setEditSubactForm(f => ({ ...f, presupuesto: v })); setEditSubactFieldErrors(p => { const { "edit-sub-presu": _, ...r } = p; if (v && Number(v) < 0) { r["edit-sub-presu"] = "El presupuesto no puede ser negativo" }; return r }) }} className={editSubactFieldErrors["edit-sub-presu"] ? "border-[#C8102E]" : ""} />
                              {editSubactFieldErrors["edit-sub-presu"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-presu"]}</p>}
                            </div>
                            <div className="grid gap-2" data-field="edit-sub-costo-real">
                              <Label htmlFor="edit-sub-costo-real">
                                Costo real {editSubactForm.estado === "FINALIZADA" && <span className="text-[#C8102E]">*</span>}
                              </Label>
                              <Input
                                id="edit-sub-costo-real"
                                type="number"
                                min="0"
                                value={editSubactForm.costoReal}
                                onChange={(event) => {
                                  setEditSubactForm((form) => ({ ...form, costoReal: event.target.value }))
                                  setEditSubactFieldErrors((current) => {
                                    const { "edit-sub-costo-real": _, ...rest } = current
                                    return rest
                                  })
                                }}
                                className={editSubactFieldErrors["edit-sub-costo-real"] ? "border-[#C8102E]" : ""}
                              />
                              {editSubactFieldErrors["edit-sub-costo-real"] && <p className="text-xs text-[#C8102E]">{editSubactFieldErrors["edit-sub-costo-real"]}</p>}
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
                        {editSubactSubmitError && (
                          <div className="mb-4 rounded-lg border border-[#C8102E]/25 bg-[#C8102E]/5 p-3 text-sm text-[#C8102E]">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                              <div>
                                <p className="font-semibold">No se pudo guardar la subactividad</p>
                                <p className="mt-0.5">{editSubactSubmitError}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditSubactOpen(false)}>Cancelar</Button>
                          <Button
                            className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                            disabled={editandoSubact}
                            onClick={async () => {
                              setEditSubactFieldErrors({})
                              setEditSubactSubmitError(null)
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
                                  costoReal: editSubactForm.costoReal ? Number(editSubactForm.costoReal) : undefined,
                                  hombresInvolucrados: editSubactForm.hombresInvolucrados ? Number(editSubactForm.hombresInvolucrados) : undefined,
                                  mujeresInvolucradas: editSubactForm.mujeresInvolucradas ? Number(editSubactForm.mujeresInvolucradas) : undefined,
                                  fechaInicioPlanificada: editSubactForm.fechaInicio,
                                  fechaFinPlanificada: editSubactForm.fechaFin,
                                  fechaInicioReal: editSubactForm.fechaInicioReal || undefined,
                                  fechaFinReal: editSubactForm.fechaFinReal || undefined,
                                  estado: editSubactForm.estado,
                                  descripcion: editSubactForm.descripcion.trim() || undefined,
                                  motivoReprogramacion: editSubactForm.motivoReprogramacion.trim() || undefined,
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
                                const message = getApiErrorMessage(err)
                                setEditSubactSubmitError(message)
                                toast({
                                  variant: "destructive",
                                  title: "No se pudo actualizar la subactividad",
                                  description: message,
                                })
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
                          <Label className="text-xs font-semibold uppercase text-[#5C5C5C]">Fase</Label>
                          <Select value={actividadFaseFilter} onValueChange={(value) => { setActividadFaseFilter(value); setActividadPage(1) }}>
                            <SelectTrigger className="h-9 min-w-56 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todos">Todas las fases</SelectItem>
                              {fases.map(fase => (
                                <SelectItem key={fase.id} value={String(fase.id)}>{fase.nombre}</SelectItem>
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
                          disabled={actividadFaseFilter === "todos" && actividadEstadoFilter === "todos"}
                          onClick={() => {
                            setActividadFaseFilter("todos")
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
                            <th className="w-44 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Fase / hito</th>
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
                                    <span className="text-[11px] font-normal text-[#5C5C5C]">
                                      Costo estimado: {formatProjectCurrency(act.costoEstimado, act.moneda)} · real: {formatProjectCurrency(act.costoReal, act.moneda)}
                                    </span>
                                    <span className={`text-[11px] font-semibold ${cronogramaTextClass(act.estadoCronograma)}`}>
                                      {cronogramaLabel(act.estadoCronograma, act.desfaseDias)}
                                      {act.fechaFinReal ? ` · fin real ${formatLocalDate(act.fechaFinReal)}` : ""}
                                    </span>
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
                                  <span className="block font-semibold text-[#1A1A1A]">{act.nombreFase}</span>
                                  <span className="mt-1 inline-flex rounded-full bg-[#FFF8CC] px-2.5 py-1 font-medium text-[#765D00]">{act.nombreHito ?? "Sin hito"}</span>
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
                                  {act.fechaInicioPlanificada ? act.fechaInicioPlanificada.split('-').reverse().join('/') : "—"}
                                </td>
                                <td className="px-3 py-3 text-xs text-[#5C5C5C]">
                                  {act.fechaFinPlanificada ? act.fechaFinPlanificada.split('-').reverse().join('/') : "—"}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="w-28">
                                    <div className="mb-1 text-xs font-semibold text-[#1A1A1A]">{formatPercent(getActividadAvance(act))}</div>
                                    <ProgressBar value={getActividadAvance(act)} size="sm" />
                                    <div className="mt-1 text-[10px] text-[#5C5C5C]">Plan: {formatPercent(act.avancePlanificado)}</div>
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
                                        setSubactForm({ nombre: "", idResponsable: "", presupuesto: "", costoReal: "", hombresInvolucrados: "", mujeresInvolucradas: "", fechaInicio: "", fechaFin: "", estado: "PENDIENTE", descripcion: "" })
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
                                          fechaInicio: act.fechaInicioPlanificada ?? "",
                                          fechaFin: act.fechaFinPlanificada ?? "",
                                          fechaFinReal: act.fechaFinReal ?? "",
                                          motivoReprogramacion: "",
                                          estado: act.estado,
                                          idResponsables: [...act.idResponsables],
                                          idFase: String(act.idFase),
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
                                      <span className="text-[10px] font-normal text-[#5C5C5C]">
                                        Estimado: {formatProjectCurrency(sub.presupuesto, sub.moneda)} · Real: {formatProjectCurrency(sub.costoReal, sub.moneda)}
                                      </span>
                                      <span className={`text-[10px] font-semibold ${cronogramaTextClass(sub.estadoCronograma)}`}>
                                        {cronogramaLabel(sub.estadoCronograma, sub.desfaseDias)}
                                      </span>
                                      {(sub.documentosEntregables ?? []).map((documento) => (
                                        <Link
                                          key={documento.id}
                                          href={`/documentos/${documento.id}`}
                                          className="mt-1 flex w-fit flex-wrap items-center gap-1.5 rounded-md border border-[#E0E0E0] bg-white px-2 py-1 text-[10px] hover:border-[#FFD600]"
                                        >
                                          <FileText className="h-3 w-3 text-[#C9A42B]" />
                                          <span className="font-semibold text-[#0277BD]">
                                            {documento.titulo}
                                          </span>
                                          <span className={`rounded px-1.5 py-0.5 font-semibold ${
                                            documento.estado === "PUBLICADO"
                                              ? "bg-[#E8F5E9] text-[#2E7D32]"
                                              : documento.estado === "EN_REVISION"
                                                ? "bg-[#FFF3E0] text-[#E65100]"
                                                : "bg-[#F5F5F5] text-[#5C5C5C]"
                                          }`}>
                                            {documento.estado === "EN_REVISION"
                                              ? "EN REVISIÓN"
                                              : documento.estado}
                                          </span>
                                          <span className="text-[#5C5C5C]">
                                            v{documento.version}
                                          </span>
                                        </Link>
                                      ))}
                                      {(sub.archivosEvidencia ?? []).map((archivo) => (
                                        <div key={archivo.id} className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
                                          <a href={archivo.url} target="_blank" rel="noreferrer" className="text-[#0277BD] hover:underline">
                                            {archivo.nombre}
                                          </a>
                                          <span className="rounded bg-white px-1.5 py-0.5">
                                            Evidencia histórica · {archivo.estado}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-[#9CA3AF]">—</td>
                                  <td className="px-3 py-2 text-xs text-[#5C5C5C]">{sub.responsable || "—"}</td>
                                  <td className="px-3 py-2 text-xs text-[#5C5C5C]">
                                    {sub.fechaInicioPlanificada ? sub.fechaInicioPlanificada.split('-').reverse().join('/') : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-[#5C5C5C]">
                                    {sub.fechaFinPlanificada ? sub.fechaFinPlanificada.split('-').reverse().join('/') : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-xs font-semibold text-[#1A1A1A]">
                                    {formatPercent(sub.porcentajeAvance)}
                                    <span className="block text-[10px] font-normal text-[#5C5C5C]">Plan: {formatPercent(sub.avancePlanificado)}</span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <StatusBadge estado={sub.estado ?? "PENDIENTE"} />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      {(sub.documentosEntregables ?? []).length > 0 ? (
                                        <Link
                                          href={`/documentos/${sub.documentosEntregables?.[0].id}`}
                                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#0277BD] hover:bg-[#0277BD]/10"
                                          title="Gestionar entregable"
                                        >
                                          <FileText className="h-3.5 w-3.5" />
                                        </Link>
                                      ) : (
                                        <Link
                                          href={`/documentos/nuevo?proyecto=${id}&subactividad=${sub.id}&actividad=${act.id}&nombreSubactividad=${encodeURIComponent(sub.nombre)}&returnTo=${encodeURIComponent(`/proyectos/${id}?tab=actividades`)}`}
                                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#0277BD] hover:bg-[#0277BD]/10"
                                          title="Registrar entregable"
                                        >
                                          <FileText className="h-3.5 w-3.5" />
                                        </Link>
                                      )}
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
                                            costoReal: sub.costoReal != null ? String(sub.costoReal) : "",
                                            hombresInvolucrados: sub.hombresInvolucrados ? String(sub.hombresInvolucrados) : "",
                                            mujeresInvolucradas: sub.mujeresInvolucradas ? String(sub.mujeresInvolucradas) : "",
                                            fechaInicio: sub.fechaInicioPlanificada ?? "",
                                            fechaFin: sub.fechaFinPlanificada ?? "",
                                            fechaInicioReal: sub.fechaInicioReal
                                              && sub.fechaInicioPlanificada
                                              && sub.fechaInicioReal >= sub.fechaInicioPlanificada
                                                ? sub.fechaInicioReal
                                                : sub.fechaInicioPlanificada ?? "",
                                            fechaFinReal: sub.fechaFinReal ?? "",
                                            motivoReprogramacion: "",
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
                                        setSubactForm({ nombre: "", idResponsable: "", presupuesto: "", costoReal: "", hombresInvolucrados: "", mujeresInvolucradas: "", fechaInicio: "", fechaFin: "", estado: "PENDIENTE", descripcion: "" })
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
                      <div data-field="hito-fase" className="grid gap-2">
                        <Label>Fase <span className="text-[#C8102E]">*</span></Label>
                        <Select
                          value={hitoForm.idFase}
                          onValueChange={value => {
                            setHitoForm(form => ({ ...form, idFase: value, idsActividades: [], fecha: "" }))
                            setHitoFieldErrors(errors => {
                              const { "hito-fase": _, "hito-actividades": __, ...rest } = errors
                              return rest
                            })
                          }}
                        >
                          <SelectTrigger className={hitoFieldErrors["hito-fase"] ? "border-[#C8102E]" : ""}>
                            <SelectValue placeholder="Selecciona una fase" />
                          </SelectTrigger>
                          <SelectContent>
                            {fases.map(fase => <SelectItem key={fase.id} value={String(fase.id)}>{fase.nombre}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {hitoFieldErrors["hito-fase"] && <p className="text-xs text-[#C8102E]">{hitoFieldErrors["hito-fase"]}</p>}
                      </div>
                      <div data-field="hito-actividades" className="grid gap-2">
                        <Label>Actividades que completan el hito <span className="text-[#C8102E]">*</span></Label>
                        <div className={`max-h-52 space-y-2 overflow-y-auto rounded-md border p-3 ${hitoFieldErrors["hito-actividades"] ? "border-[#C8102E]" : "border-[#E0E0E0]"}`}>
                          {!hitoForm.idFase ? (
                            <p className="text-xs text-[#777]">Selecciona una fase para listar sus actividades.</p>
                          ) : actividadesDisponiblesHito.length > 0 ? actividadesDisponiblesHito.map(actividad => {
                            const selected = hitoForm.idsActividades.includes(actividad.id)
                            return (
                              <label key={actividad.id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-[#F7F7F7]">
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={() => {
                                    const idsActividades = selected
                                      ? hitoForm.idsActividades.filter(idActividad => idActividad !== actividad.id)
                                      : [...hitoForm.idsActividades, actividad.id]
                                    const fecha = actividadesApi
                                      .filter(item => idsActividades.includes(item.id))
                                      .map(item => item.fechaFinPlanificada)
                                      .filter((value): value is string => Boolean(value))
                                      .sort()
                                      .at(-1) ?? ""
                                    setHitoForm(form => ({ ...form, idsActividades, fecha }))
                                    setHitoFieldErrors(errors => {
                                      const { "hito-actividades": _, ...rest } = errors
                                      return rest
                                    })
                                  }}
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium text-[#1A1A1A]">{actividad.nombre}</span>
                                  <span className="block text-xs text-[#777]">
                                    Fin planificado: {formatLocalDate(actividad.fechaFinPlanificada)}
                                  </span>
                                </span>
                              </label>
                            )
                          }) : (
                            <p className="text-xs text-[#777]">No hay actividades disponibles en esta fase. Una actividad solo puede pertenecer a un hito.</p>
                          )}
                        </div>
                        {hitoFieldErrors["hito-actividades"] && <p className="text-xs text-[#C8102E]">{hitoFieldErrors["hito-actividades"]}</p>}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hito-fecha">Fecha clave calculada</Label>
                        <Input id="hito-fecha" type="date" value={fechaClaveHitoCalculada} disabled />
                        <p className="text-xs text-[#777]">Corresponde al fin planificado más tardío de las actividades seleccionadas.</p>
                      </div>
                      {editHito && fechaClaveHitoCalculada !== editHito.fecha && (
                        <div data-field="hito-motivo" className="grid gap-2">
                          <Label htmlFor="hito-motivo">Motivo de reprogramación</Label>
                          <Textarea
                            id="hito-motivo"
                            value={hitoForm.motivoReprogramacion}
                            onChange={event => setHitoForm(current => ({ ...current, motivoReprogramacion: event.target.value }))}
                            placeholder="Explica por qué cambia la fecha clave planificada"
                            className={hitoFieldErrors["hito-motivo"] ? "border-[#C8102E]" : ""}
                          />
                          {hitoFieldErrors["hito-motivo"] && <p className="text-xs text-[#C8102E]">{hitoFieldErrors["hito-motivo"]}</p>}
                        </div>
                      )}
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
                        <p className="text-xs font-semibold uppercase text-[#5C5C5C]">Hitos completados</p>
                        <p className="mt-2 text-3xl font-bold text-[#1A1A1A]">{hitosConAlertas.filter(h => h.estado === "Finalizado").length}<span className="text-base font-normal text-[#777]"> / {hitosConAlertas.length}</span></p>
                      </div>
                      <div className="rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] p-4">
                        <p className="text-xs font-semibold uppercase text-[#5C5C5C]">Actividades finalizadas</p>
                        <p className="mt-2 text-3xl font-bold text-[#1A1A1A]">{actividades.filter(a => a.estado === "FINALIZADA").length}<span className="text-base font-normal text-[#777]"> / {actividades.length}</span></p>
                      </div>
                    </div>
                    <div className="mb-6"><ProjectGantt fases={fases} hitos={hitosState} actividades={actividadesApi} /></div>
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
                                    {formatDateOnly(hito.fecha, {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric"
                                    })}
                                  </p>
                                  <p className={`mt-1 text-xs font-semibold ${cronogramaTextClass(hito.estadoCronograma)}`}>
                                    {cronogramaLabel(hito.estadoCronograma, hito.desfaseDias)}
                                    {hito.fechaCumplimientoReal ? ` · cumplimiento real ${formatLocalDate(hito.fechaCumplimientoReal)}` : ""}
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
                                            onClick={() => navegarADetalleActividad(actividad.id)}
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
                                        onClick={() => abrirEditarHito(hito)}
                                      >
                                        <Pencil className="h-3.5 w-3.5" /> Editar actividades asociadas
                                      </button>
                                    )}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5C5C5C]">
                                    {hito.reprogramaciones.map(item => (
                                      <span key={item.id} className="inline-flex rounded-md bg-[#FFF8CC] px-2.5 py-1 text-[#765D00]">
                                        Reprogramado: {item.motivo} · {item.nombreUsuario}
                                      </span>
                                    ))}
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

            {/* Documentos Tab */}
            {activeTab === "informes" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                      Documentos
                    </h3>
                  </div>
                  <Link
                    href={`/documentos/nuevo?proyecto=${id}`}
                    className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#C9A42B]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo documento
                  </Link>
                </div>
                {documentos.length > 0 ? (
                  <div className="space-y-3">
                    {documentos.map(doc => (
                      <Link href={`/documentos/${doc.id}`} key={doc.id} className="flex items-center gap-4 rounded-lg border border-[#E0E0E0] p-4 hover:bg-[#FFFDE7]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFD600]/20">
                          <FileText className="h-5 w-5 text-[#C9A42B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">{doc.titulo}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {doc.tipo && <TypeBadge tipo={doc.tipo} />}
                            <span className="text-xs text-[#5C5C5C]">
                              {formatLocalDate(doc.fechaCarga)}
                            </span>
                            <span className="text-xs text-[#5C5C5C]">
                              Cargado por {doc.usuarioCarga}
                            </span>
                          </div>
                        </div>
                        <StatusBadge estado={doc.estado} />
                      </Link>
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
                {organigrama && <ProjectResponsibilityTree data={organigrama} />}
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
                </div>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-[#5C5C5C]" />
                  <Input
                    value={bitacoraSearch}
                    onChange={(event) => {
                      setBitacoraSearch(event.target.value)
                      setBitacoraPage(0)
                    }}
                    placeholder='Buscar, por ejemplo "actividad 3", documento o usuario'
                    className="pl-10"
                  />
                </div>
                {bitacoraLoading ? (
                  <div className="text-center py-8 text-sm text-[#5C5C5C]">
                    Cargando bitácora...
                  </div>
                ) : bitacoraData.length > 0 ? (
                  <div className="space-y-4">
                    {bitacoraData.map((entry, index) => {
                      const entryKey = `${entry.fecha}-${entry.tipoAccion}-${index}`
                      const exigeControles =
                        entry.descripcion.length > 120 || entry.descripcion.includes("\n")
                      const isExpanded = expandedEntries[entryKey]

                      return (
                        <div
                          key={entryKey}
                          className="flex gap-4 rounded-lg border border-[#E0E0E0] p-4"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7]">
                            <Clock className="h-4 w-4 text-[#5C5C5C]" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#1A1A1A]">{entry.nombre}</span>
                              <span className="text-xs text-[#5C5C5C]">•</span>
                              <span className="text-xs text-[#5C5C5C]">{entry.tipoAccion}</span>
                            </div>
                            <div
                              className={`text-sm text-[#5C5C5C] mt-1 ${
                                !isExpanded && exigeControles
                                  ? "line-clamp-2 text-ellipsis overflow-hidden"
                                  : ""
                              }`}
                            >
                              {entry.descripcion.split('\n').map((line, i, array) => (
                                <React.Fragment key={i}>
                                  {line}
                                  {i < array.length - 1 && <br />}
                                </React.Fragment>
                              ))}
                            </div>
                            {exigeControles && (
                              <button
                                type="button"
                                onClick={() => toggleBitacoraEntry(entryKey)}
                                className="mt-1 text-xs font-semibold text-[#C9A42B] hover:text-[#FFD600] transition-colors"
                              >
                                {isExpanded ? "Ver menos cambios ▲" : "Ver todos los cambios ▼"}
                              </button>
                            )}
                            <p className="text-xs text-[#5C5C5C] mt-2">{formatDateTime(entry.fecha)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-[#5C5C5C]">
                    No hay registros en la bitácora.
                  </div>
                )}
                {(bitacoraTotalPages > 1 || bitacoraPage > 0) && (
                  <div className="mt-6 flex items-center justify-between border-t border-[#E0E0E0] pt-4">
                    <p className="text-xs text-[#5C5C5C]">
                      Página {bitacoraPage + 1} de {Math.max(bitacoraTotalPages, 1)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={bitacoraFirst || bitacoraLoading}
                        onClick={() => setBitacoraPage((current) => current - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={bitacoraLast || bitacoraLoading}
                        onClick={() => setBitacoraPage((current) => current + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Observaciones Tab */}
            {activeTab === "observaciones" && (
              <div className="p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                    Incidencias
                  </h3>
                  <Dialog
                    open={observacionModalOpen}
                    onOpenChange={(open) => {
                      setObservacionModalOpen(open)
                      if (!open) setObservacionDescripcion("")
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Registrar Incidencia
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Registrar incidencia</DialogTitle>
                        <DialogDescription>
                          Registra una incidencia con criticidad, responsable y plazo automático.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="observacion-descripcion">Descripción</Label>
                        <Textarea
                          id="observacion-descripcion"
                          value={observacionDescripcion}
                          onChange={(event) => setObservacionDescripcion(event.target.value)}
                          placeholder="Describe la incidencia o observación..."
                          rows={5}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Criticidad</Label>
                          <Select value={observacionCriticidad} onValueChange={(value) => setObservacionCriticidad(value as typeof observacionCriticidad)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BAJA">Baja · 14 días</SelectItem>
                              <SelectItem value="MEDIA">Media · 7 días</SelectItem>
                              <SelectItem value="ALTA">Alta · 3 días</SelectItem>
                              <SelectItem value="CRITICA">Crítica · 1 día</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Responsable</Label>
                          <Select value={observacionResponsable || "actual"} onValueChange={(value) => setObservacionResponsable(value === "actual" ? "" : value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="actual">Usuario actual</SelectItem>
                              {usuariosSistema.map((usuario) => (
                                <SelectItem key={usuario.id} value={String(usuario.id)}>
                                  {usuario.nombres} {usuario.apellidos}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setObservacionModalOpen(false)}
                          disabled={observacionSubmitting}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          onClick={registrarObservacion}
                          disabled={observacionSubmitting}
                          className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                        >
                          {observacionSubmitting ? "Guardando..." : "Registrar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Dialog
                  open={resolverIncidencia !== null}
                  onOpenChange={(open) => {
                    if (!open) {
                      setResolverIncidencia(null)
                      setComentarioResolucion("")
                    }
                  }}
                >
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Finalizar incidencia</DialogTitle>
                      <DialogDescription>
                        Registra cómo se levantó la incidencia. Este comentario quedará en el historial.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4">
                      <Label htmlFor="comentario-resolucion">Comentario de resolución <span className="text-[#C8102E]">*</span></Label>
                      <Textarea
                        id="comentario-resolucion"
                        value={comentarioResolucion}
                        onChange={event => setComentarioResolucion(event.target.value)}
                        placeholder="Describe la acción realizada, validación o evidencia del levantamiento"
                        rows={5}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setResolverIncidencia(null)} disabled={resolviendoIncidencia}>Cancelar</Button>
                      <Button
                        className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                        disabled={resolviendoIncidencia || !comentarioResolucion.trim()}
                        onClick={async () => {
                          if (!resolverIncidencia || !comentarioResolucion.trim()) return
                          setResolviendoIncidencia(true)
                          try {
                            await resolverObservacion(resolverIncidencia.id, comentarioResolucion.trim())
                            setResolverIncidencia(null)
                            setComentarioResolucion("")
                            setObservacionesReloadKey(current => current + 1)
                            toast({ title: "Incidencia resuelta", description: "El comentario de levantamiento quedó registrado." })
                          } catch (error) {
                            toast({ variant: "destructive", title: "No se pudo resolver", description: getApiErrorMessage(error) })
                          } finally {
                            setResolviendoIncidencia(false)
                          }
                        }}
                      >
                        {resolviendoIncidencia ? "Guardando..." : "Finalizar incidencia"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="rounded-lg border border-[#E0E0E0]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Criticidad / vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {observacionesLoading && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-sm text-[#5C5C5C]">
                            Cargando observaciones...
                          </TableCell>
                        </TableRow>
                      )}
                      {!observacionesLoading && observacionesData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-sm text-[#5C5C5C]">
                            No hay incidencias registradas para este proyecto.
                          </TableCell>
                        </TableRow>
                      )}
                      {!observacionesLoading && observacionesData.map((observacion) => (
                        <TableRow key={observacion.id}>
                          <TableCell className="whitespace-nowrap text-sm text-[#5C5C5C]">
                            {formatDateTime(observacion.fecha)}
                          </TableCell>
                          <TableCell className="text-sm text-[#1A1A1A]">
                            {observacion.descripcion}
                            {observacion.comentarioResolucion && (
                              <div className="mt-2 rounded-md border border-[#2E7D32]/20 bg-[#2E7D32]/5 p-2 text-xs text-[#2E7D32]">
                                <span className="font-bold">Resolución:</span> {observacion.comentarioResolucion}
                                <span className="mt-1 block text-[10px] text-[#5C5C5C]">
                                  {observacion.nombreUsuarioResolucion ?? "Usuario"} · {observacion.fechaResolucion ? formatDateTime(observacion.fechaResolucion) : ""}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className={`font-semibold ${observacion.criticidad === "CRITICA" || observacion.criticidad === "ALTA" ? "text-[#C8102E]" : "text-[#5C5C5C]"}`}>
                              {observacion.criticidad}
                            </span>
                            <span className="block text-xs text-[#5C5C5C]">
                              Vence {formatDateTime(observacion.fechaVencimiento)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-[#5C5C5C]">
                            {observacion.estado}
                          </TableCell>
                          <TableCell className="text-sm text-[#5C5C5C]">
                            {observacion.nombreResponsable ?? observacion.nombreUsuario ?? "—"}
                          </TableCell>
                          <TableCell>
                            {observacion.estado === "PENDIENTE" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setResolverIncidencia(observacion)
                                  setComentarioResolucion("")
                                }}
                              >
                                Finalizar
                              </Button>
                            ) : (
                              <span className="text-xs text-[#2E7D32]">Resuelta</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {(observacionesTotalPages > 1 || observacionesPage > 0) && (
                  <div className="mt-6 flex items-center justify-between border-t border-[#E0E0E0] pt-4">
                    <p className="text-xs text-[#5C5C5C]">
                      Página {observacionesPage + 1} de {Math.max(observacionesTotalPages, 1)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={observacionesFirst || observacionesLoading}
                        onClick={() => setObservacionesPage((current) => current - 1)}
                      >
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={observacionesLast || observacionesLoading}
                        onClick={() => setObservacionesPage((current) => current + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
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
                      {formatProjectCurrency(proyecto.presupuesto, apiProyecto?.moneda)}
                    </p>
                    {apiProyecto && (
                      <p className="mt-1 text-xs text-[#5C5C5C]">
                        Estimado: {formatProjectCurrency(apiProyecto.costoEstimado, apiProyecto.moneda)} · Real: {formatProjectCurrency(apiProyecto.costoReal, apiProyecto.moneda)}
                      </p>
                    )}
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
            {apiProyecto && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs">
                <div className="rounded bg-[#F7F7F7] p-2"><strong className="block text-base text-[#1A1A1A]">{formatPercent(apiProyecto.avancePlanificado)}</strong>Planificado</div>
                <div className="rounded bg-[#FFFDE7] p-2"><strong className="block text-base text-[#1A1A1A]">{formatPercent(apiProyecto.porcentajeAvance)}</strong>Real</div>
              </div>
            )}
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
          {apiProyecto && (
            <div className={`rounded-lg border p-5 text-sm ${budgetAlertStyle(apiProyecto.alertaPresupuesto)}`}>
              <div className="mb-2 flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> Alerta presupuestal</div>
              <p>
                {apiProyecto.alertaPresupuesto === "NORMAL" ? "Normal"
                  : apiProyecto.alertaPresupuesto === "PREVENTIVO" ? "Preventivo"
                    : apiProyecto.alertaPresupuesto === "CRITICO" ? "Crítico"
                      : "Excedido"}: {apiProyecto.porcentajePresupuestoEjecutado.toFixed(1)}% del presupuesto comprometido.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
      </PermissionGuard>
    </AppLayout >
  )
}
