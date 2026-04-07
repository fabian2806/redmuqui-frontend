"use client"

import { use } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usuarios, organizaciones, proyectos, actividadesTrazabilidad } from "@/lib/data"
import { 
  ArrowLeft, 
  Pencil, 
  Mail, 
  Phone,
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

  const organizacion = organizaciones.find(o => o.id === usuario.organizacionId)
  const proyectosUsuario = proyectos.filter(p => 
    p.responsables.includes(usuario.id) || p.equipo?.includes(usuario.id)
  )
  const actividadesUsuario = actividadesTrazabilidad.filter(a => 
    a.usuario.toLowerCase().includes(usuario.nombre.split(' ')[0].toLowerCase())
  )

  const getInitials = (nombre: string) => {
    return nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const getRolLabel = (rol: string) => {
    switch (rol) {
      case "administrador": return "Administrador"
      case "coordinador": return "Coordinador"
      case "tecnico": return "Técnico"
      case "consultor": return "Consultor"
      default: return rol
    }
  }

  const getRolColor = (rol: string) => {
    switch (rol) {
      case "administrador": return "bg-red-100 text-red-700 border-red-200"
      case "coordinador": return "bg-blue-100 text-blue-700 border-blue-200"
      case "tecnico": return "bg-green-100 text-green-700 border-green-200"
      case "consultor": return "bg-purple-100 text-purple-700 border-purple-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  // Permisos según rol
  const permisos = {
    administrador: ["ver_proyectos", "crear_proyectos", "editar_proyectos", "eliminar_proyectos", 
                    "aprobar_informes", "gestionar_usuarios", "exportar_reportes", "configurar_sistema"],
    coordinador: ["ver_proyectos", "crear_proyectos", "editar_proyectos", "aprobar_informes", "exportar_reportes"],
    tecnico: ["ver_proyectos", "crear_proyectos", "editar_proyectos", "exportar_reportes"],
    consultor: ["ver_proyectos", "exportar_reportes"]
  }

  const permisosUsuario = permisos[usuario.rol as keyof typeof permisos] || []

  const permisosLabels: Record<string, string> = {
    ver_proyectos: "Ver proyectos e informes",
    crear_proyectos: "Crear proyectos e informes",
    editar_proyectos: "Editar proyectos e informes",
    eliminar_proyectos: "Eliminar proyectos e informes",
    aprobar_informes: "Aprobar informes y productos",
    gestionar_usuarios: "Gestionar usuarios del sistema",
    exportar_reportes: "Exportar reportes y datos",
    configurar_sistema: "Configurar sistema"
  }

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
          <Link href={`/usuarios/${id}/editar`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        </div>

        {/* Perfil principal */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Info del usuario */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {getInitials(usuario.nombre)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{usuario.nombre}</h2>
                <Badge variant="outline" className={`mt-2 ${getRolColor(usuario.rol)}`}>
                  {getRolLabel(usuario.rol)}
                </Badge>
                
                <div className="w-full mt-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{usuario.email}</span>
                  </div>
                  {usuario.telefono && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{usuario.telefono}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{organizacion?.nombre || "Sin organización"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Registro: {usuario.fechaRegistro}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Último acceso: {usuario.ultimoAcceso}</span>
                  </div>
                </div>

                <div className="w-full mt-6 pt-6 border-t">
                  <div className="flex items-center justify-center gap-2">
                    {usuario.estado === "activo" ? (
                      <>
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-green-600">Usuario Activo</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                        <span className="text-sm font-medium text-gray-500">Usuario Inactivo</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs de información */}
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
                      <h3 className="font-semibold mb-2">Rol: {getRolLabel(usuario.rol)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {usuario.rol === "administrador" && "Acceso completo a todas las funcionalidades del sistema."}
                        {usuario.rol === "coordinador" && "Puede gestionar proyectos, aprobar informes y supervisar equipos."}
                        {usuario.rol === "tecnico" && "Puede crear y editar proyectos e informes asignados."}
                        {usuario.rol === "consultor" && "Acceso de solo lectura con capacidad de exportación."}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Permisos Asignados</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {permisosUsuario.map((permiso) => (
                          <div key={permiso} className="flex items-center gap-2 p-2 rounded border bg-green-50 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm">{permisosLabels[permiso]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {organizacion && (
                      <div className="mt-6 p-4 rounded-lg border">
                        <h4 className="font-medium mb-2">Organización Asociada</h4>
                        <div className="space-y-2 text-sm">
                          <p><strong>Nombre:</strong> {organizacion.nombre}</p>
                          <p><strong>Tipo:</strong> {organizacion.tipo}</p>
                          <p><strong>Región:</strong> {organizacion.region}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab Proyectos */}
                <TabsContent value="proyectos" className="mt-0">
                  {proyectosUsuario.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proyecto</TableHead>
                          <TableHead>Región</TableHead>
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
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                {proyecto.region}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                proyecto.estado === "en_ejecucion" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                proyecto.estado === "finalizado" ? "bg-green-50 text-green-700 border-green-200" :
                                "bg-yellow-50 text-yellow-700 border-yellow-200"
                              }>
                                {proyecto.estado === "en_ejecucion" ? "En Ejecución" :
                                 proyecto.estado === "finalizado" ? "Finalizado" : "Planificación"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${proyecto.avanceFisico}%` }}
                                  />
                                </div>
                                <span className="text-sm">{proyecto.avanceFisico}%</span>
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
                  {actividadesUsuario.length > 0 ? (
                    <div className="space-y-4">
                      {actividadesUsuario.slice(0, 10).map((actividad) => (
                        <div key={actividad.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                          <div className={`rounded-full p-2 ${
                            actividad.tipo === "creacion" ? "bg-green-100 text-green-600" :
                            actividad.tipo === "actualizacion" ? "bg-blue-100 text-blue-600" :
                            actividad.tipo === "aprobacion" ? "bg-purple-100 text-purple-600" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {actividad.tipo === "creacion" && <CheckCircle2 className="h-4 w-4" />}
                            {actividad.tipo === "actualizacion" && <FileText className="h-4 w-4" />}
                            {actividad.tipo === "aprobacion" && <Shield className="h-4 w-4" />}
                            {actividad.tipo === "comentario" && <Mail className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{actividad.descripcion}</p>
                            <p className="text-xs text-muted-foreground mt-1">{actividad.fecha}</p>
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
