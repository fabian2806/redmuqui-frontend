"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { SuccessDialog } from "@/components/ui/success-dialog"
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
import { api, ApiError } from "@/lib/api"
import type { Institucion, PageResponse, Rol, UsuarioResponse, UsuarioUpdate } from "@/lib/types"
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
  XCircle,
  AlertCircle,
  X,
  UserX
} from "lucide-react"
import Link from "next/link"

export default function UsuariosPage() {
  const { user: usuarioActual, hasPermission, loading: authLoading } = useAuth()
  const puedeVerUsuarios = hasPermission("USUARIOS_READ")
  const puedeCrearUsuarios = hasPermission("USUARIOS_CREATE")
  const puedeEditarUsuarios = hasPermission("USUARIOS_UPDATE")
  const puedeCambiarEstadoUsuarios = hasPermission("USUARIOS_DEACTIVATE")
  const puedeGestionarPermisos = hasPermission("USUARIOS_UPDATE")

  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [filtroRol, setFiltroRol] = useState("todos")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [rolesCatalogo, setRolesCatalogo] = useState<Rol[]>([])
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioResponse | null>(null)
  const [editData, setEditData] = useState({ nombre: "", email: "", telefono: "", rolId: "", institucion: "", estado: "activo" })
  const [savingEdit, setSavingEdit] = useState(false)
  const [feedbackCards, setFeedbackCards] = useState<{ id: number; type: "error"; title: string; description?: string }[]>([])

  const [successDialog, setSuccessDialog] = useState<{
    open: boolean
    title: string
    description?: string
  }>({
    open: false,
    title: "",
  })
  const [usuarioAConfirmar, setUsuarioAConfirmar] = useState<UsuarioResponse | null>(null)
  const [accionConfirmar, setAccionConfirmar] = useState<"activar" | "desactivar" | null>(null)

  useEffect(() => {
    let cancelado = false

    if (authLoading) return
    if (!puedeVerUsuarios) {
      setUsuarios([])
      setError(null)
      setCargando(false)
      return
    }

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
  }, [authLoading, puedeVerUsuarios])

  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [rolesData, institucionesData] = await Promise.all([api.get<Rol[]>("/roles"), api.get<Institucion[]>("/instituciones")])
        setRolesCatalogo(rolesData)
        setInstituciones(institucionesData)
      } catch (error) {
        console.error("No se pudieron cargar catálogos", error)
      }
    }
    void loadCatalogos()
  }, [])

  const addFeedbackCard = (card: { type: "error"; title: string; description?: string }) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setFeedbackCards((prev) => [...prev, { id, ...card }])
    setTimeout(() => setFeedbackCards((prev) => prev.filter((item) => item.id !== id)), 5000)
  }

  const showSuccessDialog = (title: string, description?: string) => {
    setSuccessDialog({
      open: true,
      title,
      description,
    })
  }

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

  const openEditModal = async (usuario: UsuarioResponse) => {
    if (!puedeEditarUsuarios) return

    setUsuarioEditando(usuario)
    setEditData(getEditDataFromUsuario(usuario))

    try {
      const detalle = await api.get<UsuarioResponse>(`/usuarios/${usuario.id}`)
      setUsuarioEditando(detalle)
      setEditData(getEditDataFromUsuario(detalle))
      setUsuarios((prev) => prev.map((item) => (item.id === detalle.id ? { ...item, ...detalle } : item)))
    } catch (err) {
      console.error("No se pudo cargar el detalle actualizado del usuario", err)
    }
  }

  const closeEditModal = () => {
    setUsuarioEditando(null)
    setSavingEdit(false)
  }

  const handleUpdateUsuario = async () => {
    if (!usuarioEditando || !puedeEditarUsuarios) return
    const validationErrors: { title: string; description: string }[] = []
    const telefonoLimpio = editData.telefono.trim()
    if (!editData.nombre.trim()) validationErrors.push({ title: "Nombre completo requerido", description: "Completa el nombre completo." })
    if (!editData.email.trim()) validationErrors.push({ title: "Correo electrónico requerido", description: "Ingresa un correo electrónico válido." })
    if (!editData.rolId) validationErrors.push({ title: "Rol requerido", description: "Selecciona el rol del usuario." })
    if (!editData.institucion) validationErrors.push({ title: "Organización requerida", description: "Selecciona una organización." })
    if (!telefonoLimpio) validationErrors.push({ title: "Teléfono requerido", description: "Ingresa el teléfono del usuario." })
    if (telefonoLimpio && !/^\d{9}$/.test(telefonoLimpio)) validationErrors.push({ title: "Teléfono inválido", description: "El teléfono debe contener solo números y exactamente 9 dígitos." })
    if (validationErrors.length > 0) {
      validationErrors.forEach((err) => addFeedbackCard({ type: "error", ...err }))
      return
    }
    const split = splitNombreCompleto(editData.nombre)
    const payload: UsuarioUpdate = {
      nombres: split.nombres,
      apellidos: split.apellidos,
      email: editData.email.trim(),
      telefono: telefonoLimpio || null,
      idRol: Number(editData.rolId),
      idInstitucion: Number(editData.institucion),
    }
    try {
      setSavingEdit(true)
      const actualizado = await api.put<UsuarioResponse>(`/usuarios/${usuarioEditando.id}`, payload)
      if ((editData.estado === "inactivo") !== !actualizado.estado) {
        await api.patch(`/usuarios/${usuarioEditando.id}/estado?activo=${editData.estado === "activo"}`)
        actualizado.estado = editData.estado === "activo"
      }
      setUsuarios((prev) => prev.map((u) => (u.id === actualizado.id ? { ...u, ...actualizado } : u)))
      closeEditModal()
      showSuccessDialog("Usuario actualizado correctamente", "Los cambios se guardaron exitosamente.")
    } catch (err) {
      setSavingEdit(false)
      if (err instanceof ApiError) {
        const labelMap: Record<string, string> = { nombres: "Nombre completo", apellidos: "Apellidos", email: "Correo electrónico", telefono: "Teléfono", idRol: "Rol", idInstitucion: "Organización" }
        if (err.body?.fieldErrors?.length) {
          err.body.fieldErrors.forEach((fieldError) => {
            addFeedbackCard({
              type: "error",
              title: `${labelMap[fieldError.field] ?? fieldError.field} inválido`,
              description: fieldError.message,
            })
          })
        } else {
          addFeedbackCard({ type: "error", title: "No se pudo actualizar el usuario", description: err.body?.message ?? "Revisa los datos e inténtalo nuevamente." })
        }
      } else {
        addFeedbackCard({ type: "error", title: "No se pudo actualizar el usuario", description: err instanceof Error ? err.message : "Revisa los datos e inténtalo nuevamente." })
      }
    }
  }

  const handleDesactivarUsuario = async (usuario: UsuarioResponse) => {
    try {
      await api.patch(`/usuarios/${usuario.id}/estado?activo=false`)
      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, estado: false } : u)))
      showSuccessDialog("Usuario desactivado correctamente", "El usuario fue desactivado exitosamente.")
    } catch (err) {
      addFeedbackCard({ type: "error", title: "No se pudo desactivar el usuario", description: err instanceof Error ? err.message : "Inténtalo nuevamente." })
    }
  }

  const handleActivarUsuario = async (usuario: UsuarioResponse) => {
    try {
      await api.patch(`/usuarios/${usuario.id}/estado?activo=true`)
      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, estado: true } : u)))
      showSuccessDialog("Usuario activado correctamente", "El usuario fue activado exitosamente.")
    } catch (err) {
      addFeedbackCard({ type: "error", title: "No se pudo activar el usuario", description: err instanceof Error ? err.message : "Inténtalo nuevamente." })
    }
  }

  const handleConfirmarAccion = async () => {
    if (!usuarioAConfirmar || !accionConfirmar) return

    const usuario = usuarioAConfirmar
    const accion = accionConfirmar

    setUsuarioAConfirmar(null)
    setAccionConfirmar(null)

    if (accion === "desactivar") {
      await handleDesactivarUsuario(usuario)
    } else {
      await handleActivarUsuario(usuario)
    }
  }

  const closeConfirmacion = () => {
    setUsuarioAConfirmar(null)
    setAccionConfirmar(null)
  }

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          Cargando permisos...
        </div>
      </AppLayout>
    )
  }

  if (!puedeVerUsuarios) {
    return (
      <AppLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center gap-4 px-4">
          <p className="text-lg font-semibold">Acceso restringido</p>
          <p className="max-w-md text-sm text-muted-foreground">
            No tienes permiso para ver la lista de usuarios. Si crees que es un error, contacta con el administrador.
          </p>
        </div>
      </AppLayout>
    )
  }

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
          {puedeCrearUsuarios && (
            <Link href="/usuarios/nuevo">
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </Link>
          )}
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
                  <SelectItem value="Activo">Activos</SelectItem>
                  <SelectItem value="Inactivo">Inactivos</SelectItem>
                  <SelectItem value="Pendiente">Pendientes</SelectItem>
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
                            {puedeEditarUsuarios && (
                              <DropdownMenuItem onClick={() => openEditModal(usuario)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {puedeGestionarPermisos && (
                              <DropdownMenuItem>
                                <Shield className="mr-2 h-4 w-4" />
                                Gestionar permisos
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {usuarioActual?.id === usuario.id ? (
                              <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                                <UserX className="mr-2 h-4 w-4" />
                                Desactivar (eres tú)
                              </DropdownMenuItem>
                            ) : puedeCambiarEstadoUsuarios ? (
                              <DropdownMenuItem onClick={() => { setUsuarioAConfirmar(usuario); setAccionConfirmar(usuario.estado ? "desactivar" : "activar") }} className={usuario.estado ? "text-orange-600" : "text-green-600"}>
                                <UserX className="mr-2 h-4 w-4" />
                                {usuario.estado ? "Desactivar" : "Activar"}
                              </DropdownMenuItem>
                            ) : null}
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
      <Dialog open={!!usuarioEditando} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>Actualiza la información del usuario seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2"><Label htmlFor="edit-nombre">Nombre completo *</Label><Input id="edit-nombre" value={editData.nombre} onChange={(e) => setEditData({ ...editData, nombre: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="edit-email">Correo electrónico *</Label><Input id="edit-email" type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="edit-telefono">Teléfono</Label><Input id="edit-telefono" inputMode="numeric" maxLength={9} value={editData.telefono} onChange={(e) => setEditData({ ...editData, telefono: e.target.value.replace(/\D/g, "").slice(0, 9) })} /></div>
              <div className="space-y-2"><Label>Estado</Label><Select value={editData.estado} onValueChange={(value) => setEditData({ ...editData, estado: value })} disabled={usuarioActual?.id === usuarioEditando?.id}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="activo">Activo</SelectItem><SelectItem value="inactivo" disabled={usuarioActual?.id === usuarioEditando?.id}>Inactivo</SelectItem></SelectContent></Select>{usuarioActual?.id === usuarioEditando?.id && <p className="text-xs text-muted-foreground">No puedes desactivar tu propia cuenta.</p>}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Rol *</Label><Select value={editData.rolId} onValueChange={(value) => setEditData({ ...editData, rolId: value })} disabled={usuarioActual?.id === usuarioEditando?.id}><SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger><SelectContent>{rolesCatalogo.map((rol) => (<SelectItem key={rol.id} value={String(rol.id)}>{rol.nombre}</SelectItem>))}</SelectContent></Select>{usuarioActual?.id === usuarioEditando?.id && <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol.</p>}</div>
              <div className="space-y-2"><Label>Organización *</Label><Select value={editData.institucion} onValueChange={(value) => setEditData({ ...editData, institucion: value })}><SelectTrigger><SelectValue placeholder="Seleccionar organización" /></SelectTrigger><SelectContent>{instituciones.map((institucion) => (<SelectItem key={institucion.id} value={String(institucion.id)}>{institucion.nombre}</SelectItem>))}</SelectContent></Select></div>
            </div>
            <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={closeEditModal}>Cancelar</Button><Button type="button" onClick={handleUpdateUsuario} disabled={savingEdit || !puedeEditarUsuarios}>{savingEdit ? "Guardando..." : "Guardar cambios"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!usuarioAConfirmar} onOpenChange={(open) => !open && closeConfirmacion()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar acción</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres {accionConfirmar === "desactivar" ? "desactivar" : "activar"} al usuario {usuarioAConfirmar ? getNombreCompleto(usuarioAConfirmar) : ""}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirmacion}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarAccion}>
              {accionConfirmar === "desactivar" ? "Desactivar" : "Activar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SuccessDialog
        open={successDialog.open}
        title={successDialog.title}
        description={successDialog.description ?? ""}
        onClose={() =>
          setSuccessDialog((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
      {feedbackCards.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[80] flex w-[min(92vw,420px)] flex-col gap-3">
          {feedbackCards.map((feedback) => (
            <div key={feedback.id} className="rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-start gap-3 p-4">
                <div className="mt-0.5 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                </div>

                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">{feedback.title}</p>
                  {feedback.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{feedback.description}</p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setFeedbackCards((prev) => prev.filter((item) => item.id !== feedback.id))
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}

function getNombreCompleto(usuario: UsuarioResponse) {
  return `${usuario.nombres} ${usuario.apellidos}`.trim()
}

function getEditDataFromUsuario(usuario: UsuarioResponse) {
  return {
    nombre: getNombreCompleto(usuario),
    email: usuario.email,
    telefono: usuario.telefono ?? "",
    rolId: String(usuario.idRol),
    institucion: usuario.idInstitucion ? String(usuario.idInstitucion) : "",
    estado: usuario.estado ? "activo" : "inactivo",
  }
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

function splitNombreCompleto(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return { nombres: fullName.trim(), apellidos: "-" }
  const half = Math.ceil(parts.length / 2)
  return { nombres: parts.slice(0, half).join(" "), apellidos: parts.slice(half).join(" ") }
}
