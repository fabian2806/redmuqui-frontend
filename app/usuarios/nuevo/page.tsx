"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { organizaciones } from "@/lib/data"
import { 
  ArrowLeft, 
  Save,
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Eye,
  EyeOff
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: "",
    rol: "",
    organizacionId: "",
    estado: "activo",
    permisos: {
      ver_proyectos: true,
      crear_proyectos: false,
      editar_proyectos: false,
      eliminar_proyectos: false,
      aprobar_informes: false,
      gestionar_usuarios: false,
      exportar_reportes: true,
      configurar_sistema: false
    }
  })

  const handleRolChange = (rol: string) => {
    let nuevosPermisos = { ...formData.permisos }
    
    switch (rol) {
      case "administrador":
        nuevosPermisos = {
          ver_proyectos: true,
          crear_proyectos: true,
          editar_proyectos: true,
          eliminar_proyectos: true,
          aprobar_informes: true,
          gestionar_usuarios: true,
          exportar_reportes: true,
          configurar_sistema: true
        }
        break
      case "coordinador":
        nuevosPermisos = {
          ver_proyectos: true,
          crear_proyectos: true,
          editar_proyectos: true,
          eliminar_proyectos: false,
          aprobar_informes: true,
          gestionar_usuarios: false,
          exportar_reportes: true,
          configurar_sistema: false
        }
        break
      case "tecnico":
        nuevosPermisos = {
          ver_proyectos: true,
          crear_proyectos: true,
          editar_proyectos: true,
          eliminar_proyectos: false,
          aprobar_informes: false,
          gestionar_usuarios: false,
          exportar_reportes: true,
          configurar_sistema: false
        }
        break
      case "consultor":
        nuevosPermisos = {
          ver_proyectos: true,
          crear_proyectos: false,
          editar_proyectos: false,
          eliminar_proyectos: false,
          aprobar_informes: false,
          gestionar_usuarios: false,
          exportar_reportes: true,
          configurar_sistema: false
        }
        break
    }
    
    setFormData({ ...formData, rol, permisos: nuevosPermisos })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Aquí iría la lógica para guardar el usuario
    router.push("/usuarios")
  }

  const permisosLabels: Record<string, { label: string; description: string }> = {
    ver_proyectos: { 
      label: "Ver proyectos e informes", 
      description: "Acceso de lectura a todos los proyectos e informes" 
    },
    crear_proyectos: { 
      label: "Crear proyectos e informes", 
      description: "Puede crear nuevos proyectos e informes" 
    },
    editar_proyectos: { 
      label: "Editar proyectos e informes", 
      description: "Puede modificar proyectos e informes existentes" 
    },
    eliminar_proyectos: { 
      label: "Eliminar proyectos e informes", 
      description: "Puede eliminar permanentemente datos del sistema" 
    },
    aprobar_informes: { 
      label: "Aprobar informes y productos", 
      description: "Puede aprobar y publicar informes oficiales" 
    },
    gestionar_usuarios: { 
      label: "Gestionar usuarios", 
      description: "Puede crear, editar y eliminar usuarios" 
    },
    exportar_reportes: { 
      label: "Exportar reportes", 
      description: "Puede generar y descargar reportes del sistema" 
    },
    configurar_sistema: { 
      label: "Configurar sistema", 
      description: "Acceso a configuraciones avanzadas del sistema" 
    }
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
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nuevo Usuario</h1>
            <p className="text-muted-foreground">Registra un nuevo usuario en el sistema</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Información personal */}
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
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        className="pl-9"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="telefono"
                        placeholder="+51 999 999 999"
                        className="pl-9"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizacion">Organización *</Label>
                    <Select 
                      value={formData.organizacionId} 
                      onValueChange={(value) => setFormData({ ...formData, organizacionId: value })}
                    >
                      <SelectTrigger>
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Seleccionar organización" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizaciones.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repetir contraseña"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rol y Estado */}
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
                  <Select value={formData.rol} onValueChange={handleRolChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrador">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          Administrador
                        </div>
                      </SelectItem>
                      <SelectItem value="coordinador">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          Coordinador
                        </div>
                      </SelectItem>
                      <SelectItem value="tecnico">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          Técnico
                        </div>
                      </SelectItem>
                      <SelectItem value="consultor">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-purple-500" />
                          Consultor
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
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

                {formData.rol && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <p className="font-medium mb-1">
                      {formData.rol === "administrador" && "Administrador"}
                      {formData.rol === "coordinador" && "Coordinador"}
                      {formData.rol === "tecnico" && "Técnico"}
                      {formData.rol === "consultor" && "Consultor"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formData.rol === "administrador" && "Acceso completo al sistema"}
                      {formData.rol === "coordinador" && "Gestiona proyectos y aprueba informes"}
                      {formData.rol === "tecnico" && "Crea y edita proyectos"}
                      {formData.rol === "consultor" && "Solo lectura y exportación"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Permisos */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Permisos Específicos</CardTitle>
                <CardDescription>
                  Los permisos se configuran automáticamente según el rol. Puedes personalizarlos si es necesario.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(permisosLabels).map(([key, { label, description }]) => (
                    <div 
                      key={key} 
                      className={`p-4 rounded-lg border transition-colors ${
                        formData.permisos[key as keyof typeof formData.permisos] 
                          ? "border-primary/50 bg-primary/5" 
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={key}
                          checked={formData.permisos[key as keyof typeof formData.permisos]}
                          onCheckedChange={(checked) => 
                            setFormData({
                              ...formData,
                              permisos: {
                                ...formData.permisos,
                                [key]: checked === true
                              }
                            })
                          }
                        />
                        <div>
                          <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                            {label}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">{description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Link href="/usuarios">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" />
              Crear Usuario
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
