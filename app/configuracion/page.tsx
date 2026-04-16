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
                  Información del Sistema
                </CardTitle>
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
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
