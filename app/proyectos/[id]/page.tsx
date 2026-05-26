"use client"

import React, { useEffect, useMemo, useState, use } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { StatusBadge, MacroregionBadge, TypeBadge } from "@/components/ui/status-badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import { 
  getProyectoById, 
  getActividadesByProyecto, 
  getHitosByProyecto,
  getDocumentosByProyecto,
  getBitacoraByEntidad,
  hitos as allHitos,
  actividades as allActividades
} from "@/lib/data"
import type { Proyecto as ProyectoMock } from "@/lib/data"
import { api, ApiError } from "@/lib/api"
import type { MacroregionRef, ProyectoResponse } from "@/lib/types"
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
  XCircle,
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
  fechaFin: string
  estado: string
}) {
  if (actividad.estado === "Completada") return null

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
  const [nuevoMiembroNombre, setNuevoMiembroNombre] = useState("")
  const [nuevoMiembroRol, setNuevoMiembroRol] = useState("Equipo T\u00e9cnico")
  const [addMemberOpen, setAddMemberOpen] = useState(false)

  // State for hitos
  const hitosData = getHitosByProyecto(id)
  const [hitosState, setHitosState] = useState(
    () => hitosData.map(h => ({ ...h }))
  )
  const [addHitoOpen, setAddHitoOpen] = useState(false)
  const [editHito, setEditHito] = useState<typeof hitosState[0] | null>(null)
  const [hitoForm, setHitoForm] = useState({ nombre: "", fecha: "", estado: "Pendiente" as "Completado" | "Pendiente" | "Vencido" })

  useEffect(() => {
    let cancelled = false

    async function cargarProyecto() {
      setApiLoading(true)
      setApiError(null)
      try {
        const data = await api.get<ProyectoResponse>(`/proyectos/${id}`)
        if (!cancelled) {
          setApiProyecto(data)
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

  const actividadesBase = getActividadesByProyecto(id)
  const actividades = actividadesBase.map(act => {
    const cofinanciadasTargetingThisAct = allActividades
      .flatMap(a => a.subactividades?.map(s => ({ ...s, parentActividad: a })) || [])
      .filter(s => s.cofinanciadoPor?.some(c => c.actividadId === act.id))
      .map(s => {
         const cofundingData = s.cofinanciadoPor?.find(c => c.actividadId === act.id);
         return {
           ...s,
           isCofinancedIncoming: true,
           montoCofinanciado: cofundingData?.monto || 0
         }
      });
      
    return {
      ...act,
      subactividades: [...(act.subactividades || []), ...cofinanciadasTargetingThisAct]
    }
  });
  const actividadesConAlertas = actividades
    .map((actividad) => ({
      ...actividad,
      alertaVencimiento: getAlertaVencimientoActividad(actividad),
    }))
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

  const hitos = hitosData
  const documentos = getDocumentosByProyecto(id)
  const bitacora = getBitacoraByEntidad(id)

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
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]">
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
              </DialogTrigger>
              <DialogContent className="overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar Proyecto</DialogTitle>
                  <DialogDescription>
                    Modifica los datos generales del proyecto aquí. Haz clic en guardar al finalizar.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre del Proyecto</Label>
                    <Input id="nombre" defaultValue={proyecto.nombre} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="codigo">Código</Label>
                      <Input id="codigo" defaultValue={proyecto.codigo} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="presupuesto">Presupuesto (S/)</Label>
                      <Input id="presupuesto" type="number" defaultValue={proyecto.presupuesto} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Macroregión</Label>
                      <div className="flex flex-col gap-2 rounded-md border border-[#E0E0E0] bg-[#FAFAFA] p-3">
                        {(["Todas", "Norte", "Centro", "Sur"] as const).map((region) => (
                          <label key={region} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
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
                      <Select defaultValue={proyecto.estado}>
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
                    <Textarea id="desc" defaultValue={proyecto.descripcion} rows={4} className="resize-none" />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">Guardar</Button>
                  </DialogClose>
                </DialogFooter>
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
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
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
                      <MockDataTag />
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#C9A42B]">
                          <Plus className="h-3.5 w-3.5" />
                          Agregar actividad
                        </button>
                      </DialogTrigger>
                      <DialogContent className="overflow-y-auto sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Nueva Actividad</DialogTitle>
                          <DialogDescription>Deltalle la nueva actividad a registrar para este proyecto.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-6">
                          <div className="grid gap-2">
                            <Label htmlFor="act-nombre">Nombre de la actividad</Label>
                            <Input id="act-nombre" placeholder="Ej. Taller de sensibilización" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="act-responsable">Responsable</Label>
                            <Input id="act-responsable" placeholder="Pedro Mendoza" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="act-inicio">Fecha de Inicio</Label>
                              <Input id="act-inicio" type="date" />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="act-fin">Fecha de Fin</Label>
                              <Input id="act-fin" type="date" />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">Crear actividad</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {actividadesConAlertas.length > 0 ? (
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
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                              Actividad
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                              Responsable
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                              Fecha
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                              Avance
                            </th>
                            <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                              Estado
                            </th>
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
                                      <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                        act.alertaVencimiento.tipo === "vencida"
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
                                <td className="py-3 text-sm text-[#5C5C5C]">{act.responsable}</td>
                                <td className="py-3 text-xs text-[#5C5C5C]">
                                  {new Date(act.fechaFin).toLocaleDateString("es-PE")}
                                </td>
                                <td className="py-3">
                                  <div className="w-20">
                                    <ProgressBar value={act.avance} size="sm" />
                                  </div>
                                </td>
                                <td className="py-3">
                                  <StatusBadge estado={act.estado} />
                                </td>
                              </tr>
                              {act.subactividades && act.subactividades.map(sub => (
                                <tr key={sub.id} className="bg-[#FAFAFA] border-none group">
                                  <td className="py-3 pl-8 text-sm text-[#5C5C5C] relative">
                                     <div className="absolute left-3 top-0 bottom-0 w-px bg-[#E0E0E0] group-last:bottom-1/2"></div>
                                     <div className="absolute left-3 top-1/2 w-4 h-px bg-[#E0E0E0]"></div>
                                     <div className="flex items-center gap-2 relative z-10 bg-[#FAFAFA] pr-2">
                                       <Circle className="h-2 w-2 fill-[#C9A42B] text-[#C9A42B]" />
                                       <span className="truncate max-w-[200px]" title={sub.nombre}>{sub.nombre}</span>
                                       {(sub as any).isCofinancedIncoming ? (
                                         <span className="ml-2 inline-flex shrink-0 items-center rounded-sm bg-[#F7F7F7] px-2 py-0.5 text-[10px] font-bold text-[#5C5C5C] border border-[#E0E0E0]" title={`Originario de: ${(sub as any).parentActividad.nombre}`}>
                                           Compartido (S/ {(sub as any).montoCofinanciado.toLocaleString()})
                                         </span>
                                       ) : (() => {
                                         const propioRaw = sub.presupuesto ?? 0
                                         const cofinanciado = (sub.cofinanciadoPor ?? []).reduce((acc, c) => acc + c.monto, 0)
                                         const total = propioRaw + cofinanciado
                                         return total > 0 ? (
                                           <span
                                             className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-sm bg-[#FFFDE7] px-2 py-0.5 text-[10px] font-bold text-[#C9A42B] border border-[#FFD600]"
                                             title={`Presupuesto propio: S/ ${propioRaw.toLocaleString()} | Cofinanciado: S/ ${cofinanciado.toLocaleString()}`}
                                           >
                                             <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                             S/ {total.toLocaleString()}
                                             {cofinanciado > 0 && <span className="opacity-60 font-normal">(+{cofinanciado.toLocaleString()} cofinac.)</span>}
                                           </span>
                                         ) : null
                                       })()}
                                     </div>
                                  </td>
                                  <td className="py-3 text-sm text-[#5C5C5C]">{sub.responsable}</td>
                                  <td colSpan={3} className="py-2 px-2">
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex-1">
                                        {sub.archivosEvidencia && sub.archivosEvidencia.length > 0 ? (
                                          <div className="flex items-center gap-4">
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <button className="flex items-center gap-1.5 text-xs font-medium text-[#2E7D32] bg-[#2E7D32]/10 border border-[#2E7D32]/20 shadow-sm rounded-md px-3 py-1.5 hover:bg-[#2E7D32]/20 transition-colors">
                                                  <CheckCircle2 className="w-3.5 h-3.5"/> Archivos anexados ({sub.archivosEvidencia.length})
                                                </button>
                                              </DialogTrigger>
                                              <DialogContent className="overflow-y-auto sm:max-w-md">
                                                <DialogHeader>
                                                  <DialogTitle>Gestionar Evidencias</DialogTitle>
                                                  <DialogDescription>Archivos cargados en esta subactividad.</DialogDescription>
                                                </DialogHeader>
                                                <div className="flex flex-col gap-3 py-2">
                                                  {(sub as any).archivosEvidencia.map((file: any) => (
                                                    <div key={file.id} className="flex items-center justify-between p-2 rounded border border-[#E0E0E0] bg-[#FAFAFA]">
                                                      <span className="text-sm text-[#1A1A1A] truncate w-64" title={file.nombre}>{file.nombre}</span>
                                                      <button className="text-[#C9A42B] hover:text-[#FFD600] text-xs font-semibold px-2">Descargar</button>
                                                    </div>
                                                  ))}
                                                </div>
                                                <div className="border-t border-[#E0E0E0] pt-4 mt-2">
                                                  <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Anexar nuevo archivo</h4>
                                                  <div className="grid gap-2">
                                                    <Input type="file" />
                                                  </div>
                                                </div>
                                                <DialogFooter className="mt-4">
                                                  <DialogClose asChild><Button variant="outline">Cerrar</Button></DialogClose>
                                                  <DialogClose asChild><Button className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">Guardar</Button></DialogClose>
                                                </DialogFooter>
                                              </DialogContent>
                                            </Dialog>
                                            <div className="flex gap-3 text-xs text-[#5C5C5C] bg-white px-2 py-1.5 rounded border border-[#E0E0E0] shadow-sm">
                                                <span title="Hombres involucrados" className="flex items-center gap-1 font-medium"><User className="w-3 h-3 text-[#1A1A1A]"/> {sub.hombresInvolucrados || 0} H</span>
                                                <span className="text-[#E0E0E0]">|</span>
                                                <span title="Mujeres involucradas" className="flex items-center gap-1 font-medium"><User className="w-3 h-3 text-[#1A1A1A]"/> {sub.mujeresInvolucradas || 0} M</span>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <button className="flex items-center gap-1.5 text-xs font-medium text-[#1A1A1A] bg-white border border-[#E0E0E0] shadow-sm rounded-md px-3 py-1.5 hover:bg-[#F7F7F7] hover:border-[#1A1A1A] transition-colors">
                                                  <Download className="w-3.5 h-3.5 rotate-180"/> Anexar evidencia
                                                </button>
                                              </DialogTrigger>
                                              <DialogContent className="overflow-y-auto sm:max-w-md">
                                                <DialogHeader>
                                                  <DialogTitle>Anexar Evidencia</DialogTitle>
                                                  <DialogDescription>Suba documentos o reporte asistencia relacionados a esta subactividad.</DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-6">
                                                  <div className="grid gap-2">
                                                    <Label htmlFor={`file-new-${sub.id}`}>Archivo de soporte (PDF, Docx)</Label>
                                                    <Input id={`file-new-${sub.id}`} type="file" multiple />
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                      <Label htmlFor={`hombres-${sub.id}`}>Hombres Asistentes</Label>
                                                      <Input id={`hombres-${sub.id}`} type="number" placeholder="Ej. 15" />
                                                    </div>
                                                    <div className="grid gap-2">
                                                      <Label htmlFor={`mujeres-${sub.id}`}>Mujeres Asistentes</Label>
                                                      <Input id={`mujeres-${sub.id}`} type="number" placeholder="Ej. 20" />
                                                    </div>
                                                  </div>
                                                </div>
                                                <DialogFooter>
                                                  <DialogClose asChild>
                                                    <Button variant="outline">Cancelar</Button>
                                                  </DialogClose>
                                                  <DialogClose asChild>
                                                    <Button className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">Guardar</Button>
                                                  </DialogClose>
                                                </DialogFooter>
                                              </DialogContent>
                                            </Dialog>
                                            <div className="flex gap-2">
                                              <div className="relative">
                                                <User className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
                                                <input type="number" placeholder="H" className="w-16 h-7 text-xs border border-[#E0E0E0] shadow-sm rounded-md pl-6 pr-2 outline-none focus:border-[#FFD600]" title="Cantidad de Hombres" />
                                              </div>
                                              <div className="relative">
                                                <User className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
                                                <input type="number" placeholder="M" className="w-16 h-7 text-xs border border-[#E0E0E0] shadow-sm rounded-md pl-6 pr-2 outline-none focus:border-[#FFD600]" title="Cantidad de Mujeres" />
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex shrink-0 items-center justify-end">
                                        {!(sub as any).isCofinancedIncoming && (
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <button className="flex items-center gap-1 text-xs font-medium text-[#C9A42B] bg-white border border-[#E0E0E0] shadow-sm rounded-md px-2 py-1 hover:bg-[#FFFDE7] hover:border-[#FFD600] transition-colors" title="Gestionar Cofinanciamiento">
                                                <DollarSign className="w-3.5 h-3.5" />
                                                Cofinanciar
                                              </button>
                                            </DialogTrigger>
                                            <DialogContent className="overflow-y-auto sm:max-w-md">
                                              <DialogHeader>
                                                <DialogTitle>Cofinanciar Subactividad</DialogTitle>
                                                <DialogDescription>
                                                  Asigna presupuesto proveniente de otras actividades institucionales vinculadas.
                                                </DialogDescription>
                                              </DialogHeader>
                                              <div className="grid gap-4 py-6">
                                                <div className="grid gap-2">
                                                  <Label>Actividad Origen (Fondo)</Label>
                                                  <Select>
                                                    <SelectTrigger><SelectValue placeholder="Seleccione la actividad matriz" /></SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="6">Mapeo de actores - Partida 3</SelectItem>
                                                      <SelectItem value="8">Incidencia Política - Partida 4</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                  <Label htmlFor="monto">Monto asignado (S/)</Label>
                                                  <Input id="monto" type="number" placeholder="Ej. 2500" />
                                                </div>
                                              </div>
                                              <DialogFooter>
                                                <DialogClose asChild>
                                                  <Button variant="outline">Cancelar</Button>
                                                </DialogClose>
                                                <DialogClose asChild>
                                                  <Button className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">Guardar</Button>
                                                </DialogClose>
                                              </DialogFooter>
                                            </DialogContent>
                                          </Dialog>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-[#FAFAFA] border-none group">
                                <td colSpan={5} className="py-3 pl-8 relative">
                                  <div className="absolute left-3 top-0 bottom-1/2 w-px bg-[#E0E0E0]"></div>
                                  <div className="absolute left-3 top-1/2 w-4 h-px bg-[#E0E0E0]"></div>
                                  <div className="flex items-center relative z-10 bg-[#FAFAFA] pr-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <button className="flex items-center gap-1.5 text-xs font-bold text-[#C9A42B] hover:text-[#1A1A1A] transition-colors py-1 pl-2 ml-1">
                                          <Plus className="h-3 w-3" /> Agregar subactividad
                                        </button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
                                        <DialogHeader>
                                          <DialogTitle>Nueva Subactividad</DialogTitle>
                                          <DialogDescription>Añada una subactividad a '{act.nombre}'.</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                          {/* Nombre */}
                                          <div className="grid gap-2">
                                            <Label>Nombre de la Subactividad <span className="text-red-500">*</span></Label>
                                            <Input placeholder="Ej. Taller grupal de sensibilización" />
                                          </div>
                                          {/* Responsable */}
                                          <div className="grid gap-2">
                                            <Label>Responsable <span className="text-red-500">*</span></Label>
                                            <Input placeholder="Nombre del encargado" />
                                          </div>
                                          {/* Fechas */}
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                              <Label>Fecha de Inicio</Label>
                                              <Input type="date" />
                                            </div>
                                            <div className="grid gap-2">
                                              <Label>Fecha de Fin</Label>
                                              <Input type="date" />
                                            </div>
                                          </div>
                                          {/* Presupuesto */}
                                          <div className="grid gap-2">
                                            <Label>Presupuesto Asignado (S/)</Label>
                                            <Input type="number" placeholder="Ej. 2500" />
                                          </div>
                                          {/* Participantes */}
                                          <div className="grid gap-1.5">
                                            <Label>Participantes estimados</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="grid gap-2">
                                                <Label className="text-xs text-[#5C5C5C] font-normal">Hombres</Label>
                                                <Input type="number" placeholder="Ej. 10" />
                                              </div>
                                              <div className="grid gap-2">
                                                <Label className="text-xs text-[#5C5C5C] font-normal">Mujeres</Label>
                                                <Input type="number" placeholder="Ej. 15" />
                                              </div>
                                            </div>
                                          </div>
                                          {/* Descripcion */}
                                          <div className="grid gap-2">
                                            <Label>Descripción / Observaciones</Label>
                                            <textarea
                                              className="min-h-[80px] w-full rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm outline-none focus:border-[#FFD600] resize-none"
                                              placeholder="Descripción corta de la subactividad, objetivos o contexto..."
                                            />
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                                          <DialogClose asChild><Button className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]">Guardar</Button></DialogClose>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
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
                  )}
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
                      <MockDataTag />
                    </div>
                    <button
                      onClick={() => {
                        setHitoForm({ nombre: "", fecha: "", estado: "Pendiente" })
                        setEditHito(null)
                        setAddHitoOpen(true)
                      }}
                      className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#C9A42B] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar hito
                    </button>
                  </div>

                  {/* Dialog agregar / editar hito */}
                  <Dialog open={addHitoOpen} onOpenChange={setAddHitoOpen}>
                    <DialogContent className="sm:max-w-sm">
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
                          <Label htmlFor="hito-fecha">Fecha</Label>
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
                            onValueChange={v => setHitoForm(f => ({ ...f, estado: v as "Completado" | "Pendiente" | "Vencido" }))}
                          >
                            <SelectTrigger id="hito-estado"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pendiente">Pendiente</SelectItem>
                              <SelectItem value="Completado">Completado</SelectItem>
                              <SelectItem value="Vencido">Vencido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddHitoOpen(false)}>Cancelar</Button>
                        <Button
                          className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                          onClick={() => {
                            if (!hitoForm.nombre.trim() || !hitoForm.fecha) return
                            if (editHito) {
                              setHitosState(prev => prev.map(h => h.id === editHito.id ? { ...h, ...hitoForm } : h))
                            } else {
                              const newId = `hito-${Date.now()}`
                              setHitosState(prev => [...prev, { id: newId, proyectoId: id, ...hitoForm }])
                            }
                            setAddHitoOpen(false)
                          }}
                        >
                          {editHito ? "Guardar cambios" : "Crear hito"}
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
                            <div className={`absolute left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full ${
                              hito.estado === "Completado" ? "bg-[#2E7D32]" :
                              hito.estado === "Vencido" || hito.alertaVencimiento?.tipo === "vencido" ? "bg-[#C8102E]" :
                              hito.alertaVencimiento ? "bg-[#F57C00]" : "bg-[#E0E0E0]"
                            }`}>
                              {hito.estado === "Completado" ? (
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              ) : hito.estado === "Vencido" || hito.alertaVencimiento?.tipo === "vencido" ? (
                                <XCircle className="h-3 w-3 text-white" />
                              ) : hito.alertaVencimiento ? (
                                <Clock className="h-3 w-3 text-white" />
                              ) : (
                                <Circle className="h-3 w-3 text-[#5C5C5C]" />
                              )}
                            </div>
                            <div className={`flex-1 rounded-lg border p-4 transition-colors ${
                              hito.alertaVencimiento?.tipo === "vencido"
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
                                  {hito.alertaVencimiento && (
                                    <span className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                      hito.alertaVencimiento.tipo === "vencido"
                                        ? "border-[#C8102E]/20 bg-[#C8102E]/10 text-[#C8102E]"
                                        : "border-[#F57C00]/20 bg-[#F57C00]/10 text-[#F57C00]"
                                    }`}>
                                      {hito.alertaVencimiento.tipo === "vencido" ? (
                                        <AlertTriangle className="h-3 w-3" />
                                      ) : (
                                        <Clock className="h-3 w-3" />
                                      )}
                                      {hito.alertaVencimiento.label}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <StatusBadge estado={hito.estado} />
                                  <button
                                    onClick={() => {
                                      setEditHito(hito)
                                      setHitoForm({ nombre: hito.nombre, fecha: hito.fecha, estado: hito.estado })
                                      setAddHitoOpen(true)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex h-7 w-7 items-center justify-center rounded-full text-[#5C5C5C] hover:bg-[#F7F7F7]"
                                    title="Editar hito"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setHitosState(prev => prev.filter(h => h.id !== hito.id))}
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
                      <MockDataTag />
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
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="miembro-nombre">Nombre completo</Label>
                            <Input
                              id="miembro-nombre"
                              placeholder="Ej. Juan Pérez"
                              value={nuevoMiembroNombre}
                              onChange={e => setNuevoMiembroNombre(e.target.value)}
                            />
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
                            <Button variant="outline">Cancelar</Button>
                          </DialogClose>
                          <Button
                            className="bg-[#FFD600] text-[#1A1A1A] hover:bg-[#C9A42B]"
                            onClick={() => {
                              if (nuevoMiembroNombre.trim()) {
                                setEquipo(prev => [...prev, { nombre: nuevoMiembroNombre.trim(), rol: nuevoMiembroRol }])
                                setNuevoMiembroNombre("")
                                setNuevoMiembroRol("Equipo Técnico")
                                setAddMemberOpen(false)
                              }
                            }}
                          >
                            Agregar
                          </Button>
                        </DialogFooter>
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
                    {equipo.map((miembro, idx) => (
                      <div key={idx} className="group relative rounded-lg border border-[#E0E0E0] p-4 hover:border-[#FFD600] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F7]">
                            <User className="h-5 w-5 text-[#5C5C5C]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1A1A1A] truncate">{miembro.nombre}</p>
                            <p className="text-xs text-[#5C5C5C]">{miembro.rol}</p>
                          </div>
                          <button
                            onClick={() => setEquipo(prev => prev.filter((_, i) => i !== idx))}
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
                    <p className={`text-sm font-semibold ${
                      diasRestantes < 30 ? "text-[#C8102E]" :
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
    </AppLayout>
  )
}
