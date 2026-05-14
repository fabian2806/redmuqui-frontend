"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import type { BitacoraResponse, EquipoMember, PageResponse, Permiso, ProyectoResponse, UsuarioResponse } from "@/lib/types"
import {
  ArrowLeft,
  Mail,
  Building2,
  Calendar,
  Shield,
  FolderOpen,
  Clock,
  CheckCircle2,
  FileText,
  MapPin,
  Phone,
} from "lucide-react"

type PermisoKey =
  | "ver_proyectos"
  | "crear_proyectos"
  | "editar_proyectos"
  | "eliminar_proyectos"
  | "aprobar_informes"
  | "gestionar_usuarios"
  | "exportar_reportes"
  | "configurar_sistema"

const permisosLabels: Record<PermisoKey, { label: string; description: string }> = {
  ver_proyectos: { label: "Ver proyectos e informes", description: "Acceso de lectura a todos los proyectos e informes" },
  crear_proyectos: { label: "Crear proyectos e informes", description: "Puede crear nuevos proyectos e informes" },
  editar_proyectos: { label: "Editar proyectos e informes", description: "Puede modificar proyectos e informes existentes" },
  eliminar_proyectos: { label: "Eliminar proyectos e informes", description: "Puede eliminar permanentemente datos del sistema" },
  aprobar_informes: { label: "Aprobar informes y productos", description: "Puede aprobar y publicar informes oficiales" },
  gestionar_usuarios: { label: "Gestionar usuarios", description: "Puede crear, editar y eliminar usuarios" },
  exportar_reportes: { label: "Exportar reportes", description: "Puede generar y descargar reportes del sistema" },
  configurar_sistema: { label: "Configurar sistema", description: "Acceso a configuraciones avanzadas del sistema" },
}

const permisosBase: Record<PermisoKey, boolean> = {
  ver_proyectos: true,
  crear_proyectos: false,
  editar_proyectos: false,
  eliminar_proyectos: false,
  aprobar_informes: false,
  gestionar_usuarios: false,
  exportar_reportes: true,
  configurar_sistema: false,
}

