"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import type { PageResponse, UsuarioResponse } from "@/lib/types"
import { 
  Search, 
  MoreHorizontal, 
  UserCog, 
  Shield,
  Building2,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  CheckCircle2,
  XCircle
} from "lucide-react"
import Link from "next/link"

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [filtroRol, setFiltroRol] = useState("todos")
  const [filtroEstado, setFiltroEstado] = useState("todos")

  useEffect(() => {
    let cancelado = false

    const cargarUsuarios = async () => {
      try {
        setCargando(true)
        setError(null)
        const data = await api.get<PageResponse<UsuarioResponse>>("/usuarios?size=100&sort=id,asc")
        if (!cancelado) setUsuarios(data.content)
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los usuarios")
        }
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargarUsuarios()

    return () => {
      cancelado = true
    }
  }, [])

  // Filtrar usuarios
  const usuariosFiltrados = useMemo(() => usuarios.filter(usuario => {
    const nombreCompleto = getNombreCompleto(usuario)
    const matchBusqueda = nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
                          usuario.email.toLowerCase().includes(busqueda.toLowerCase())
    const matchRol = filtroRol === "todos" || usuario.nombreRol === filtroRol
    const matchEstado = filtroEstado === "todos" || getEstadoValue(usuario.estado) === filtroEstado
    return matchBusqueda && matchRol && matchEstado
  }), [busqueda, filtroEstado, filtroRol, usuarios])

  // Estadísticas
  const totalUsuarios = usuarios.length
  const usuariosActivos = usuarios.filter(u => u.estado).length
  const admins = usuarios.filter(u => normalizeRol(u.nombreRol).includes("administrador")).length
  const coordinadores = usuarios.filter(u => normalizeRol(u.nombreRol).includes("coordin")).length

  const getRolLabel = (rol: string) => {
    return rol || "Sin rol"
  }

  const getRolColor = (rol: string) => {
    const rolNormalizado = normalizeRol(rol)
    if (rolNormalizado.includes("administrador")) return "bg-red-100 text-red-700 border-red-200"
    if (rolNormalizado.includes("coordin")) return "bg-blue-100 text-blue-700 border-blue-200"
    if (rolNormalizado.includes("tecnico")) return "bg-green-100 text-green-700 border-green-200"
    if (rolNormalizado.includes("consultor") || rolNormalizado.includes("lectura")) return "bg-purple-100 text-purple-700 border-purple-200"
    return "bg-gray-100 text-gray-700 border-gray-200"
  }

  const getInitials = (nombre: string) => {
    return nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const roles = Array.from(new Set(usuarios.map(usuario => usuario.nombreRol).filter(Boolean))).sort()

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra usuarios, roles y permisos del sistema
            </p>
          </div>
          <Link href="/usuarios/nuevo">
            <Button className="bg-primary hover:bg-primary/90">
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Usuarios</p>
                  <p className="text-2xl font-bold">{totalUsuarios}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activos</p>
                  <p className="text-2xl font-bold">{usuariosActivos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-red-100 p-3">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Administradores</p>
                  <p className="text-2xl font-bold">{admins}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <UserCog className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coordinadores</p>
                  <p className="text-2xl font-bold">{coordinadores}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filtroRol} onValueChange={setFiltroRol}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los roles</SelectItem>
                  {roles.map((rol) => (
                    <SelectItem key={rol} value={rol}>{rol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios Registrados</CardTitle>
            <CardDescription>
              {cargando ? "Cargando usuarios..." : `${usuariosFiltrados.length} usuario(s) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Organización</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Cargando usuarios...
                    </TableCell>
                  </TableRow>
                )}
                {!cargando && !error && usuariosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                )}
                {usuariosFiltrados.map((usuario) => {
                  const nombreCompleto = getNombreCompleto(usuario)
                  const organizacion = usuario.nombreInstitucion || usuario.nombreMacroregion || "-"
                  return (
                    <TableRow key={usuario.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(nombreCompleto)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{nombreCompleto}</p>
                            <p className="text-sm text-muted-foreground">{usuario.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRolColor(usuario.nombreRol)}>
                          {getRolLabel(usuario.nombreRol)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{organizacion}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {usuario.estado ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-sm text-green-600">Activo</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-gray-400" />
                            <span className="text-sm text-gray-500">Inactivo</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatFecha(usuario.ultimoAcceso)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <Link href={`/usuarios/${usuario.id}`}>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalle
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/usuarios/${usuario.id}/editar`}>
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem>
                              <Shield className="mr-2 h-4 w-4" />
                              Gestionar permisos
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Roles y Permisos */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Roles del Sistema</CardTitle>
              <CardDescription>Descripción de roles y capacidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-red-200 bg-red-50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-700">Administrador</h3>
                </div>
                <p className="text-sm text-red-600">
                  Acceso total al sistema. Gestiona usuarios, configuraciones y tiene permisos de eliminación.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <UserCog className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-700">Coordinador</h3>
                </div>
                <p className="text-sm text-blue-600">
                  Gestiona proyectos asignados, aprueba informes y supervisa el trabajo del equipo técnico.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-green-200 bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-700">Técnico</h3>
                </div>
                <p className="text-sm text-green-600">
                  Crea y edita proyectos e informes. Registra avances y sube documentos de soporte.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-700">Consultor</h3>
                </div>
                <p className="text-sm text-purple-600">
                  Acceso de solo lectura a proyectos e informes. Puede generar reportes y exportar datos.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Matriz de Permisos</CardTitle>
              <CardDescription>Acciones permitidas por rol</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permiso</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead className="text-center">Coord</TableHead>
                    <TableHead className="text-center">Téc</TableHead>
                    <TableHead className="text-center">Cons</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Ver proyectos</TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Crear proyectos</TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><XCircle className="h-4 w-4 text-red-400 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Aprobar informes</TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><XCircle className="h-4 w-4 text-red-400 mx-auto" /></TableCell>
                    <TableCell className="text-center"><XCircle className="h-4 w-4 text-red-400 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Gestionar usuarios</TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><XCircle className="h-4 w-4 text-red-400 mx-auto" /></TableCell>
                    <TableCell className="text-center"><XCircle className="h-4 w-4 text-red-400 mx-auto" /></TableCell>
                    <TableCell className="text-center"><XCircle className="h-4 w-4 text-red-400 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Eliminar datos</TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><XCircle className="h-4 w-4 text-red-400 mx-auto" /></TableCell>
                    <TableCell className="text-center"><XCircle className="h-4 w-4 text-red-400 mx-auto" /></TableCell>
                    <TableCell className="text-center"><XCircle className="h-4 w-4 text-red-400 mx-auto" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Exportar reportes</TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                    <TableCell className="text-center"><CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

function getNombreCompleto(usuario: UsuarioResponse) {
  return `${usuario.nombres} ${usuario.apellidos}`.trim()
}

function getEstadoValue(estado: boolean) {
  return estado ? "activo" : "inactivo"
}

function normalizeRol(rol: string) {
  return rol
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function formatFecha(fecha: string | null) {
  if (!fecha) return "-"

  const parsed = new Date(fecha)
  if (Number.isNaN(parsed.getTime())) return fecha

  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}
