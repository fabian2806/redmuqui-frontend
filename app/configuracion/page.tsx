"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SuccessDialog } from "@/components/ui/success-dialog"
import {
  Database,
  FileText,
  Globe,
  Save,
  Settings,
  Shield,
} from "lucide-react"

import {
  obtenerConfiguracion,
  actualizarConfiguracion,
  type ConfiguracionResponse,
} from "@/app/configuracion/configuracion"

export default function ConfiguracionPage() {
  const [general, setGeneral] = useState({
    nombreOrganizacion: "Red Muqui",
    nombrePlataforma: "Plataforma de Gestión Institucional",
    correoSoporte: "contacto@muqui.org",
    telefono: "+51 1 234 5678",
    direccion: "Lima, Perú",
    sistemaActivo: true,
  })

  const [documentos, setDocumentos] = useState({
    tamanioMaximoMb: "20",
    cantidadMaximaAdjuntos: "5",
    estadoInicial: "Registrado",
  })

  const [seguridad, setSeguridad] = useState({
    intentosMaximosLogin: "5",
    tiempoBloqueoMinutos: "15",
    duracionAccessTokenMinutos: "15",
    duracionRefreshTokenDias: "7",
    recuperacionPassword: true,
    cierrePorInactividad: true,
  })

  const [successOpen, setSuccessOpen] = useState(false)

  const handleGuardarCambios = async () => {
    const configuracion: ConfiguracionResponse = {
      general,
      documentos: {
        tamanioMaximoMb: Number(documentos.tamanioMaximoMb),
        cantidadMaximaAdjuntos: Number(documentos.cantidadMaximaAdjuntos),
        estadoInicial: documentos.estadoInicial,
      },
      seguridad: {
        intentosMaximosLogin: Number(seguridad.intentosMaximosLogin),
        tiempoBloqueoMinutos: Number(seguridad.tiempoBloqueoMinutos),
        duracionAccessTokenMinutos: Number(seguridad.duracionAccessTokenMinutos),
        duracionRefreshTokenDias: Number(seguridad.duracionRefreshTokenDias),
        recuperacionPassword: seguridad.recuperacionPassword,
        cierrePorInactividad: seguridad.cierrePorInactividad,
      },
    }

    try {
      setSaving(true)

      const data = await actualizarConfiguracion(configuracion)

      setGeneral(data.general)

      setDocumentos({
        tamanioMaximoMb: String(data.documentos.tamanioMaximoMb),
        cantidadMaximaAdjuntos: String(data.documentos.cantidadMaximaAdjuntos),
        estadoInicial: data.documentos.estadoInicial,
      })

      setSeguridad({
        intentosMaximosLogin: String(data.seguridad.intentosMaximosLogin),
        tiempoBloqueoMinutos: String(data.seguridad.tiempoBloqueoMinutos),
        duracionAccessTokenMinutos: String(data.seguridad.duracionAccessTokenMinutos),
        duracionRefreshTokenDias: String(data.seguridad.duracionRefreshTokenDias),
        recuperacionPassword: data.seguridad.recuperacionPassword,
        cierrePorInactividad: data.seguridad.cierrePorInactividad,
      })

      setSuccessOpen(true)
    } catch (error) {
      console.error("Error al guardar configuración:", error)
    } finally {
      setSaving(false)
    }
  }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function cargarConfiguracion() {
      try {
        setLoading(true)

        const data = await obtenerConfiguracion()

        setGeneral(data.general)

        setDocumentos({
          tamanioMaximoMb: String(data.documentos.tamanioMaximoMb),
          cantidadMaximaAdjuntos: String(data.documentos.cantidadMaximaAdjuntos),
          estadoInicial: data.documentos.estadoInicial,
        })

        setSeguridad({
          intentosMaximosLogin: String(data.seguridad.intentosMaximosLogin),
          tiempoBloqueoMinutos: String(data.seguridad.tiempoBloqueoMinutos),
          duracionAccessTokenMinutos: String(data.seguridad.duracionAccessTokenMinutos),
          duracionRefreshTokenDias: String(data.seguridad.duracionRefreshTokenDias),
          recuperacionPassword: data.seguridad.recuperacionPassword,
          cierrePorInactividad: data.seguridad.cierrePorInactividad,
        })
      } catch (error) {
        console.error("Error al cargar configuración:", error)
      } finally {
        setLoading(false)
      }
    }

    cargarConfiguracion()
  }, [])

  return (
    <AppLayout>
      <PermissionGuard permiso="CATALOGOS_MANAGE">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">
                Configuración
              </h1>
              <p className="text-sm text-[#5C5C5C]">
                Administra los parámetros generales de la plataforma Red Muqui
              </p>
            </div>

          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleGuardarCambios}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
          </div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[620px]">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>

              <TabsTrigger value="documentos" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Documentos</span>
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

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Información institucional
                  </CardTitle>
                  <CardDescription>
                    Datos principales que identifican a Red Muqui dentro de la plataforma.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre-organizacion">
                        Nombre de la organización
                      </Label>
                      <Input
                        id="nombre-organizacion"
                        value={general.nombreOrganizacion}
                        onChange={(event) =>
                          setGeneral({
                            ...general,
                            nombreOrganizacion: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nombre-plataforma">
                        Nombre de la plataforma
                      </Label>
                      <Input
                        id="nombre-plataforma"
                        value={general.nombrePlataforma}
                        onChange={(event) =>
                          setGeneral({
                            ...general,
                            nombrePlataforma: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="correo-soporte">
                        Correo institucional
                      </Label>
                      <Input
                        id="correo-soporte"
                        type="email"
                        value={general.correoSoporte}
                        onChange={(event) =>
                          setGeneral({
                            ...general,
                            correoSoporte: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        value={general.telefono}
                        onChange={(event) =>
                          setGeneral({
                            ...general,
                            telefono: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Input
                      id="direccion"
                      value={general.direccion}
                      onChange={(event) =>
                        setGeneral({
                          ...general,
                          direccion: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label>Sistema activo</Label>
                      <p className="text-sm text-muted-foreground">
                        Indica si la plataforma se encuentra disponible para los usuarios.
                      </p>
                    </div>

                    <Switch
                      checked={general.sistemaActivo}
                      onCheckedChange={(checked) =>
                        setGeneral({
                          ...general,
                          sistemaActivo: checked,
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documentos" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Configuración de documentos
                  </CardTitle>
                  <CardDescription>
                    Define parámetros generales para el registro documental.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="tamanio-maximo">
                        Tamaño máximo por archivo
                      </Label>
                      <Input
                        id="tamanio-maximo"
                        type="number"
                        min="1"
                        value={documentos.tamanioMaximoMb}
                        onChange={(event) =>
                          setDocumentos({
                            ...documentos,
                            tamanioMaximoMb: event.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor expresado en MB.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cantidad-adjuntos">
                        Cantidad máxima de adjuntos
                      </Label>
                      <Input
                        id="cantidad-adjuntos"
                        type="number"
                        min="1"
                        value={documentos.cantidadMaximaAdjuntos}
                        onChange={(event) =>
                          setDocumentos({
                            ...documentos,
                            cantidadMaximaAdjuntos: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estado-inicial">
                        Estado inicial del documento
                      </Label>
                      <Input
                        id="estado-inicial"
                        value={documentos.estadoInicial}
                        onChange={(event) =>
                          setDocumentos({
                            ...documentos,
                            estadoInicial: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seguridad" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Seguridad del sistema
                  </CardTitle>
                  <CardDescription>
                    Parámetros generales de autenticación, bloqueo y sesiones.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="intentos-login">
                        Intentos máximos de login
                      </Label>
                      <Input
                        id="intentos-login"
                        type="number"
                        min="1"
                        value={seguridad.intentosMaximosLogin}
                        onChange={(event) =>
                          setSeguridad({
                            ...seguridad,
                            intentosMaximosLogin: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tiempo-bloqueo">
                        Tiempo de bloqueo
                      </Label>
                      <Input
                        id="tiempo-bloqueo"
                        type="number"
                        min="1"
                        value={seguridad.tiempoBloqueoMinutos}
                        onChange={(event) =>
                          setSeguridad({
                            ...seguridad,
                            tiempoBloqueoMinutos: event.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor expresado en minutos.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="access-token">
                        Access token
                      </Label>
                      <Input
                        id="access-token"
                        type="number"
                        min="1"
                        value={seguridad.duracionAccessTokenMinutos}
                        onChange={(event) =>
                          setSeguridad({
                            ...seguridad,
                            duracionAccessTokenMinutos: event.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Duración en minutos.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="refresh-token">
                        Refresh token
                      </Label>
                      <Input
                        id="refresh-token"
                        type="number"
                        min="1"
                        value={seguridad.duracionRefreshTokenDias}
                        onChange={(event) =>
                          setSeguridad({
                            ...seguridad,
                            duracionRefreshTokenDias: event.target.value,
                          })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Duración en días.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>Recuperación de contraseña</Label>
                        <p className="text-sm text-muted-foreground">
                          Permite que los usuarios soliciten recuperación de acceso.
                        </p>
                      </div>

                      <Switch
                        checked={seguridad.recuperacionPassword}
                        onCheckedChange={(checked) =>
                          setSeguridad({
                            ...seguridad,
                            recuperacionPassword: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label>Cierre por inactividad</Label>
                        <p className="text-sm text-muted-foreground">
                          Cierra la sesión cuando no se detecta actividad del usuario.
                        </p>
                      </div>

                      <Switch
                        checked={seguridad.cierrePorInactividad}
                        onCheckedChange={(checked) =>
                          setSeguridad({
                            ...seguridad,
                            cierrePorInactividad: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sistema" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Información del sistema
                  </CardTitle>
                  <CardDescription>
                    Detalles técnicos y estado operativo de la plataforma.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <InfoRow label="Versión" value="1.0.0" />
                    <InfoRow label="Entorno" value="Desarrollo" />
                    <InfoRow label="Frontend" value="Next.js / React / TypeScript" />
                    <InfoRow label="Backend" value="Spring Boot / Java 21" />
                    <InfoRow label="Base de datos" value="PostgreSQL" />
                    <InfoRow label="Almacenamiento" value="AWS S3 privado" />
                    <InfoRow label="Última actualización" value="Junio de 2026" last />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <SuccessDialog
          open={successOpen}
          onClose={() => setSuccessOpen(false)}
          title="Configuración actualizada"
          description="Los cambios de configuración se guardaron correctamente."
        />
      </PermissionGuard>
    </AppLayout>
  )
}

type InfoRowProps = {
  label: string
  value: string
  last?: boolean
}

function InfoRow({ label, value, last = false }: InfoRowProps) {
  return (
    <div className={`flex justify-between ${last ? "" : "border-b pb-2"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}