export default function UsuarioDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [usuario, setUsuario] = useState<UsuarioResponse | null>(null)
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [proyectosUsuario, setProyectosUsuario] = useState<ProyectoResponse[]>([])
  const [actividadUsuario, setActividadUsuario] = useState<BitacoraResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    const cargarDetalle = async () => {
      setCargando(true)
      setError(null)

      try {
        const usuarioData = await api.get<UsuarioResponse>(`/usuarios/${id}`)
        if (cancelado) return

        setUsuario(usuarioData)

        const [permisosResult, proyectosResult, bitacoraResult] = await Promise.allSettled([
          api.get<Permiso[]>(`/roles/${usuarioData.idRol}/permisos`),
          api.get<PageResponse<ProyectoResponse>>("/proyectos?size=100&sort=id,asc"),
          api.get<PageResponse<BitacoraResponse>>("/bitacora?size=100&sort=fecha,desc"),
        ])

        if (cancelado) return

        if (permisosResult.status === "fulfilled") {
          setPermisos(permisosResult.value)
        } else {
          setPermisos(usuarioData.permisos?.map((nombre, index) => ({ id: index, nombre, tipo: null })) ?? [])
        }

        if (proyectosResult.status === "fulfilled") {
          const proyectos = proyectosResult.value.content
          const proyectosComoResponsable = proyectos.filter((proyecto) => proyecto.responsablePrincipal?.id === usuarioData.id)
          const proyectosSinResponsable = proyectos.filter((proyecto) => proyecto.responsablePrincipal?.id !== usuarioData.id)

          const equipos = await Promise.allSettled(
            proyectosSinResponsable.map(async (proyecto) => ({
              proyecto,
              equipo: await api.get<EquipoMember[]>(`/proyectos/${proyecto.id}/equipo`),
            })),
          )

          if (cancelado) return

          const proyectosComoEquipo = equipos
            .filter((result): result is PromiseFulfilledResult<{ proyecto: ProyectoResponse; equipo: EquipoMember[] }> => result.status === "fulfilled")
            .map((result) => result.value)
            .filter(({ equipo }) => equipo.some((miembro) => miembro.idUsuario === usuarioData.id))
            .map(({ proyecto }) => proyecto)

          setProyectosUsuario([...proyectosComoResponsable, ...proyectosComoEquipo])
        } else {
          setProyectosUsuario([])
        }

        if (bitacoraResult.status === "fulfilled") {
          setActividadUsuario(bitacoraResult.value.content.filter((entrada) => entrada.idUsuario === usuarioData.id).slice(0, 10))
        } else {
          setActividadUsuario([])
        }
      } catch (err) {
        if (!cancelado) {
          setUsuario(null)
          setError(err instanceof Error ? err.message : "No se pudo cargar el usuario")
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargarDetalle()

    return () => {
      cancelado = true
    }
  }, [id])

  const nombreCompleto = usuario ? getNombreCompleto(usuario) : ""
  const descripcionRol = useMemo(() => getRolDescripcion(usuario?.nombreRol ?? ""), [usuario?.nombreRol])
  const permisosDelRol = useMemo(() => getPermisosPorRol(usuario?.nombreRol ?? ""), [usuario?.nombreRol])

  if (cargando) {
    return (
      <AppLayout>
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          Cargando perfil de usuario...
        </div>
      </AppLayout>
    )
  }

  if (!usuario) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{error ?? "Usuario no encontrado"}</p>
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/usuarios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Perfil de Usuario</h1>
            <p className="text-muted-foreground">Informacion detallada y actividad</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {getInitials(nombreCompleto)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{nombreCompleto}</h2>
                <Badge variant="outline" className={`mt-2 ${getRolColor(usuario.nombreRol)}`}>
                  {usuario.nombreRol || "Sin rol"}
                </Badge>

                <div className="w-full mt-6 space-y-3 text-left">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{usuario.email}</span>
                  </div>
                  {usuario.telefono && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{usuario.telefono}</span>
                    </div>
                  )}
                  {usuario.nombreInstitucion && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{usuario.nombreInstitucion}</span>
                    </div>
                  )}
                  {usuario.nombreMacroregion && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{usuario.nombreMacroregion}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>Ultimo acceso: {formatDateTime(usuario.ultimoAcceso) ?? "Sin registro"}</span>
                  </div>
                </div>

                <div className="w-full mt-6 pt-6 border-t">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${usuario.estado ? "bg-green-500" : "bg-gray-400"}`} />
                    <span className={`text-sm font-medium ${usuario.estado ? "text-green-600" : "text-gray-500"}`}>
                      Usuario {usuario.estado ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                <TabsContent value="permisos" className="mt-0">
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h3 className="font-semibold mb-1">Rol: {usuario.nombreRol || "Sin rol"}</h3>
                      <p className="text-sm text-muted-foreground">{descripcionRol}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Permisos Asignados</h4>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(permisosLabels).map(([key, { label, description }]) => {
                          const activo = permisosDelRol[key as PermisoKey] ?? permisos.some((permiso) => permisoCoincideConKey(permiso.nombre, key as PermisoKey))

                          return (
                            <div
                              key={key}
                              className={`p-4 rounded-lg border transition-colors ${activo ? "border-primary/50 bg-primary/5" : "border-border opacity-80"}`}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox id={`detalle-${key}`} checked={activo} disabled />
                                <div>
                                  <Label htmlFor={`detalle-${key}`} className="text-sm font-medium cursor-not-allowed">
                                    {label}
                                  </Label>
                                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="proyectos" className="mt-0">
                  {proyectosUsuario.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proyecto</TableHead>
                          <TableHead>Macroregion</TableHead>
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
                                {proyecto.nombreMacroregion ?? "Sin macroregion"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getProyectoEstadoColor(proyecto.estado)}>
                                {formatEstadoProyecto(proyecto.estado)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${proyecto.porcentajeAvance ?? 0}%` }} />
                                </div>
                                <span className="text-sm">{proyecto.porcentajeAvance ?? 0}%</span>
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

                <TabsContent value="actividad" className="mt-0">
                  {actividadUsuario.length > 0 ? (
                    <div className="space-y-4">
                      {actividadUsuario.map((entrada) => (
                        <div key={entrada.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                          <div className="rounded-full p-2 shrink-0 bg-blue-100 text-blue-600">
                            {entrada.entidadReferenciada === "PROYECTO" ? <FolderOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{formatPermiso(entrada.tipoAccion)}</p>
                            <p className="text-sm text-muted-foreground">{entrada.descripcion}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDateTime(entrada.fecha)}</p>
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

function getNombreCompleto(usuario: UsuarioResponse) {
  return `${usuario.nombres} ${usuario.apellidos}`.trim()
}

function getInitials(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .map((parte) => parte[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function getRolColor(rol: string) {
  const rolNormalizado = normalizeRol(rol)
  if (rolNormalizado.includes("administrador")) return "bg-red-100 text-red-700 border-red-200"
  if (rolNormalizado.includes("secretaria")) return "bg-orange-100 text-orange-700 border-orange-200"
  if (rolNormalizado.includes("tecnico")) return "bg-blue-100 text-blue-700 border-blue-200"
  if (rolNormalizado.includes("coordin")) return "bg-green-100 text-green-700 border-green-200"
  if (rolNormalizado.includes("institucion") || rolNormalizado.includes("consultor")) return "bg-purple-100 text-purple-700 border-purple-200"
  return "bg-gray-100 text-gray-700 border-gray-200"
}

function getRolDescripcion(rol: string) {
  const rolNormalizado = normalizeRol(rol)
  if (rolNormalizado.includes("administrador")) return "Acceso completo a todas las funcionalidades del sistema."
  if (rolNormalizado.includes("secretaria")) return "Puede gestionar proyectos, aprobar informes y supervisar el equipo."
  if (rolNormalizado.includes("tecnico")) return "Puede crear y editar proyectos e informes asignados."
  if (rolNormalizado.includes("coordin")) return "Gestiona proyectos en su macroregion asignada."
  if (rolNormalizado.includes("institucion")) return "Acceso de lectura con capacidad de exportacion."
  if (rolNormalizado.includes("lectura") || rolNormalizado.includes("consultor")) return "Solo puede visualizar informacion del sistema."
  return "Permisos definidos por el rol asignado en el sistema."
}

function getPermisosPorRol(rol: string): Record<PermisoKey, boolean> {
  const rolNormalizado = normalizeRol(rol)

  if (rolNormalizado === "administrador") {
    return {
      ver_proyectos: true,
      crear_proyectos: true,
      editar_proyectos: true,
      eliminar_proyectos: true,
      aprobar_informes: true,
      gestionar_usuarios: true,
      exportar_reportes: true,
      configurar_sistema: true,
    }
  }

  if (rolNormalizado === "coordinador" || rolNormalizado.includes("coordin")) {
    return {
      ver_proyectos: true,
      crear_proyectos: true,
      editar_proyectos: true,
      eliminar_proyectos: false,
      aprobar_informes: true,
      gestionar_usuarios: false,
      exportar_reportes: true,
      configurar_sistema: false,
    }
  }

  if (rolNormalizado === "tecnico" || rolNormalizado.includes("tecnico")) {
    return {
      ver_proyectos: true,
      crear_proyectos: true,
      editar_proyectos: true,
      eliminar_proyectos: false,
      aprobar_informes: false,
      gestionar_usuarios: false,
      exportar_reportes: true,
      configurar_sistema: false,
    }
  }

  if (rolNormalizado === "consultor" || rolNormalizado.includes("lectura") || rolNormalizado.includes("institucion")) {
    return {
      ver_proyectos: true,
      crear_proyectos: false,
      editar_proyectos: false,
      eliminar_proyectos: false,
      aprobar_informes: false,
      gestionar_usuarios: false,
      exportar_reportes: true,
      configurar_sistema: false,
    }
  }

  return permisosBase
}

function permisoCoincideConKey(nombre: string, key: PermisoKey) {
  const permiso = normalizeRol(nombre).replaceAll("_", " ")

  const aliases: Record<PermisoKey, string[]> = {
    ver_proyectos: ["ver proyectos", "leer proyectos", "proyectos read", "informes read"],
    crear_proyectos: ["crear proyectos", "proyectos create", "informes create"],
    editar_proyectos: ["editar proyectos", "actualizar proyectos", "proyectos update", "informes update"],
    eliminar_proyectos: ["eliminar proyectos", "proyectos delete", "informes delete"],
    aprobar_informes: ["aprobar informes", "aprobar productos", "informes approve"],
    gestionar_usuarios: ["gestionar usuarios", "usuarios", "users"],
    exportar_reportes: ["exportar reportes", "reportes", "export"],
    configurar_sistema: ["configurar sistema", "configuracion", "settings"],
  }

  return aliases[key].some((alias) => permiso.includes(alias))
}

function getProyectoEstadoColor(estado: string) {
  if (estado === "EN_CURSO") return "bg-blue-50 text-blue-700 border-blue-200"
  if (estado === "FINALIZADO") return "bg-green-50 text-green-700 border-green-200"
  return "bg-yellow-50 text-yellow-700 border-yellow-200"
}

function formatEstadoProyecto(estado: string) {
  const labels: Record<string, string> = {
    PENDIENTE: "Pendiente",
    EN_CURSO: "En curso",
    FINALIZADO: "Finalizado",
  }
  return labels[estado] ?? estado
}

function formatPermiso(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDateTime(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function normalizeRol(rol: string) {
  return rol
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}
