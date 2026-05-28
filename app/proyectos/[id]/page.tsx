"use client"

import React, { useEffect, useMemo, useState, use } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { StatusBadge, MacroregionBadge, TypeBadge } from "@/components/ui/status-badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import {
  getProyectoById,
  getHitosByProyecto,
  getDocumentosByProyecto,
  getBitacoraByEntidad,
  hitos as allHitos
} from "@/lib/data"
import type { Hito as HitoMock, Proyecto as ProyectoMock } from "@/lib/data"
import { api, ApiError } from "@/lib/api"
import type {
  MacroregionRef,
  ProyectoResponse,
  ActividadResponse,
  UsuarioResponse,
  PageResponse,
  HitoCreate,
  HitoResponse,
  EstadoHito
} from "@/lib/types"
import {
  ChevronRight,
  Pencil,
  Download,
  Archive,
  Calendar,
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
  fuenteDatos: "api" | "mock" | "local"
}
type HitoForm = Omit<HitoDetalle, "id" | "proyectoId" | "fuenteDatos">
type ProyectoDetalle = Omit<ProyectoMock, "macroregion" | "ejeTematico" | "estado"> & {
  macroregion: string
  macroregiones?: MacroregionRef[]
  ejeTematico: string
  estado: string
  fuenteDatos: "api" | "mixto" | "mock"
}

const DIAS_ALERTA_ACTIVIDAD = 15

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

