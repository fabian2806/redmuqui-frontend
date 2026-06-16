"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/ui/status-badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import { ApiError, api } from "@/lib/api"
import {
  obtenerActividadReciente,
  obtenerActividadesPorEstado,
  obtenerAvanceProyectos,
  obtenerDocumentosPorEstado,
  obtenerDocumentosPorTipo,
  obtenerDocumentosRecientes,
  obtenerIndicadores,
  obtenerProyectosPorEje,
  obtenerProyectosPorEstado,
  obtenerResumenMacroregiones,
  type ActividadReciente,
  type Conteo,
  type ConteoPresupuesto,
  type DocumentoReciente,
  type Indicadores,
  type MacroregionResumen,
  type ProyectoAvance,
} from "@/lib/reportes"
import type { Institucion } from "@/lib/types"
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FolderOpen,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { SemaforoPortafolio } from "@/components/reportes/semaforo-portafolio"

const ESTADO_COLORES = ["bg-blue-500", "bg-green-500", "bg-yellow-500"]

function porcentaje(cantidad: number, total: number) {
  return total > 0 ? (cantidad / total) * 100 : 0
}

function monedaCompacta(valor: number | null, loading: boolean) {
  if (loading || valor === null) return "..."
  if (valor >= 1_000_000) return `S/ ${(valor / 1_000_000).toFixed(1)}M`
  if (valor >= 1_000) return `S/ ${(valor / 1_000).toFixed(0)}K`
  return `S/ ${valor.toLocaleString("es-PE")}`
}

function numero(valor: number | null, loading: boolean) {
  return loading || valor === null ? "..." : valor.toLocaleString("es-PE")
}

function fechaHora(valor: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(valor))
}

function iconoActividad(entrada: ActividadReciente) {
  const entidad = entrada.entidadReferenciada?.toLowerCase() ?? ""
  if (entidad.includes("proyecto")) return <CheckCircle2 className="h-4 w-4" />
  if (entidad.includes("documento") || entidad.includes("informe")) return <FileText className="h-4 w-4" />
  if (entidad.includes("actividad")) return <Clock className="h-4 w-4" />
  if (entrada.tipoAccion.toLowerCase().includes("incid")) return <AlertCircle className="h-4 w-4" />
  return <Users className="h-4 w-4" />
}

function tonoActividad(entrada: ActividadReciente) {
  const entidad = entrada.entidadReferenciada?.toLowerCase() ?? ""
  if (entidad.includes("proyecto")) return "bg-green-100 text-green-600"
  if (entidad.includes("documento") || entidad.includes("informe")) return "bg-blue-100 text-blue-600"
  if (entidad.includes("actividad")) return "bg-purple-100 text-purple-600"
  if (entrada.tipoAccion.toLowerCase().includes("incid")) return "bg-red-100 text-red-600"
  return "bg-gray-100 text-gray-600"
}

