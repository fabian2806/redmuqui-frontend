"use client"

import { use } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usuarios, proyectos, bitacora } from "@/lib/data"
import { 
  ArrowLeft, 
  Pencil, 
  Mail, 
  Building2,
  Calendar,
  Shield,
  FolderOpen,
  Clock,
  CheckCircle2,
  FileText,
  MapPin
} from "lucide-react"
import Link from "next/link"

export default function UsuarioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const usuario = usuarios.find(u => u.id === id)

  if (!usuario) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Usuario no encontrado</p>
          <Link href="/usuarios">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a usuarios
            </Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  // Proyectos donde el usuario aparece como responsable o en el equipo
  const proyectosUsuario = proyectos.filter(p =>
    p.responsable === usuario.nombre ||
    p.equipo.some(e => e.toLowerCase().includes(usuario.nombre.split(" ")[0].toLowerCase()))
  )

  // Actividad del usuario en la bitácora
  const actividadUsuario = bitacora.filter(b =>
    b.usuario.toLowerCase().includes(usuario.nombre.split(" ")[0].toLowerCase())
  ).slice(0, 10)

  const getInitials = (nombre: string) =>
    nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()

  const getRolLabel = (rol: string) => rol

  const getRolColor = (rol: string) => {
    switch (rol) {
      case "Administrador": return "bg-red-100 text-red-700 border-red-200"
      case "Secretaría Ejecutiva": return "bg-orange-100 text-orange-700 border-orange-200"
      case "Equipo Técnico": return "bg-blue-100 text-blue-700 border-blue-200"
      case "Coordinación Macroregional": return "bg-green-100 text-green-700 border-green-200"
      case "Institución Miembro": return "bg-purple-100 text-purple-700 border-purple-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const permisosPorRol: Record<string, string[]> = {
    "Administrador": [
      "Ver proyectos e informes",
      "Crear proyectos e informes",
      "Editar proyectos e informes",
      "Eliminar proyectos e informes",
      "Aprobar informes y productos",
      "Gestionar usuarios del sistema",
      "Exportar reportes y datos",
      "Configurar sistema"
    ],
    "Secretaría Ejecutiva": [
      "Ver proyectos e informes",
      "Crear proyectos e informes",
      "Editar proyectos e informes",
      "Aprobar informes y productos",
      "Exportar reportes y datos"
    ],
    "Equipo Técnico": [
      "Ver proyectos e informes",
      "Crear proyectos e informes",
      "Editar proyectos e informes",
      "Exportar reportes y datos"
    ],
    "Coordinación Macroregional": [
      "Ver proyectos e informes",
      "Editar proyectos e informes",
      "Exportar reportes y datos"
    ],
    "Institución Miembro": [
      "Ver proyectos e informes",
      "Exportar reportes y datos"
    ],
    "Solo lectura": [
      "Ver proyectos e informes"
    ]
  }

  const permisosUsuario = permisosPorRol[usuario.rol] || []

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/usuarios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Perfil de Usuario</h1>
            <p className="text-muted-foreground">Información detallada y actividad</p>
          </div>
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tarjeta de perfil */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {getInitials(usuario.nombre)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{usuario.nombre}</h2>
                <Badge variant="outline" className={`mt-2 ${getRolColor(usuario.rol)}`}>
                  {getRolLabel(usuario.rol)}
                </Badge>

                <div className="w-full mt-6 space-y-3 text-left">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{usuario.email}</span>
                  </div>
                  {usuario.institucion && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{usuario.institucion}</span>
                    </div>
                  )}
                  {usuario.macroregion && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{usuario.macroregion}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>Último acceso: {usuario.ultimoAcceso}</span>
                  </div>
                </div>

                <div className="w-full mt-6 pt-6 border-t">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      usuario.estado === "Activo" ? "bg-green-500" :
                      usuario.estado === "Pendiente" ? "bg-yellow-500" : "bg-gray-400"
                    }`} />
                    <span className={`text-sm font-medium ${
                      usuario.estado === "Activo" ? "text-green-600" :
                      usuario.estado === "Pendiente" ? "text-yellow-600" : "text-gray-500"
                    }`}>
                      Usuario {usuario.estado}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card className="lg:col-span-2">
            <Tabs defaultValue="permisos">
              <CardHeader>
                <TabsList>
                  <TabsTrigger value="permisos">
                    <Shield className="mr-2 h-4 w-4" />
                    Permisos
                  </TabsTrigger>
                  <TabsTrigger value="proyectos">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Proyectos
                  </TabsTrigger>
                  <TabsTrigger value="actividad">
                    <Clock className="mr-2 h-4 w-4" />
                    Actividad
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                {/* Tab Permisos */}
                <TabsContent value="permisos" className="mt-0">
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h3 className="font-semibold mb-1">Rol: {usuario.rol}</h3>
                      <p className="text-sm text-muted-foreground">
                        {usuario.rol === "Administrador" && "Acceso completo a todas las funcionalidades del sistema."}
                        {usuario.rol === "Secretaría Ejecutiva" && "Puede gestionar proyectos, aprobar informes y supervisar el equipo."}
                        {usuario.rol === "Equipo Técnico" && "Puede crear y editar proyectos e informes asignados."}
                        {usuario.rol === "Coordinación Macroregional" && "Gestiona proyectos en su macroregión asignada."}
                        {usuario.rol === "Institución Miembro" && "Acceso de lectura con capacidad de exportación."}
                        {usuario.rol === "Solo lectura" && "Solo puede visualizar información del sistema."}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Permisos Asignados</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {permisosUsuario.map((permiso) => (
                          <div key={permiso} className="flex items-center gap-2 p-2 rounded border bg-green-50 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            <span className="text-sm">{permiso}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab Proyectos */}
                <TabsContent value="proyectos" className="mt-0">
                  {proyectosUsuario.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proyecto</TableHead>
                          <TableHead>Macroregión</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Avance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proyectosUsuario.map((proyecto) => (
                          <TableRow key={proyecto.id}>
                            <TableCell>
                              <Link href={`/proyectos/${proyecto.id}`} className="hover:underline font-medium">
                                {proyecto.nombre}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                {proyecto.macroregion}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                proyecto.estado === "Activo" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                proyecto.estado === "Cerrado" ? "bg-green-50 text-green-700 border-green-200" :
                                proyecto.estado === "En riesgo" ? "bg-red-50 text-red-700 border-red-200" :
                                "bg-yellow-50 text-yellow-700 border-yellow-200"
                              }>
                                {proyecto.estado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${proyecto.avance}%` }}
                                  />
                                </div>
                                <span className="text-sm">{proyecto.avance}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Este usuario no tiene proyectos asignados</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab Actividad */}
                <TabsContent value="actividad" className="mt-0">
                  {actividadUsuario.length > 0 ? (
                    <div className="space-y-4">
                      {actividadUsuario.map((entrada) => (
                        <div key={entrada.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                          <div className={`rounded-full p-2 shrink-0 ${
                            entrada.tipo === "proyecto" ? "bg-blue-100 text-blue-600" :
                            entrada.tipo === "informe" ? "bg-green-100 text-green-600" :
                            entrada.tipo === "actividad" ? "bg-purple-100 text-purple-600" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {entrada.tipo === "proyecto" && <FolderOpen className="h-4 w-4" />}
                            {entrada.tipo === "informe" && <FileText className="h-4 w-4" />}
                            {entrada.tipo === "actividad" && <CheckCircle2 className="h-4 w-4" />}
                            {(entrada.tipo === "incidencia" || entrada.tipo === "usuario") && <Shield className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{entrada.accion}</p>
                            <p className="text-sm text-muted-foreground">{entrada.descripcion}</p>
                            <p className="text-xs text-muted-foreground mt-1">{entrada.fecha}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay actividad registrada para este usuario</p>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
