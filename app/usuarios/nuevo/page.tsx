"use client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { api, ApiError } from "@/lib/api"
import type { Institucion, Rol, UsuarioCreate } from "@/lib/types"
import { ArrowLeft, Save, User, Mail, PhoneIcon, Building2, Shield, Eye, EyeOff, CheckCircle2, AlertCircle, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState<Rol[]>([])
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [feedbackCards, setFeedbackCards] = useState<{ id: number; type: "success" | "error"; title: string; description?: string }[]>([])
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: "",
    rolId: "",
    institucion: "",
    estado: "activo",
    permisos: {
      ver_proyectos: true,
      crear_proyectos: false,
      editar_proyectos: false,
      eliminar_proyectos: false,
      aprobar_informes: false,
      gestionar_usuarios: false,
      exportar_reportes: true,
      configurar_sistema: false,
    },
  })

  const addFeedbackCard = (card: { type: "success" | "error"; title: string; description?: string }) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setFeedbackCards((prev) => [...prev, { id, ...card }])
    setTimeout(() => setFeedbackCards((prev) => prev.filter((item) => item.id !== id)), 5000)
  }

  const closeFeedbackCard = (id: number) => setFeedbackCards((prev) => prev.filter((item) => item.id !== id))

  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [rolesData, institucionesData] = await Promise.all([api.get<Rol[]>("/roles"), api.get<Institucion[]>("/instituciones")])
        setRoles(rolesData)
        setInstituciones(institucionesData)
      } catch (error) {
        console.error("No se pudieron cargar los catálogos de usuario", error)
      }
    }
    void loadCatalogos()
  }, [])

  const handleRolChange = (rolId: string) => {
    let nuevosPermisos = { ...formData.permisos }
    const selectedRol = roles.find((role) => String(role.id) === rolId)
    const rolNombre = selectedRol?.nombre.toLowerCase() ?? ""

    switch (rolNombre) {
      case "administrador":
        nuevosPermisos = { ver_proyectos: true, crear_proyectos: true, editar_proyectos: true, eliminar_proyectos: true, aprobar_informes: true, gestionar_usuarios: true, exportar_reportes: true, configurar_sistema: true }
        break
      case "coordinador":
        nuevosPermisos = { ver_proyectos: true, crear_proyectos: true, editar_proyectos: true, eliminar_proyectos: false, aprobar_informes: true, gestionar_usuarios: false, exportar_reportes: true, configurar_sistema: false }
        break
      case "tecnico":
        nuevosPermisos = { ver_proyectos: true, crear_proyectos: true, editar_proyectos: true, eliminar_proyectos: false, aprobar_informes: false, gestionar_usuarios: false, exportar_reportes: true, configurar_sistema: false }
        break
      case "consultor":
        nuevosPermisos = { ver_proyectos: true, crear_proyectos: false, editar_proyectos: false, eliminar_proyectos: false, aprobar_informes: false, gestionar_usuarios: false, exportar_reportes: true, configurar_sistema: false }
        break
    }

    setFormData({ ...formData, rolId, permisos: nuevosPermisos })
  }

  const splitNombreCompleto = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length < 2) return { nombres: fullName.trim(), apellidos: "-" }
    const half = Math.ceil(parts.length / 2)
    return { nombres: parts.slice(0, half).join(" "), apellidos: parts.slice(half).join(" ") }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const selectedRol = roles.find((role) => String(role.id) === formData.rolId)
    const validationErrors: { title: string; description: string }[] = []
    if (!formData.nombre.trim()) validationErrors.push({ title: "Nombre completo requerido", description: "Completa el nombre completo." })
    if (!formData.email.trim()) validationErrors.push({ title: "Correo electrónico requerido", description: "Ingresa un correo electrónico válido." })
    if (!formData.institucion) validationErrors.push({ title: "Organización requerida", description: "Selecciona una organización." })
    if (!selectedRol) validationErrors.push({ title: "Rol requerido", description: "Selecciona el rol del usuario." })
    if (!formData.password.trim()) validationErrors.push({ title: "Contraseña requerida", description: "Ingresa una contraseña segura." })
    if (!formData.confirmPassword.trim()) validationErrors.push({ title: "Confirmación requerida", description: "Confirma la contraseña." })
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) validationErrors.push({ title: "Contraseñas no coinciden", description: "La contraseña y su confirmación deben ser iguales." })
    if (formData.telefono.trim() && !/^\d{9}$/.test(formData.telefono.trim())) validationErrors.push({ title: "Teléfono inválido", description: "El teléfono debe contener solo números y exactamente 9 dígitos." })

    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => addFeedbackCard({ type: "error", ...error }))
      return
    }

    const { nombres, apellidos } = splitNombreCompleto(formData.nombre)
    const payload: UsuarioCreate = {
      nombres,
      apellidos,
      email: formData.email,
      telefono: formData.telefono || null,
      contrasenha: formData.password,
      idRol: selectedRol!.id,
      idInstitucion: formData.institucion ? Number(formData.institucion) : null,
    }

    try {
      setSaving(true)
      setFeedbackCards([])
      await api.post("/usuarios", payload)

      if (formData.estado === "inactivo") {
        const creado = await api.get<{ content: { id: number; email: string }[] }>(`/usuarios?size=1&sort=createdAt,desc`)
        const usuario = creado.content.find((item) => item.email === formData.email)
        if (usuario?.id) await api.patch(`/usuarios/${usuario.id}/estado?activo=false`)
      }

      addFeedbackCard({ type: "success", title: "Usuario creado correctamente", description: "El usuario se registró exitosamente." })
      setTimeout(() => router.push("/usuarios"), 900)
    } catch (error) {
      if (error instanceof ApiError) {
        const labelMap: Record<string, string> = { nombres: "Nombre completo", apellidos: "Apellidos", email: "Correo electrónico", telefono: "Teléfono", contrasenha: "Contraseña", idRol: "Rol", idInstitucion: "Organización" }
        if (error.body?.fieldErrors?.length) {
          error.body.fieldErrors.forEach((fieldError) => {
            addFeedbackCard({
              type: "error",
              title: `${labelMap[fieldError.field] ?? fieldError.field} inválido`,
              description: fieldError.message.replace("contrasenha", "contraseña"),
            })
          })
        } else {
          addFeedbackCard({ type: "error", title: "No se pudo registrar el usuario", description: error.body?.message ?? "Revisa los datos e inténtalo nuevamente." })
        }
      } else {
        addFeedbackCard({ type: "error", title: "Error inesperado", description: "Ocurrió un problema al registrar el usuario." })
      }
    } finally {
      setSaving(false)
    }
  }

  const permisosLabels: Record<string, { label: string; description: string }> = {
    ver_proyectos: { label: "Ver proyectos e informes", description: "Acceso de lectura a todos los proyectos e informes" },
    crear_proyectos: { label: "Crear proyectos e informes", description: "Puede crear nuevos proyectos e informes" },
    editar_proyectos: { label: "Editar proyectos e informes", description: "Puede modificar proyectos e informes existentes" },
    eliminar_proyectos: { label: "Eliminar proyectos e informes", description: "Puede eliminar permanentemente datos del sistema" },
    aprobar_informes: { label: "Aprobar informes y productos", description: "Puede aprobar y publicar informes oficiales" },
    gestionar_usuarios: { label: "Gestionar usuarios", description: "Puede crear, editar y eliminar usuarios" },
    exportar_reportes: { label: "Exportar reportes", description: "Puede generar y descargar reportes del sistema" },
    configurar_sistema: { label: "Configurar sistema", description: "Acceso a configuraciones avanzadas del sistema" },
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Link href="/usuarios"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link><div><h1 className="text-2xl font-bold text-foreground">Nuevo Usuario</h1><p className="text-muted-foreground">Registra un nuevo usuario en el sistema</p></div></div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Información Personal</CardTitle><CardDescription>Datos básicos del usuario</CardDescription></CardHeader><CardContent className="space-y-6"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="nombre">Nombre Completo *</Label><Input id="nombre" placeholder="Ej: Juan Pérez García" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="email">Correo Electrónico *</Label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" placeholder="usuario@ejemplo.com" className="pl-9" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div></div></div>

                <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="telefono">Teléfono</Label><div className="relative"><PhoneIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="telefono" inputMode="numeric" maxLength={9} placeholder="999999999" className="pl-9" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value.replace(/\D/g, "").slice(0, 9) })} /></div></div><div className="space-y-2"><Label htmlFor="organizacion">Organización *</Label><Select value={formData.institucion} onValueChange={(value) => setFormData({ ...formData, institucion: value })}><SelectTrigger><Building2 className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Seleccionar organización" /></SelectTrigger><SelectContent>{instituciones.map((institucion) => (<SelectItem key={institucion.id} value={String(institucion.id)}>{institucion.nombre}</SelectItem>))}</SelectContent></Select></div></div>

                <Separator />
                <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="password">Contraseña *</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></div><div className="space-y-2"><Label htmlFor="confirmPassword">Confirmar Contraseña *</Label><Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Repetir contraseña" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} /></div></div></CardContent></Card>

            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Rol y Estado</CardTitle><CardDescription>Configuración de acceso</CardDescription></CardHeader><CardContent className="space-y-6"><div className="space-y-2"><Label htmlFor="rol">Rol del Usuario *</Label><Select value={formData.rolId} onValueChange={handleRolChange}><SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger><SelectContent>{roles.map((rol) => (<SelectItem key={rol.id} value={String(rol.id)}>{rol.nombre}</SelectItem>))}</SelectContent></Select></div><div className="space-y-2"><Label>Estado</Label><Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="activo"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-500" />Activo</div></SelectItem><SelectItem value="inactivo"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-gray-400" />Inactivo</div></SelectItem></SelectContent></Select></div></CardContent></Card>

            <Card className="lg:col-span-3"><CardHeader><CardTitle>Permisos Específicos</CardTitle><CardDescription>Los permisos se configuran automáticamente según el rol. Puedes personalizarlos si es necesario.</CardDescription></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(permisosLabels).map(([key, { label, description }]) => (<div key={key} className={`p-4 rounded-lg border transition-colors ${formData.permisos[key as keyof typeof formData.permisos] ? "border-primary/50 bg-primary/5" : "border-border"}`}><div className="flex items-start gap-3"><Checkbox id={key} checked={formData.permisos[key as keyof typeof formData.permisos]} onCheckedChange={(checked) => setFormData({ ...formData, permisos: { ...formData.permisos, [key]: checked === true } })} /><div><Label htmlFor={key} className="text-sm font-medium cursor-pointer">{label}</Label><p className="text-xs text-muted-foreground mt-1">{description}</p></div></div></div>))}</div></CardContent></Card>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6"><Link href="/usuarios"><Button type="button" variant="outline">Cancelar</Button></Link><Button type="submit" className="bg-primary hover:bg-primary/90" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Creando..." : "Crear Usuario"}</Button></div>
        </form>

        {feedbackCards.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50 flex w-[min(92vw,420px)] flex-col gap-3">
            {feedbackCards.map((feedback) => (
              <div key={feedback.id} className="rounded-xl border border-border bg-card shadow-xl">
                <div className="flex items-start gap-3 p-4">
                  <div className={`mt-0.5 ${feedback.type === "success" ? "text-green-600" : "text-destructive"}`}>
                    {feedback.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${feedback.type === "success" ? "text-green-700" : "text-destructive"}`}>{feedback.title}</p>
                    {feedback.description && <p className="mt-1 text-xs text-muted-foreground">{feedback.description}</p>}
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => closeFeedbackCard(feedback.id)}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