function getAlertaVencimientoActividad(actividad: {
  fechaFin: string | null
  estado: string
}) {
  if (actividad.estado === "Completada") return null
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
  if (hito.estado === "Completado") return null

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
    institucionesMiembro: [],
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
    institucionesMiembro: mockProyecto.institucionesMiembro,
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

function ApiSourceTag({
  loading,
  error,
  source,
}: {
  loading: boolean
  error: string | null
  source: ProyectoDetalle["fuenteDatos"]
}) {
  const label = loading
    ? "Sincronizando API"
    : error
      ? "Mock con API no disponible"
      : source === "mock"
        ? "Mock referencial"
        : source === "mixto"
          ? "Datos base API"
          : "API real"

  return (
    <span className="inline-flex items-center rounded-full border border-[#E0E0E0] bg-white px-2.5 py-1 text-xs font-medium text-[#5C5C5C]">
      {label}
    </span>
  )
}

export default function ProyectoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const mockProyecto = getProyectoById(id)
  const [apiProyecto, setApiProyecto] = useState<ProyectoResponse | null>(null)
  const [apiActividades, setApiActividades] = useState<ActividadResponse[]>([])
  const [usuariosSistema, setUsuariosSistema] = useState<UsuarioResponse[]>([])
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
  const [nuevoMiembroRol, setNuevoMiembroRol] = useState("Equipo T\u00e9cnico")
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

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

  // ── Actividades desde API ──
  const [actividadesApi, setActividadesApi] = useState<ActividadResponse[]>([])
  const [actividadesLoading, setActividadesLoading] = useState(true)
  const [actividadesError, setActividadesError] = useState<string | null>(null)
  const [usuariosMap, setUsuariosMap] = useState<Map<number, string>>(new Map())

  const [createActividadOpen, setCreateActividadOpen] = useState(false)
  const [creandoActividad, setCreandoActividad] = useState(false)
  const [actForm, setActForm] = useState({
    nombre: "",
    descripcion: "",
    fechaInicio: "",
    fechaFin: "",
    idResponsables: [] as number[],
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
    estado: "PENDIENTE" as "PENDIENTE" | "EN_CURSO" | "FINALIZADA",
    idResponsables: [] as number[],
  })

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
    descripcion: "",
  })

  useEffect(() => {
    let cancelled = false

    async function cargarProyecto() {
      setApiLoading(true)
      setApiError(null)
      try {
        const data = await api.get<ProyectoResponse>(`/proyectos/${id}`)
        let acts: ActividadResponse[] = []
        let users: PageResponse<UsuarioResponse> = { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, first: true, last: true }
        let teamData: { idUsuario: number; rolEnProyecto: string }[] = []
        try {
          acts = await api.get<ActividadResponse[]>(`/proyectos/${id}/actividades`)
          users = await api.get<PageResponse<UsuarioResponse>>(`/usuarios`)
          teamData = await api.get<{ idUsuario: number; rolEnProyecto: string }[]>(`/proyectos/${id}/equipo`)
        } catch (e) {
          console.error("Error al cargar actividades, usuarios o equipo", e)
        }
        if (!cancelled) {
          setApiProyecto(data)
          setApiActividades(acts)
          setUsuariosSistema(users.content)
          setApiEquipo(teamData)
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
  }, [id])

  useEffect(() => {
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
    cargarUsuarios()
    cargarHitos()

    return () => { cancelled = true }
  }, [id])

  const abrirNuevoHito = () => {
    setHitoForm(hitoFormInicial)
    setEditHito(null)
    setHitosError(null)
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
    setAddHitoOpen(true)
  }

  const guardarHito = async () => {
    if (!hitoForm.nombre.trim() || !hitoForm.fecha) {
      setHitosError("Completa el nombre y la fecha programada del hito")
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
          setHitosState(prev => [...prev, { id: newId, proyectoId: id, ...hitoForm, fuenteDatos: "local" }])
          setHitosError(`Hito guardado solo en esta sesion: ${getApiErrorMessage(error)}`)
        }
      }

      setAddHitoOpen(false)
      setEditHito(null)
      setHitoForm(hitoFormInicial)
    } catch (error) {
      setHitosError(getApiErrorMessage(error))
    } finally {
      setHitoSubmitting(false)
    }
  }

  const eliminarHito = async (hito: HitoDetalle) => {
    const previous = hitosState
    setHitosState(prev => prev.filter(item => item.id !== hito.id))

    if (hito.fuenteDatos !== "api") return

    try {
      await api.delete<void>(`/proyectos/${id}/hitos/${hito.id}`)
    } catch (error) {
      setHitosState(previous)
      setHitosError(getApiErrorMessage(error))
    }
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

  // Calculate days remaining
  const fechaFin = new Date(proyecto.fechaFin)
  const hoy = new Date()
  const diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

  const tabs = [
    { id: "resumen" as TabType, label: "Resumen" },
    { id: "actividades" as TabType, label: "Actividades" },
    { id: "hitos" as TabType, label: "Hitos y Cronograma" },
    { id: "informes" as TabType, label: "Informes y Productos" },
    { id: "equipo" as TabType, label: "Equipo" },
    { id: "bitacora" as TabType, label: "Bitácora" },
  ]

  return (
    <AppLayout>
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
            <h1 className="text-2xl font-bold text-[#1A1A1A]">{proyecto.nombre}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {(proyecto.macroregiones?.length ? proyecto.macroregiones : [{ id: 0, nombre: proyecto.macroregion }]).map((macroregion) => (
                <MacroregionBadge key={macroregion.id} macroregion={macroregion.nombre} />
              ))}
              <TypeBadge tipo={proyecto.ejeTematico} />
              <StatusBadge estado={proyecto.estado} />
              <ApiSourceTag loading={apiLoading} error={apiError} source={proyecto.fuenteDatos} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]">
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
              </DialogTrigger>
              <DialogContent className="overflow-y-auto sm:max-w-md">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!apiProyecto) {
                    setEditModalOpen(false);
                    return;
                  }
                  const formData = new FormData(e.currentTarget);
                  const statusMap: Record<string, string> = {
                    "Activo": "EN_CURSO",
                    "En riesgo": "EN_CURSO",
                    "Suspendido": "SUSPENDIDO",
                    "Cerrado": "FINALIZADO"
                  };
                  const rawEstado = formData.get("estado") as string;
                  const estadoValue = statusMap[rawEstado] || "PENDIENTE";

                  const payload = {
                    nombre: formData.get("nombre"),
                    descripcion: formData.get("descripcion"),
                    objetivoGeneral: apiProyecto.objetivoGeneral || "Sin objetivo",
                    fechaInicio: formData.get("fechaInicio") || apiProyecto.fechaInicio,
                    fechaFinEstimada: formData.get("fechaFin") || apiProyecto.fechaFinEstimada || apiProyecto.fechaFin,
                    estado: estadoValue,
                    nivelPrioridad: apiProyecto.nivelPrioridad || 1,
                    porcentajeAvance: apiProyecto.porcentajeAvance,
                    presupuesto: parseFloat(formData.get("presupuesto") as string) || 0,
                    idMacroregion: null,
                    idMacroregiones: apiProyecto.macroregiones?.map(m => m.id) || [],
                    idEjeTematico: apiProyecto.idEjeTematico || null,
                    idResponsablePrincipal: apiProyecto.idResponsablePrincipal || null,
                    idTerritorios: apiProyecto.territorios?.map(t => t.id) || []
                  };

                  try {
                    const data = await api.put<ProyectoResponse>(`/proyectos/${id}`, payload);
                    setApiProyecto(data);
                    setEditModalOpen(false);
                  } catch (err) {
                    console.error("Error updating project", err);
                  }
                }}>
                  <DialogHeader>
                    <DialogTitle>Editar Proyecto</DialogTitle>
                    <DialogDescription>
                      Modifica los datos generales del proyecto aquí. Haz clic en guardar al finalizar.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-6">
                    <div className="grid gap-2">
                      <Label htmlFor="nombre">Nombre del Proyecto</Label>
                      <Input id="nombre" name="nombre" defaultValue={proyecto.nombre} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="codigo">Código (Solo lectura)</Label>
                        <Input id="codigo" defaultValue={proyecto.codigo} disabled />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="presupuesto">Presupuesto (S/)</Label>
                        <Input id="presupuesto" name="presupuesto" type="number" defaultValue={proyecto.presupuesto} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                        <Input id="fechaInicio" name="fechaInicio" type="date" defaultValue={proyecto.fechaInicio?.split('T')[0]} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="fechaFin">Fecha de Fin</Label>
                        <Input id="fechaFin" name="fechaFin" type="date" defaultValue={proyecto.fechaFin?.split('T')[0]} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Macroregión</Label>
                        <div className="flex flex-col gap-2 rounded-md border border-[#E0E0E0] bg-[#FAFAFA] p-3">
                          {(["Todas", "Norte", "Centro", "Sur"] as const).map((region) => (
                            <label key={region} className="flex items-center gap-2 cursor-pointer opacity-70">
                              <input
                                type="checkbox"
                                disabled
                                className="h-4 w-4 rounded border-[#E0E0E0] accent-[#FFD600]"
                                defaultChecked={
                                  region === "Todas" ||
                                  (proyecto.macroregiones?.some(m => m.nombre === region) ?? proyecto.macroregion === region)
                                }
                              />
                              <span className="text-sm text-[#1A1A1A]">{region}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Estado</Label>
                        <Select name="estado" defaultValue={proyecto.estado}>
                          <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Activo">Activo</SelectItem>
                            <SelectItem value="En riesgo">En riesgo</SelectItem>
                            <SelectItem value="Suspendido">Suspendido</SelectItem>
                            <SelectItem value="Cerrado">Cerrado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="desc">Descripción</Label>
                      <Textarea id="desc" name="descripcion" defaultValue={proyecto.descripcion} rows={4} className="resize-none" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">Guardar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
              {tabs.map(tab => (
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
                        Territorios
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
                        <MockDataTag />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {proyecto.institucionesMiembro.map(i => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-[#FFD600]/10 px-3 py-1 text-xs text-[#C9A42B]">
                            <Building2 className="h-3 w-3" />
                            {i}
                          </span>
                        ))}
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
                    <Dialog open={createActividadOpen} onOpenChange={setCreateActividadOpen}>
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
                          <div className="grid gap-2">
                            <Label htmlFor="act-nombre">Nombre de la actividad</Label>
                            <Input id="act-nombre" placeholder="Ej. Taller de sensibilización" value={actForm.nombre} onChange={e => setActForm(f => ({ ...f, nombre: e.target.value }))} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="act-descripcion">Descripción</Label>
                            <Textarea id="act-descripcion" placeholder="Descripción de la actividad..." value={actForm.descripcion} onChange={e => setActForm(f => ({ ...f, descripcion: e.target.value }))} />
                          </div>
                          <div className="grid gap-2">
                            <Label>Responsable(s)</Label>
                            <div className="flex flex-wrap gap-2 rounded-md border border-[#E0E0E0] bg-white p-3 max-h-40 overflow-y-auto">
                              {Array.from(usuariosMap.entries()).length > 0 ? (
                                Array.from(usuariosMap.entries()).map(([id, nombre]) => (
                                  <label key={id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-[#E0E0E0] accent-[#FFD600]"
                                      checked={actForm.idResponsables.includes(id)}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setActForm(f => ({ ...f, idResponsables: [...f.idResponsables, id] }))
                                        } else {
                                          setActForm(f => ({ ...f, idResponsables: f.idResponsables.filter(i => i !== id) }))
                                        }
                                      }}
                                    />
                                    <span className="text-sm text-[#1A1A1A]">{nombre}</span>
                                  </label>
                                ))
                              ) : (
                                <span className="text-sm text-[#5C5C5C]">Cargando usuarios...</span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="act-inicio">Fecha de Inicio</Label>
                              <Input id="act-inicio" type="date" value={actForm.fechaInicio} onChange={e => setActForm(f => ({ ...f, fechaInicio: e.target.value }))} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="act-fin">Fecha de Fin</Label>
                              <Input id="act-fin" type="date" value={actForm.fechaFin} onChange={e => setActForm(f => ({ ...f, fechaFin: e.target.value }))} />
                            </div>
                          </div>
                          {(() => {
                            const invalida = actForm.fechaInicio && actForm.fechaFin && actForm.fechaFin < actForm.fechaInicio
                            return invalida ? <p className="text-xs text-[#C8102E]">La fecha de fin no puede ser anterior a la fecha de inicio.</p> : null
                          })()}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setCreateActividadOpen(false)}>Cancelar</Button>
                          <Button
                            className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                            disabled={!!(creandoActividad || !actForm.nombre.trim() || (actForm.fechaInicio && actForm.fechaFin && actForm.fechaFin < actForm.fechaInicio))}
                            onClick={async () => {
                              if (!actForm.nombre.trim()) return
                              if (actForm.fechaInicio && actForm.fechaFin && actForm.fechaFin < actForm.fechaInicio) return
                              setCreandoActividad(true)
                              try {
                                const creada = await api.post<ActividadResponse>("/actividades", {
                                  nombre: actForm.nombre,
                                  descripcion: actForm.descripcion || undefined,
                                  fechaInicio: actForm.fechaInicio || undefined,
                                  fechaFin: actForm.fechaFin || undefined,
                                  idProyecto: Number(id),
                                  idResponsables: actForm.idResponsables.length > 0 ? actForm.idResponsables : undefined,
                                })
                                setActividadesApi(prev => [...prev, creada])
                                setActForm({ nombre: "", descripcion: "", fechaInicio: "", fechaFin: "", idResponsables: [] })
                                setCreateActividadOpen(false)
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

                  {/* ── EDITAR ACTIVIDAD ── */}
                  <Dialog open={editActividadOpen} onOpenChange={setEditActividadOpen}>
                    <DialogContent className="overflow-y-auto sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Editar Actividad</DialogTitle>
                        <DialogDescription>Modifica los datos de la actividad seleccionada.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-6">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-nombre">Nombre de la actividad</Label>
                          <Input id="edit-nombre" placeholder="Ej. Taller de sensibilización" value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-descripcion">Descripción</Label>
                          <Textarea id="edit-descripcion" placeholder="Descripción de la actividad..." value={editForm.descripcion} onChange={e => setEditForm(f => ({ ...f, descripcion: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                          <Label>Responsable(s)</Label>
                          <div className="flex flex-wrap gap-2 rounded-md border border-[#E0E0E0] bg-white p-3 max-h-40 overflow-y-auto">
                            {Array.from(usuariosMap.entries()).length > 0 ? (
                              Array.from(usuariosMap.entries()).map(([id, nombre]) => (
                                <label key={id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-[#E0E0E0] accent-[#FFD600]"
                                    checked={editForm.idResponsables.includes(id)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setEditForm(f => ({ ...f, idResponsables: [...f.idResponsables, id] }))
                                      } else {
                                        setEditForm(f => ({ ...f, idResponsables: f.idResponsables.filter(i => i !== id) }))
                                      }
                                    }}
                                  />
                                  <span className="text-sm text-[#1A1A1A]">{nombre}</span>
                                </label>
                              ))
                            ) : (
                              <span className="text-sm text-[#5C5C5C]">Cargando usuarios...</span>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-estado">Estado</Label>
                          <Select value={editForm.estado} onValueChange={v => setEditForm(f => ({ ...f, estado: v as "PENDIENTE" | "EN_CURSO" | "FINALIZADA" }))}>
                            <SelectTrigger id="edit-estado"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                              <SelectItem value="EN_CURSO">En curso</SelectItem>
                              <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="edit-inicio">Fecha de Inicio</Label>
                            <Input id="edit-inicio" type="date" value={editForm.fechaInicio} onChange={e => setEditForm(f => ({ ...f, fechaInicio: e.target.value }))} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-fin">Fecha de Fin</Label>
                            <Input id="edit-fin" type="date" value={editForm.fechaFin} onChange={e => setEditForm(f => ({ ...f, fechaFin: e.target.value }))} />
                          </div>
                        </div>
                        {(() => {
                          const invalida = editForm.fechaInicio && editForm.fechaFin && editForm.fechaFin < editForm.fechaInicio
                          return invalida ? <p className="text-xs text-[#C8102E]">La fecha de fin no puede ser anterior a la fecha de inicio.</p> : null
                        })()}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditActividadOpen(false)}>Cancelar</Button>
                        <Button
                          className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                          disabled={!!(editandoActividad || !editForm.nombre.trim() || (editForm.fechaInicio && editForm.fechaFin && editForm.fechaFin < editForm.fechaInicio))}
                          onClick={async () => {
                            if (!editForm.nombre.trim() || !editingActividad) return
                            if (editForm.fechaInicio && editForm.fechaFin && editForm.fechaFin < editForm.fechaInicio) return
                            setEditandoActividad(true)
                            try {
                              const actualizada = await api.put<ActividadResponse>("/actividades/" + editingActividad.id, {
                                nombre: editForm.nombre,
                                descripcion: editForm.descripcion || undefined,
                                fechaInicio: editForm.fechaInicio || undefined,
                                fechaFin: editForm.fechaFin || undefined,
                                estado: editForm.estado,
                                idProyecto: editingActividad.idProyecto,
                                idResponsables: editForm.idResponsables.length > 0 ? editForm.idResponsables : undefined,
                              })
                              setActividadesApi(prev => prev.map(a => a.id === actualizada.id ? actualizada : a))
                              setEditActividadOpen(false)
                              setEditingActividad(null)
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

                  {/* ── CREAR SUBACTIVIDAD ── */}
                  <Dialog open={createSubactOpen} onOpenChange={setCreateSubactOpen}>
                    <DialogContent className="overflow-y-auto sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Nueva Subactividad</DialogTitle>
                        <DialogDescription>Añadir una subactividad a la actividad seleccionada.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-6">
                        <div className="grid gap-2">
                          <Label htmlFor="sub-nombre">Nombre de la subactividad</Label>
                          <Input id="sub-nombre" placeholder="Ej. Sesión teórica" value={subactForm.nombre} onChange={e => setSubactForm(f => ({ ...f, nombre: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="sub-descripcion">Descripción</Label>
                          <Textarea id="sub-descripcion" placeholder="Descripción..." value={subactForm.descripcion} onChange={e => setSubactForm(f => ({ ...f, descripcion: e.target.value }))} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="sub-resp">Responsable</Label>
                          <Select value={subactForm.idResponsable} onValueChange={v => setSubactForm(f => ({ ...f, idResponsable: v }))}>
                            <SelectTrigger id="sub-resp"><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                            <SelectContent>
                              {Array.from(usuariosMap.entries()).map(([id, nombre]) => (
                                <SelectItem key={id} value={String(id)}>{nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="sub-inicio">Fecha de Inicio</Label>
                            <Input id="sub-inicio" type="date" value={subactForm.fechaInicio} onChange={e => setSubactForm(f => ({ ...f, fechaInicio: e.target.value }))} />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="sub-fin">Fecha de Fin</Label>
                            <Input id="sub-fin" type="date" value={subactForm.fechaFin} onChange={e => setSubactForm(f => ({ ...f, fechaFin: e.target.value }))} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="sub-presu">Presupuesto (S/)</Label>
                            <Input id="sub-presu" type="number" min="0" value={subactForm.presupuesto} onChange={e => setSubactForm(f => ({ ...f, presupuesto: e.target.value }))} />
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
                        {(() => {
                          const invalida = subactForm.fechaInicio && subactForm.fechaFin && subactForm.fechaFin < subactForm.fechaInicio
                          return invalida ? <p className="text-xs text-[#C8102E]">La fecha de fin no puede ser anterior a la fecha de inicio.</p> : null
                        })()}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateSubactOpen(false)}>Cancelar</Button>
                        <Button
                          className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                          disabled={!!(creandoSubact || !subactForm.nombre.trim() || !subactForm.idResponsable || (subactForm.fechaInicio && subactForm.fechaFin && subactForm.fechaFin < subactForm.fechaInicio))}
                          onClick={async () => {
                            if (!subactForm.nombre.trim() || !subactForm.idResponsable || !targetActividadId) return
                            if (subactForm.fechaInicio && subactForm.fechaFin && subactForm.fechaFin < subactForm.fechaInicio) return
                            setCreandoSubact(true)
                            try {
                              const nuevaSub: SubactividadCreate = {
                                nombre: subactForm.nombre,
                                idResponsable: Number(subactForm.idResponsable),
                                presupuesto: subactForm.presupuesto ? Number(subactForm.presupuesto) : undefined,
                                hombresInvolucrados: subactForm.hombresInvolucrados ? Number(subactForm.hombresInvolucrados) : undefined,
                                mujeresInvolucradas: subactForm.mujeresInvolucradas ? Number(subactForm.mujeresInvolucradas) : undefined,
                                fechaInicio: subactForm.fechaInicio || undefined,
                                fechaFin: subactForm.fechaFin || undefined,
                                descripcion: subactForm.descripcion || undefined,
                              }
                              const creada = await api.post<SubactividadResponse>(`/actividades/${targetActividadId}/subactividades`, nuevaSub)
                              setActividadesApi(prev => prev.map(a => a.id === targetActividadId ? { ...a, subactividades: [...(a.subactividades || []), creada] } : a))
                              setCreateSubactOpen(false)
                              setSubactForm({
                                nombre: "", idResponsable: "", presupuesto: "", hombresInvolucrados: "", mujeresInvolucradas: "", fechaInicio: "", fechaFin: "", descripcion: ""
                              })
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
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#E0E0E0]">
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Actividad</th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Responsable</th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Fecha</th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Avance</th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Estado</th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0E0E0]">
                          {actividadesConAlertas.map(act => (
                            <React.Fragment key={act.id}>
                              <tr className={
                                act.alertaVencimiento?.tipo === "vencida"
                                  ? "bg-[#C8102E]/5 hover:bg-[#C8102E]/10"
                                  : act.alertaVencimiento
                                    ? "bg-[#F57C00]/5 hover:bg-[#F57C00]/10"
                                    : "hover:bg-[#FFFDE7]"
                              }>
                                <td className="py-3 text-sm font-medium text-[#1A1A1A]">
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
                                <td className="py-3 text-sm text-[#5C5C5C]">{act.responsableDisplay}</td>
                                <td className="py-3 text-xs text-[#5C5C5C]">
                                  {act.fechaFin ? act.fechaFin.split('-').reverse().join('/') : "—"}
                                </td>
                                <td className="py-3">
                                  <div className="w-20">
                                    <ProgressBar value={0} size="sm" />
                                  </div>
                                </td>
                                <td className="py-3">
                                  <StatusBadge estado={act.estado} />
                                </td>
                                <td className="py-3">
                                  <button
                                    className="flex items-center gap-1 rounded-lg border border-[#E0E0E0] bg-white px-2 py-1 text-xs font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]"
                                    onClick={() => {
                                      setEditingActividad(act)
                                      setEditForm({
                                        nombre: act.nombre,
                                        descripcion: act.descripcion ?? "",
                                        fechaInicio: act.fechaInicio ?? "",
                                        fechaFin: act.fechaFin ?? "",
                                        estado: act.estado,
                                        idResponsables: [...act.idResponsables],
                                      })
                                      setEditActividadOpen(true)
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                    Editar
                                  </button>
                                </td>
                              </tr>
                              {/* Render Subactividades */}
                              {act.subactividades?.map((sub) => (
                                <tr key={`sub-${sub.id}`} className="bg-[#FAFAFA] border-none">
                                  <td className="py-2 pl-8 text-xs font-medium text-[#5C5C5C] relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-px bg-[#E0E0E0]" />
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[#1A1A1A] before:content-[''] before:absolute before:left-4 before:top-4 before:w-3 before:h-px before:bg-[#E0E0E0]">
                                        {sub.nombre}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2 text-xs text-[#5C5C5C]">{sub.responsable || "—"}</td>
                                  <td className="py-2 text-xs text-[#5C5C5C]">
                                    {sub.fechaFin ? sub.fechaFin.split('-').reverse().join('/') : "—"}
                                  </td>
                                  <td className="py-2">
                                    <span className="text-xs text-[#5C5C5C]">
                                      {sub.presupuesto ? `S/ ${sub.presupuesto}` : "—"}
                                    </span>
                                  </td>
                                  <td className="py-2" colSpan={2}>
                                    {/* Action buttons o badge if needed */}
                                  </td>
                                </tr>
                              ))}
                              {/* Agregar subactividad */}
                              <tr className="bg-[#FAFAFA] border-none">
                                <td colSpan={6} className="py-2 pl-8 relative">
                                  <div className="absolute left-4 top-0 bottom-1/2 w-px bg-[#E0E0E0]" />
                                  <div className="flex items-center gap-2 relative before:content-[''] before:absolute before:-left-4 before:top-3 before:w-3 before:h-px before:bg-[#E0E0E0]">
                                    <button
                                      className="flex items-center gap-1 text-xs font-medium text-[#C9A42B] hover:text-[#1A1A1A] transition-colors"
                                      onClick={() => {
                                        setTargetActividadId(act.id)
                                        setCreateSubactOpen(true)
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                      Agregar subactividad
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-sm text-[#5C5C5C]">
                    No hay actividades registradas para este proyecto.
                  </div>
                )
              ) : null}
            </div>
              )}

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
                <Dialog open={addHitoOpen} onOpenChange={setAddHitoOpen}>
                  <DialogContent className="overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editHito ? "Editar Hito" : "Nuevo Hito"}</DialogTitle>
                      <DialogDescription>
                        {editHito ? "Modifica los datos del hito seleccionado." : "Registra un nuevo hito para el cronograma."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="hito-nombre">Nombre del hito</Label>
                        <Input
                          id="hito-nombre"
                          placeholder="Ej. Entrega de informe final"
                          value={hitoForm.nombre}
                          onChange={e => setHitoForm(f => ({ ...f, nombre: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hito-descripcion">Descripcion</Label>
                        <Textarea
                          id="hito-descripcion"
                          placeholder="Objetivo o alcance del hito"
                          value={hitoForm.descripcion}
                          onChange={e => setHitoForm(f => ({ ...f, descripcion: e.target.value }))}
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hito-fecha">Fecha clave</Label>
                        <Input
                          id="hito-fecha"
                          type="date"
                          value={hitoForm.fecha}
                          onChange={e => setHitoForm(f => ({ ...f, fecha: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hito-estado">Estado</Label>
                        <Select
                          value={hitoForm.estado}
                          onValueChange={v => setHitoForm(f => ({ ...f, estado: v as HitoEstadoUi }))}
                        >
                          <SelectTrigger id="hito-estado"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                            <SelectItem value="En curso">En curso</SelectItem>
                            <SelectItem value="Finalizado">Finalizado</SelectItem>
                          </SelectContent>
                        </Select>
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

                {hitosConAlertas.length > 0 ? (
                  <>
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
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#E0E0E0]" />
                      <div className="space-y-6">
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
                                    onClick={() => eliminarHito(hito)}
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
                            <Label htmlFor="miembro-rol">Rol en el proyecto</Label>
                            <Select value={nuevoMiembroRol} onValueChange={setNuevoMiembroRol}>
                              <SelectTrigger id="miembro-rol">
                                <SelectValue placeholder="Seleccione un rol" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Equipo Técnico">Equipo Técnico</SelectItem>
                                <SelectItem value="Coordinador">Coordinador</SelectItem>
                                <SelectItem value="Asesor">Asesor</SelectItem>
                                <SelectItem value="Observador">Observador</SelectItem>
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
                    {new Date(proyecto.fechaInicio).toLocaleDateString("es-PE")} - {new Date(proyecto.fechaFin).toLocaleDateString("es-PE")}
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
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#5C5C5C] mb-4">
              Avance
            </h3>
            <div className="text-center mb-4">
              <span className="text-4xl font-bold text-[#1A1A1A]">{proyecto.avance}%</span>
            </div>
            <ProgressBar value={proyecto.avance} showLabel={false} size="lg" />
          </div>

          {/* Alerts card */}
          {proyecto.estado === "En riesgo" && (
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
    </AppLayout >
  )
}
