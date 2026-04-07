"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/ui/status-badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import { proyectos, documentos, actividades, bitacora, institucionesMiembro } from "@/lib/data"
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Download, 
  FileText,
  Users,
  FolderOpen,
  MapPin,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react"

export default function ReportesPage() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("2024")
  const [regionSeleccionada, setRegionSeleccionada] = useState("todas")

  // Calcular estadísticas
  const totalProyectos = proyectos.length
  const proyectosActivos = proyectos.filter(p => p.estado === "Activo").length
  const proyectosFinalizados = proyectos.filter(p => p.estado === "Cerrado").length
  const totalDocumentos = documentos.length
  const documentosPublicados = documentos.filter(d => d.estado === "Publicado").length

  // Estadísticas por macroregión
  const regionesStats = proyectos.reduce((acc, proyecto) => {
    const region = proyecto.macroregion
    if (!acc[region]) {
      acc[region] = { total: 0, activos: 0, finalizados: 0 }
    }
    acc[region].total++
    if (proyecto.estado === "Activo") acc[region].activos++
    if (proyecto.estado === "Cerrado") acc[region].finalizados++
    return acc
  }, {} as Record<string, { total: number; activos: number; finalizados: number }>)

  // Estadísticas por eje temático
  const ejesStats = proyectos.reduce((acc, proyecto) => {
    const eje = proyecto.ejeTematico
    if (!acc[eje]) {
      acc[eje] = { total: 0, presupuesto: 0 }
    }
    acc[eje].total++
    acc[eje].presupuesto += proyecto.presupuesto || 0
    return acc
  }, {} as Record<string, { total: number; presupuesto: number }>)

  // Estadísticas por tipo de producto
  const tiposProducto = documentos.reduce((acc, doc) => {
    const tipo = doc.tipo
    if (!acc[tipo]) {
      acc[tipo] = 0
    }
    acc[tipo]++
    return acc
  }, {} as Record<string, number>)

  // Actividades recientes (usando bitácora)
  const actividadesRecientes = bitacora.slice(0, 10)

  // Presupuesto total
  const presupuestoTotal = proyectos.reduce((acc, p) => acc + (p.presupuesto || 0), 0)
  const presupuestoEjecutado = Math.round(presupuestoTotal * 0.65) // Estimado 65% ejecutado

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reportes e Indicadores</h1>
            <p className="text-muted-foreground">
              Análisis y métricas de gestión institucional
            </p>
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
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPIs principales */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Proyectos</p>
                  <p className="text-3xl font-bold text-foreground">{totalProyectos}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {proyectosActivos} activos
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
                  <p className="text-sm font-medium text-muted-foreground">Documentos Generados</p>
                  <p className="text-3xl font-bold text-foreground">{totalDocumentos}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {documentosPublicados} publicados
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
                  <p className="text-3xl font-bold text-foreground">{institucionesMiembro.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Miembros de la red
                  </p>
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
                  <p className="text-sm font-medium text-muted-foreground">Presupuesto Total</p>
                  <p className="text-3xl font-bold text-foreground">
                    S/ {(presupuestoTotal / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((presupuestoEjecutado / presupuestoTotal) * 100).toFixed(0)}% ejecutado
                  </p>
                </div>
                <div className="rounded-full bg-blue-500/10 p-3">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de reportes */}
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
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
              Geográfico
            </TabsTrigger>
          </TabsList>

          {/* Tab General */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Estado de proyectos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estado de Proyectos</CardTitle>
                  <CardDescription>Distribución por estado actual</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <span className="text-sm">En Ejecución</span>
                      </div>
                      <span className="font-medium">{proyectosActivos}</span>
                    </div>
                    <ProgressBar 
                      value={(proyectosActivos / totalProyectos) * 100} 
                      className="h-2"
                      indicatorClassName="bg-blue-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                        <span className="text-sm">Finalizados</span>
                      </div>
                      <span className="font-medium">{proyectosFinalizados}</span>
                    </div>
                    <ProgressBar 
                      value={(proyectosFinalizados / totalProyectos) * 100} 
                      className="h-2"
                      indicatorClassName="bg-green-500"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        <span className="text-sm">En Riesgo</span>
                      </div>
                      <span className="font-medium">
                        {proyectos.filter(p => p.estado === "En riesgo").length}
                      </span>
                    </div>
                    <ProgressBar 
                      value={(proyectos.filter(p => p.estado === "En riesgo").length / totalProyectos) * 100} 
                      className="h-2"
                      indicatorClassName="bg-yellow-500"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Ejecución presupuestal */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ejecución Presupuestal</CardTitle>
                  <CardDescription>Avance por proyecto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proyectos.slice(0, 5).map((proyecto) => {
                    const porcentaje = proyecto.avance
                    return (
                      <div key={proyecto.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate max-w-[200px]">{proyecto.nombre}</span>
                          <span className="font-medium">{porcentaje}%</span>
                        </div>
                        <ProgressBar value={porcentaje} className="h-2" />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Actividad reciente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                <CardDescription>Últimas acciones registradas en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {actividadesRecientes.map((entrada) => (
                    <div key={entrada.id} className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                      <div className={`rounded-full p-2 ${
                        entrada.tipo === "proyecto" ? "bg-green-100 text-green-600" :
                        entrada.tipo === "informe" ? "bg-blue-100 text-blue-600" :
                        entrada.tipo === "actividad" ? "bg-purple-100 text-purple-600" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {entrada.tipo === "proyecto" && <CheckCircle2 className="h-4 w-4" />}
                        {entrada.tipo === "informe" && <FileText className="h-4 w-4" />}
                        {entrada.tipo === "actividad" && <Clock className="h-4 w-4" />}
                        {entrada.tipo === "incidencia" && <AlertCircle className="h-4 w-4" />}
                        {entrada.tipo === "usuario" && <Users className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{entrada.descripcion}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{entrada.usuario}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{entrada.fecha}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Proyectos */}
          <TabsContent value="proyectos" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Por eje estratégico */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Proyectos por Eje Estratégico</CardTitle>
                  <CardDescription>Distribución según línea de trabajo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(ejesStats).map(([eje, stats]) => (
                    <div key={eje} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[250px]">{eje}</span>
                        <span className="text-sm text-muted-foreground">{stats.total} proyectos</span>
                      </div>
                      <ProgressBar 
                        value={(stats.total / totalProyectos) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Presupuesto: S/ {stats.presupuesto.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Cumplimiento de metas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cumplimiento de Metas</CardTitle>
                  <CardDescription>Avance físico de proyectos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proyectos.map((proyecto) => (
                    <div key={proyecto.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{proyecto.nombre}</p>
                        <p className="text-xs text-muted-foreground">{proyecto.macroregion}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{proyecto.avance}%</p>
                        <StatusBadge status={proyecto.estado} type="project" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Productos */}
          <TabsContent value="productos" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Por tipo de producto */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Productos por Tipo</CardTitle>
                  <CardDescription>Distribución de informes y documentos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(tiposProducto).map(([tipo, cantidad]) => {
                    return (
                      <div key={tipo} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">{tipo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{cantidad}</span>
                          <span className="text-xs text-muted-foreground">
                            ({((cantidad / totalDocumentos) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Estado de productos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estado de Productos</CardTitle>
                  <CardDescription>Flujo de publicación</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                      <p className="text-2xl font-bold text-yellow-600">
                        {documentos.filter(d => d.estado === "Borrador").length}
                      </p>
                      <p className="text-xs text-yellow-600">Borrador</p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-2xl font-bold text-blue-600">
                        {documentos.filter(d => d.estado === "En revisión").length}
                      </p>
                      <p className="text-xs text-blue-600">En Revisión</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-2xl font-bold text-green-600">
                        {documentos.filter(d => d.estado === "Publicado").length}
                      </p>
                      <p className="text-xs text-green-600">Publicados</p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <p className="text-sm font-medium">Últimos productos publicados</p>
                    {documentos.filter(d => d.estado === "Publicado").slice(0, 4).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded border">
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">{doc.titulo}</p>
                          <p className="text-xs text-muted-foreground">{doc.fechaPublicacion || doc.fechaElaboracion}</p>
                        </div>
                        <StatusBadge status={doc.tipo} type="product" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Geográfico */}
          <TabsContent value="geografico" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribución Geográfica</CardTitle>
                <CardDescription>Proyectos y organizaciones por región</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(regionesStats).map(([region, stats]) => (
                    <div key={region} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{region}</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total proyectos</span>
                          <span className="font-medium">{stats.total}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Activos</span>
                          <span className="font-medium text-blue-600">{stats.activos}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Finalizados</span>
                          <span className="font-medium text-green-600">{stats.finalizados}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Instituciones</span>
                          <span className="font-medium">
                            {proyectos.filter(p => p.macroregion === region).flatMap(p => p.institucionesMiembro).filter((v, i, a) => a.indexOf(v) === i).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Instituciones miembro */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instituciones Miembro</CardTitle>
                <CardDescription>Red de instituciones de la Red Muqui</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {institucionesMiembro.map((institucion, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <p className="font-medium text-sm">{institucion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