function EmptyState({ children }: { children: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
}

export default function ReportesPage() {
  const { hasPermission, loading: authLoading } = useAuth()
  const puedeExportarReportes = hasPermission("REPORTES_EXPORT")

  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("2024")
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [totalInstituciones, setTotalInstituciones] = useState<number | null>(null)
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [proyectosPorEstado, setProyectosPorEstado] = useState<Conteo[]>([])
  const [actividadesPorEstado, setActividadesPorEstado] = useState<Conteo[]>([])
  const [proyectosPorEje, setProyectosPorEje] = useState<ConteoPresupuesto[]>([])
  const [avanceProyectos, setAvanceProyectos] = useState<ProyectoAvance[]>([])
  const [documentosPorTipo, setDocumentosPorTipo] = useState<Conteo[]>([])
  const [documentosPorEstado, setDocumentosPorEstado] = useState<Conteo[]>([])
  const [documentosRecientes, setDocumentosRecientes] = useState<DocumentoReciente[]>([])
  const [resumenMacroregiones, setResumenMacroregiones] = useState<MacroregionResumen[]>([])
  const [actividadReciente, setActividadReciente] = useState<ActividadReciente[]>([])
  const [loadingReportes, setLoadingReportes] = useState(true)
  const [errorReportes, setErrorReportes] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    async function cargarReportes() {
      setLoadingReportes(true)
      setErrorReportes(null)

      try {
        const resultados = await Promise.allSettled([
          obtenerIndicadores(),
          api.get<Institucion[]>("/instituciones"),
          obtenerProyectosPorEstado(),
          obtenerActividadesPorEstado(),
          obtenerProyectosPorEje(),
          obtenerAvanceProyectos(),
          obtenerDocumentosPorTipo(),
          obtenerDocumentosPorEstado(),
          obtenerDocumentosRecientes(),
          obtenerResumenMacroregiones(),
          obtenerActividadReciente(),
        ])

        if (!cancelled) {
        const [
          indicadoresResult,
          institucionesResult,
          proyectosEstadoResult,
          actividadesEstadoResult,
          proyectosEjeResult,
          avanceProyectosResult,
          documentosTipoResult,
          documentosEstadoResult,
          documentosRecientesResult,
          resumenMacroregionesResult,
          actividadRecienteResult,
        ] = resultados

        const getValue = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
          result.status === "fulfilled" ? result.value : fallback

        const indicadoresData = getValue<Indicadores | null>(indicadoresResult, null)
        const institucionesData = getValue<Institucion[]>(institucionesResult, [])

        setIndicadores(indicadoresData)
        setTotalInstituciones(institucionesData.length)
        setInstituciones(institucionesData)
        setProyectosPorEstado(getValue<Conteo[]>(proyectosEstadoResult, []))
        setActividadesPorEstado(getValue<Conteo[]>(actividadesEstadoResult, []))
        setProyectosPorEje(getValue<ConteoPresupuesto[]>(proyectosEjeResult, []))
        setAvanceProyectos(getValue<ProyectoAvance[]>(avanceProyectosResult, []))
        setDocumentosPorTipo(getValue<Conteo[]>(documentosTipoResult, []))
        setDocumentosPorEstado(getValue<Conteo[]>(documentosEstadoResult, []))
        setDocumentosRecientes(getValue<DocumentoReciente[]>(documentosRecientesResult, []))
        setResumenMacroregiones(getValue<MacroregionResumen[]>(resumenMacroregionesResult, []))
        setActividadReciente(getValue<ActividadReciente[]>(actividadRecienteResult, []))

        if (resultados.some((result) => result.status === "rejected")) {
          setErrorReportes("Algunos reportes no pudieron cargarse. Revisa que el backend este actualizado.")
        }
        }
      } finally {
        if (!cancelled) setLoadingReportes(false)
      }
    }

    cargarReportes()
    return () => {
      cancelled = true
    }
  }, [authLoading])

  const kpiProyectosActivos = indicadores?.proyectosActivos ?? null
  const kpiDocumentos = indicadores
    ? indicadores.documentosPublicados + indicadores.documentosPendientes
    : null
  const kpiPresupuestoTotal = indicadores?.presupuestoTotal ?? null
  const totalProyectosReportados = proyectosPorEstado.reduce((acc, item) => acc + item.cantidad, 0)
  const totalDocumentosReportados = documentosPorTipo.reduce((acc, item) => acc + item.cantidad, 0)
  const totalActividadesReportadas = actividadesPorEstado.reduce((acc, item) => acc + item.cantidad, 0)

  return (
    <AppLayout>
      <PermissionGuard permiso="REPORTES_READ">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reportes e Indicadores</h1>
              <p className="text-muted-foreground">Analisis y metricas de gestion institucional</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
              {puedeExportarReportes && (
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              )}
            </div>
          </div>

          {errorReportes && (
            <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]">
              {errorReportes}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Proyectos Activos</p>
                    <p className="text-3xl font-bold text-foreground">{numero(kpiProyectosActivos, loadingReportes)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {indicadores ? `${indicadores.proyectosEnRiesgo} en riesgo` : "Desde backend"}
                    </p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-3">
                    <FolderOpen className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-accent">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Documentos Registrados</p>
                    <p className="text-3xl font-bold text-foreground">{numero(kpiDocumentos, loadingReportes)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {indicadores ? `${indicadores.documentosPublicados} publicados` : "Desde backend"}
                    </p>
                  </div>
                  <div className="rounded-full bg-accent/10 p-3">
                    <FileText className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Instituciones</p>
                    <p className="text-3xl font-bold text-foreground">{numero(totalInstituciones, loadingReportes)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Catalogo institucional</p>
                  </div>
                  <div className="rounded-full bg-green-500/10 p-3">
                    <Users className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Presupuesto Proyectos Activos</p>
                    <p className="text-3xl font-bold text-foreground">
                      {monedaCompacta(kpiPresupuestoTotal, loadingReportes)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {indicadores ? `${Math.round(indicadores.avancePromedio)}% avance promedio` : "Desde backend"}
                    </p>
                  </div>
                  <div className="rounded-full bg-blue-500/10 p-3">
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="semaforo" className="space-y-4">
            <TabsList>
              <TabsTrigger value="semaforo">
                <AlertCircle className="mr-2 h-4 w-4" />
                Semaforo
              </TabsTrigger>
              <TabsTrigger value="general">
                <BarChart3 className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="proyectos">
                <FolderOpen className="mr-2 h-4 w-4" />
                Proyectos
              </TabsTrigger>
              <TabsTrigger value="productos">
                <FileText className="mr-2 h-4 w-4" />
                Productos
              </TabsTrigger>
              <TabsTrigger value="geografico">
                <MapPin className="mr-2 h-4 w-4" />
                Geografico
              </TabsTrigger>
              <TabsTrigger value="actividad">
                <Clock className="mr-2 h-4 w-4" />
                Actividad Reciente
              </TabsTrigger>
            </TabsList>

            <TabsContent value="semaforo" className="space-y-4">
              <SemaforoPortafolio />
            </TabsContent>

            <TabsContent value="general" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estado de Proyectos</CardTitle>
                    <CardDescription>Distribucion por estado actual</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {proyectosPorEstado.length === 0 ? (
                      <EmptyState>No hay proyectos para mostrar.</EmptyState>
                    ) : (
                      proyectosPorEstado.map((item, index) => (
                        <div key={item.etiqueta} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`h-3 w-3 rounded-full ${ESTADO_COLORES[index] ?? "bg-gray-500"}`} />
                              <span className="text-sm">{item.etiqueta}</span>
                            </div>
                            <span className="font-medium">{item.cantidad}</span>
                          </div>
                          <ProgressBar
                            value={porcentaje(item.cantidad, totalProyectosReportados)}
                            className="h-2"
                            indicatorClassName={ESTADO_COLORES[index] ?? "bg-gray-500"}
                          />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Avance de Proyectos</CardTitle>
                    <CardDescription>Avance fisico reportado por proyecto</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {avanceProyectos.length === 0 ? (
                      <EmptyState>No hay avances de proyectos para mostrar.</EmptyState>
                    ) : (
                      avanceProyectos.slice(0, 5).map((proyecto) => {
                        const avance = Math.round(proyecto.porcentajeAvance)
                        return (
                          <div key={proyecto.id} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="max-w-[220px] truncate">{proyecto.nombre}</span>
                              <span className="font-medium">{avance}%</span>
                            </div>
                            <ProgressBar value={avance} className="h-2" />
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actividades por Estado</CardTitle>
                  <CardDescription>Distribucion operativa de actividades</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {actividadesPorEstado.length === 0 ? (
                    <div className="sm:col-span-2 lg:col-span-4">
                      <EmptyState>No hay actividades para mostrar.</EmptyState>
                    </div>
                  ) : (
                    actividadesPorEstado.map((estado, index) => (
                      <div key={estado.etiqueta} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{estado.etiqueta}</span>
                          <span className="text-sm text-muted-foreground">{estado.cantidad}</span>
                        </div>
                        <ProgressBar
                          value={porcentaje(estado.cantidad, totalActividadesReportadas)}
                          className="h-2"
                          indicatorClassName={ESTADO_COLORES[index] ?? "bg-gray-500"}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actividad" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                  <CardDescription>Ultimas acciones registradas en el sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  {actividadReciente.length === 0 ? (
                    <EmptyState>No hay actividad reciente registrada.</EmptyState>
                  ) : (
                    <div className="space-y-4">
                      {actividadReciente.map((entrada) => (
                        <div key={`${entrada.tipoAccion}-${entrada.fecha}-${entrada.descripcion}`} className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                          <div className={`rounded-full p-2 ${tonoActividad(entrada)}`}>
                            {iconoActividad(entrada)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{entrada.descripcion}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{entrada.usuario}</span>
                              <span className="text-xs text-muted-foreground">-</span>
                              <span className="text-xs text-muted-foreground">{fechaHora(entrada.fecha)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proyectos" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Proyectos por Eje Estrategico</CardTitle>
                    <CardDescription>Distribucion segun linea de trabajo</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {proyectosPorEje.length === 0 ? (
                      <EmptyState>No hay ejes con proyectos registrados.</EmptyState>
                    ) : (
                      proyectosPorEje.map((eje) => (
                        <div key={eje.etiqueta} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="max-w-[250px] truncate text-sm font-medium">{eje.etiqueta}</span>
                            <span className="text-sm text-muted-foreground">{eje.cantidad} proyectos</span>
                          </div>
                          <ProgressBar value={porcentaje(eje.cantidad, totalProyectosReportados)} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            Presupuesto: S/ {eje.presupuesto.toLocaleString("es-PE")}
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cumplimiento de Metas</CardTitle>
                    <CardDescription>Avance fisico de proyectos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {avanceProyectos.length === 0 ? (
                      <EmptyState>No hay proyectos para mostrar.</EmptyState>
                    ) : (
                      avanceProyectos.map((proyecto) => (
                        <div key={proyecto.id} className="flex items-center gap-4 rounded-lg bg-muted/50 p-3">
                          <div className="flex-1">
                            <p className="truncate text-sm font-medium">{proyecto.nombre}</p>
                            <p className="text-xs text-muted-foreground">{proyecto.macroregion}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">{Math.round(proyecto.porcentajeAvance)}%</p>
                            <StatusBadge status={proyecto.estado} type="project" />
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="productos" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Productos por Tipo</CardTitle>
                    <CardDescription>Distribucion de informes y documentos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {documentosPorTipo.length === 0 ? (
                      <EmptyState>No hay documentos para mostrar.</EmptyState>
                    ) : (
                      documentosPorTipo.map((tipo) => (
                        <div key={tipo.etiqueta} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm font-medium">{tipo.etiqueta}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{tipo.cantidad}</span>
                            <span className="text-xs text-muted-foreground">
                              ({porcentaje(tipo.cantidad, totalDocumentosReportados).toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estado de Productos</CardTitle>
                    <CardDescription>Flujo de publicacion</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {documentosPorEstado.map((estado, index) => {
                        const styles = [
                          "bg-yellow-50 border-yellow-200 text-yellow-600",
                          "bg-blue-50 border-blue-200 text-blue-600",
                          "bg-green-50 border-green-200 text-green-600",
                        ]
                        return (
                          <div key={estado.etiqueta} className={`rounded-lg border p-4 ${styles[index] ?? "bg-gray-50 border-gray-200 text-gray-600"}`}>
                            <p className="text-2xl font-bold">{estado.cantidad}</p>
                            <p className="text-xs">{estado.etiqueta}</p>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 space-y-3">
                      <p className="text-sm font-medium">Ultimos productos registrados</p>
                      {documentosRecientes.length === 0 ? (
                        <EmptyState>No hay documentos recientes.</EmptyState>
                      ) : (
                        documentosRecientes.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between rounded border p-2">
                            <div>
                              <p className="max-w-[220px] truncate text-sm font-medium">{doc.titulo}</p>
                              <p className="text-xs text-muted-foreground">{doc.fechaCarga}</p>
                            </div>
                            <StatusBadge status={doc.tipo ?? doc.estado} type="product" />
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="geografico" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribucion Geografica</CardTitle>
                  <CardDescription>Proyectos y organizaciones por region</CardDescription>
                </CardHeader>
                <CardContent>
                  {resumenMacroregiones.length === 0 ? (
                    <EmptyState>No hay macroregiones para mostrar.</EmptyState>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {resumenMacroregiones.map((region) => (
                        <div key={region.nombre} className="rounded-lg border bg-card p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">{region.nombre}</h3>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total proyectos</span>
                              <span className="font-medium">{region.totalProyectos}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Activos</span>
                              <span className="font-medium text-blue-600">{region.activos}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Finalizados</span>
                              <span className="font-medium text-green-600">{region.finalizados}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Instituciones</span>
                              <span className="font-medium">{region.instituciones}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Instituciones Miembro</CardTitle>
                  <CardDescription>Red de instituciones de Red Muqui</CardDescription>
                </CardHeader>
                <CardContent>
                  {instituciones.length === 0 ? (
                    <EmptyState>No hay instituciones registradas.</EmptyState>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {instituciones.map((institucion) => (
                        <div key={institucion.id} className="flex items-center gap-3 rounded-lg border p-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <p className="text-sm font-medium">{institucion.nombre}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PermissionGuard>
    </AppLayout>
  )
}
