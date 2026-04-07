"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Settings,
  Bell,
  Shield,
  Database,
  Globe,
  Mail,
  Palette,
  Save,
  RefreshCw
} from "lucide-react"
import { useState } from "react"

export default function ConfiguracionPage() {
  const [notificacionesEmail, setNotificacionesEmail] = useState(true)
  const [notificacionesPush, setNotificacionesPush] = useState(false)
  const [modoOscuro, setModoOscuro] = useState(false)
  const [backupAutomatico, setBackupAutomatico] = useState(true)

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Configuración</h1>
          <p className="text-sm text-[#5C5C5C]">
            Administra las preferencias y ajustes del sistema
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="notificaciones" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
            <TabsTrigger value="sistema" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Sistema</span>
            </TabsTrigger>
          </TabsList>

          {/* General */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Información de la Organización
                </CardTitle>
                <CardDescription>
                  Datos generales de Red Muqui en la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Nombre de la Organización</Label>
                    <Input id="org-name" defaultValue="Red Muqui" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-ruc">RUC</Label>
                    <Input id="org-ruc" defaultValue="20123456789" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-email">Correo Institucional</Label>
                    <Input id="org-email" type="email" defaultValue="contacto@muqui.org" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-phone">Teléfono</Label>
                    <Input id="org-phone" defaultValue="+51 1 234 5678" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-address">Dirección</Label>
                  <Input id="org-address" defaultValue="Jr. Ejemplo 123, Lima, Perú" />
                </div>
                <div className="flex justify-end">
                  <Button className="bg-primary hover:bg-primary/90">
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Apariencia
                </CardTitle>
                <CardDescription>
                  Personaliza la apariencia de la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo Oscuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa el tema oscuro para reducir la fatiga visual
                    </p>
                  </div>
                  <Switch
                    checked={modoOscuro}
                    onCheckedChange={setModoOscuro}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color Principal</Label>
                  <div className="flex gap-3">
                    {["#FFD600", "#C8102E", "#2E7D32", "#1565C0", "#6A1B9A"].map((color) => (
                      <button
                        key={color}
                        className="h-8 w-8 rounded-full border-2 border-transparent ring-offset-2 hover:ring-2 hover:ring-primary"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notificaciones */}
          <TabsContent value="notificaciones" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Notificaciones por Correo
                </CardTitle>
                <CardDescription>
                  Configura qué notificaciones deseas recibir por email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificaciones por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibir alertas y actualizaciones por correo electrónico
                    </p>
                  </div>
                  <Switch
                    checked={notificacionesEmail}
                    onCheckedChange={setNotificacionesEmail}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Resumen Semanal</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibir un resumen de actividades cada semana
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertas de Vencimiento</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar cuando un proyecto o actividad está próximo a vencer
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notificaciones Push
                </CardTitle>
                <CardDescription>
                  Configura las notificaciones en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificaciones Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibir notificaciones en el navegador
                    </p>
                  </div>
                  <Switch
                    checked={notificacionesPush}
                    onCheckedChange={setNotificacionesPush}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sonido de Notificación</Label>
                    <p className="text-sm text-muted-foreground">
                      Reproducir sonido al recibir una notificación
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seguridad */}
          <TabsContent value="seguridad" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Seguridad de la Cuenta
                </CardTitle>
                <CardDescription>
                  Configura las opciones de seguridad
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña Actual</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nueva Contraseña</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-primary hover:bg-primary/90">
                    Cambiar Contraseña
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Autenticación de Dos Factores</CardTitle>
                <CardDescription>
                  Añade una capa extra de seguridad a tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autenticación 2FA</Label>
                    <p className="text-sm text-muted-foreground">
                      Requiere un código adicional al iniciar sesión
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm text-yellow-800">
                    La autenticación de dos factores añade una capa adicional de seguridad. 
                    Una vez activada, necesitarás tu contraseña y un código de verificación 
                    para acceder a tu cuenta.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sesiones Activas</CardTitle>
                <CardDescription>
                  Gestiona los dispositivos donde has iniciado sesión
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Este dispositivo</p>
                      <p className="text-sm text-muted-foreground">Lima, Perú - Chrome en Windows</p>
                      <p className="text-xs text-muted-foreground">Última actividad: Ahora</p>
                    </div>
                    <div className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                      Activo
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Cerrar todas las demás sesiones
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sistema */}
          <TabsContent value="sistema" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Respaldo de Datos
                </CardTitle>
                <CardDescription>
                  Configura las opciones de respaldo del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Respaldo Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Realizar respaldo automático cada 24 horas
                    </p>
                  </div>
                  <Switch
                    checked={backupAutomatico}
                    onCheckedChange={setBackupAutomatico}
                  />
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Último Respaldo</p>
                      <p className="text-sm text-muted-foreground">6 de abril de 2026, 03:00 AM</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Respaldar Ahora
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información del Sistema</CardTitle>
                <CardDescription>
                  Detalles técnicos de la plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Versión</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Entorno</span>
                    <span className="font-medium">Producción</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Base de Datos</span>
                    <span className="font-medium">PostgreSQL 15</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Almacenamiento Usado</span>
                    <span className="font-medium">2.4 GB / 10 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última Actualización</span>
                    <span className="font-medium">1 de abril de 2026</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
                <CardDescription>
                  Acciones irreversibles del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
                  <div>
                    <p className="font-medium text-red-700">Eliminar todos los datos</p>
                    <p className="text-sm text-red-600">
                      Esta acción eliminará permanentemente todos los datos del sistema
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Eliminar Todo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
