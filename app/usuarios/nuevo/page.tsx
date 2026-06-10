"use client"
import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { getPermisoTexto } from "@/lib/permissions"
import type { Institucion, Permiso, Rol, UsuarioCreate } from "@/lib/types"
import { ArrowLeft, Save, User, Mail, PhoneIcon, Building2, Shield, Eye, EyeOff, AlertCircle, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SuccessDialog } from "@/components/ui/success-dialog"

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const { loading: authLoading, hasPermission } = useAuth()
  const puedeCrearUsuarios = hasPermission("USUARIOS_CREATE")
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState<Rol[]>([])
  const [instituciones, setInstituciones] = useState<Institucion[]>([])
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<Permiso[]>([])
  const [cargandoPermisos, setCargandoPermisos] = useState(false)

  const [feedbackCards, setFeedbackCards] = useState<
  { id: number; type: "error"; title: string; description?: string }[]
  >([])

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: "",
    rolId: "",
    institucion: "",
    estado: "activo",
  })

  const [successOpen, setSuccessOpen] = useState(false)

  const [successMessage, setSuccessMessage] = useState({
    title: "",
    description: "",
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const getFieldError = (field: string) => fieldErrors[field]

  const fieldErrorClass = (field: string) =>
    fieldErrors[field] ? "border-[#C8102E] focus-visible:ring-[#C8102E]" : ""

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev

      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const showSuccessDialog = (title: string, description: string) => {
    setSuccessMessage({
      title,
      description,
    })

    setSuccessOpen(true)
  }

  const addFeedbackCard = (card: {
    type: "error"
    title: string
    description?: string
  }) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)

    setFeedbackCards((prev) => [...prev, { id, ...card }])

    setTimeout(() => {
      setFeedbackCards((prev) => prev.filter((item) => item.id !== id))
    }, 5000)
  }

  const closeFeedbackCard = (id: number) => setFeedbackCards((prev) => prev.filter((item) => item.id !== id))

  useEffect(() => {
    if (authLoading || !puedeCrearUsuarios) return

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
  }, [authLoading, puedeCrearUsuarios])

  const handleRolChange = async (rolId: string) => {
    const selectedRol = roles.find((role) => String(role.id) === rolId)

    setFormData({ ...formData, rolId })
    setPermisosSeleccionados(selectedRol?.permisos ?? [])

    if (!selectedRol || selectedRol.permisos?.length) {
      setCargandoPermisos(false)
      return
    }

    try {
      setCargandoPermisos(true)
      const permisos = await api.get<Permiso[]>(`/roles/${rolId}/permisos`)
      setPermisosSeleccionados(permisos)
      setRoles((prev) => prev.map((rol) => (String(rol.id) === rolId ? { ...rol, permisos } : rol)))
    } catch (error) {
      console.error("No se pudieron cargar los permisos del rol", error)
      setPermisosSeleccionados([])
    } finally {
      setCargandoPermisos(false)
    }
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
  const newFieldErrors: Record<string, string> = {}

  const addValidationError = (
    field: string,
    title: string,
    description: string
  ) => {
    newFieldErrors[field] = description
    validationErrors.push({ title, description })
  }

  if (!formData.nombre.trim()) {
    addValidationError(
      "nombre",
      "Nombre completo requerido",
      "Completa el nombre completo."
    )
  }

  if (!formData.email.trim()) {
    addValidationError(
      "email",
      "Correo electrónico requerido",
      "Ingresa un correo electrónico válido."
    )
  }

  if (!formData.institucion) {
    addValidationError(
      "institucion",
      "Organización requerida",
      "Selecciona una organización."
    )
  }

  if (!selectedRol) {
    addValidationError(
      "rolId",
      "Rol requerido",
      "Selecciona el rol del usuario."
    )
  }

  if (!formData.password.trim()) {
    addValidationError(
      "password",
      "Contraseña requerida",
      "Ingresa una contraseña segura."
    )
  }

  if (!formData.confirmPassword.trim()) {
    addValidationError(
      "confirmPassword",
      "Confirmación requerida",
      "Confirma la contraseña."
    )
  }

  if (
    formData.password &&
    formData.confirmPassword &&
    formData.password !== formData.confirmPassword
  ) {
    newFieldErrors.password = "La contraseña y su confirmación deben ser iguales."
    newFieldErrors.confirmPassword = "La contraseña y su confirmación deben ser iguales."

    validationErrors.push({
      title: "Contraseñas no coinciden",
      description: "La contraseña y su confirmación deben ser iguales.",
    })
  }

  if (formData.telefono.trim() && !/^\d{9}$/.test(formData.telefono.trim())) {
    addValidationError(
      "telefono",
      "Teléfono inválido",
      "El teléfono debe contener solo números y exactamente 9 dígitos."
    )
  }

  if (validationErrors.length > 0) {
    setFieldErrors(newFieldErrors)

    if (validationErrors.length === 1) {
      addFeedbackCard({
        type: "error",
        title: validationErrors[0].title,
        description: validationErrors[0].description,
      })
    } else {
      addFeedbackCard({
        type: "error",
        title: "Formulario incompleto",
        description:
          "Completa los campos obligatorios y corrige los datos inválidos para continuar.",
      })
    }

    return
  }

  setFieldErrors({})

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

      showSuccessDialog(
        "Usuario creado exitosamente",
        "El usuario se registró correctamente en el sistema."
      )
    } catch (error) {
      if (error instanceof ApiError) {
        const labelMap: Record<string, string> = { nombres: "Nombre completo", apellidos: "Apellidos", email: "Correo electrónico", telefono: "Teléfono", contrasenha: "Contraseña", idRol: "Rol", idInstitucion: "Organización" }
      if (error.body?.fieldErrors?.length) {
        const fieldErrors = error.body.fieldErrors

        const passwordErrors = fieldErrors.filter(
          (fieldError) => fieldError.field === "contrasenha"
        )

        const otrosErrores = fieldErrors.filter(
          (fieldError) => fieldError.field !== "contrasenha"
        )

        const erroresNormalizados: { title: string; description: string }[] = []

        if (passwordErrors.length > 0) {
          erroresNormalizados.push({
            title: "Contraseña no segura",
            description:
              "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.",
          })
        }

        otrosErrores.forEach((fieldError) => {
          erroresNormalizados.push({
            title: `${labelMap[fieldError.field] ?? fieldError.field} inválido`,
            description: fieldError.message.replace("contrasenha", "contraseña"),
          })
        })

        if (erroresNormalizados.length === 1) {
          addFeedbackCard({
            type: "error",
            title: erroresNormalizados[0].title,
            description: erroresNormalizados[0].description,
          })
        } else {
          addFeedbackCard({
            type: "error",
            title: "No se pudo registrar el usuario",
            description:
              "Revisa los campos obligatorios y corrige los datos inválidos para continuar.",
          })
        }
      } else {
        addFeedbackCard({
          type: "error",
          title: "No se pudo registrar el usuario",
          description:
            error.body?.message ?? "Revisa los datos e inténtalo nuevamente.",
        })
      }
      } else {
        addFeedbackCard({ type: "error", title: "Error inesperado", description: "Ocurrió un problema al registrar el usuario." })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout>
      <PermissionGuard permiso="USUARIOS_CREATE">
      <div className="space-y-6">
        <div className="flex items-center gap-4"><Link href="/usuarios"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link><div><h1 className="text-2xl font-bold text-foreground">Nuevo Usuario</h1><p className="text-muted-foreground">Registra un nuevo usuario en el sistema</p></div></div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información Personal
                </CardTitle>
                <CardDescription>Datos básicos del usuario</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Completo *</Label>
                    <Input
                      id="nombre"
                      placeholder="Ej: Juan Pérez García"
                      value={formData.nombre}
                      className={fieldErrorClass("nombre")}
                      onChange={(e) => {
                        setFormData({ ...formData, nombre: e.target.value })
                        clearFieldError("nombre")
                      }}
                    />

                    {getFieldError("nombre") && (
                      <p className="text-xs text-[#C8102E]">
                        {getFieldError("nombre")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico *</Label>

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        className={`pl-9 ${fieldErrorClass("email")}`}
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value })
                          clearFieldError("email")
                        }}
                      />
                    </div>

                    {getFieldError("email") && (
                      <p className="text-xs text-[#C8102E]">
                        {getFieldError("email")}
                      </p>
                    )}
                  </div>
                </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>

                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      id="telefono"
                      inputMode="numeric"
                      maxLength={9}
                      placeholder="999999999"
                      className={`pl-9 ${fieldErrorClass("telefono")}`}
                      value={formData.telefono}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          telefono: e.target.value.replace(/\D/g, "").slice(0, 9),
                        })
                        clearFieldError("telefono")
                      }}
                    />
                  </div>

                  {getFieldError("telefono") && (
                    <p className="text-xs text-[#C8102E]">
                      {getFieldError("telefono")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizacion">Organización *</Label>

                  <Select
                    value={formData.institucion}
                    onValueChange={(value) => {
                      setFormData({ ...formData, institucion: value })
                      clearFieldError("institucion")
                    }}
                  >
                    <SelectTrigger className={fieldErrorClass("institucion")}>
                      <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Seleccionar organización" />
                    </SelectTrigger>

                    <SelectContent>
                      {instituciones.map((institucion) => (
                        <SelectItem key={institucion.id} value={String(institucion.id)}>
                          {institucion.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {getFieldError("institucion") && (
                    <p className="text-xs text-[#C8102E]">
                      {getFieldError("institucion")}
                    </p>
                  )}
                </div>
              </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña *</Label>

                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        className={`pr-10 ${fieldErrorClass("password")}`}
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value })
                          clearFieldError("password")
                        }}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {getFieldError("password") && (
                      <p className="text-xs text-[#C8102E]">
                        {getFieldError("password")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>

                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repetir contraseña"
                      className={fieldErrorClass("confirmPassword")}
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData({ ...formData, confirmPassword: e.target.value })
                        clearFieldError("confirmPassword")
                      }}
                    />

                    {getFieldError("confirmPassword") && (
                      <p className="text-xs text-[#C8102E]">
                        {getFieldError("confirmPassword")}
                      </p>
                    )}
                  </div>
                </div>
                </CardContent>
                </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Rol y Estado
                </CardTitle>
                <CardDescription>Configuración de acceso</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol del Usuario *</Label>

                  <Select
                    value={formData.rolId}
                    onValueChange={(value) => {
                      clearFieldError("rolId")
                      void handleRolChange(value)
                    }}
                  >
                    <SelectTrigger className={fieldErrorClass("rolId")}>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>

                    <SelectContent>
                      {roles.map((rol) => (
                        <SelectItem key={rol.id} value={String(rol.id)}>
                          {rol.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {getFieldError("rolId") && (
                    <p className="text-xs text-[#C8102E]">
                      {getFieldError("rolId")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>

                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="activo">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          Activo
                        </div>
                      </SelectItem>

                      <SelectItem value="inactivo">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-gray-400" />
                          Inactivo
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3"><CardHeader><CardTitle>Permisos Específicos</CardTitle><CardDescription>Los permisos se asignan automáticamente según el rol seleccionado y no pueden editarse manualmente.</CardDescription></CardHeader><CardContent>{cargandoPermisos ? (<p className="text-sm text-muted-foreground">Cargando permisos del rol...</p>) : permisosSeleccionados.length > 0 ? (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{permisosSeleccionados.map((permiso) => { const permisoTexto = getPermisoTexto(permiso); return (<div key={permiso.id} className="rounded-lg border border-primary/50 bg-primary/5 p-4 transition-colors"><div className="flex items-start gap-3"><Checkbox id={`permiso-${permiso.id}`} checked disabled /><div><Label htmlFor={`permiso-${permiso.id}`} className="text-sm font-medium cursor-not-allowed">{permisoTexto.label}</Label><p className="text-xs text-muted-foreground mt-1">{permisoTexto.description}</p></div></div></div>) })}</div>) : (<p className="text-sm text-muted-foreground">{formData.rolId ? "Este rol no tiene permisos registrados." : "Selecciona un rol para ver sus permisos."}</p>)}</CardContent></Card>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6"><Link href="/usuarios"><Button type="button" variant="outline">Cancelar</Button></Link><Button type="submit" className="bg-primary hover:bg-primary/90" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Creando..." : "Crear Usuario"}</Button></div>
        </form>

        {feedbackCards.length > 0 && (
          <div className="fixed bottom-6 right-6 z-50 flex w-[min(92vw,420px)] flex-col gap-3">
            {feedbackCards.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-xl border border-[#C8102E]/20 bg-white p-4 shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#C8102E]">
                    <AlertCircle className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-[#C8102E]">
                      {feedback.title}
                    </p>

                    {feedback.description && (
                      <p className="mt-1 text-sm text-[#5C5C5C]">
                        {feedback.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => closeFeedbackCard(feedback.id)}
                    className="text-[#5C5C5C] hover:text-[#1A1A1A]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SuccessDialog
        open={successOpen}
        title={successMessage.title}
        description={successMessage.description}
        onClose={() => {
          setSuccessOpen(false)
          router.push("/usuarios")
        }}
      />
      </PermissionGuard>
    </AppLayout>
  )
}
