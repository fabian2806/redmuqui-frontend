"use client"

import { useEffect, useMemo, useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SuccessDialog } from "@/components/ui/success-dialog"
import {
  Database,
  FileText,
  Globe,
  List,
  Save,
  Settings,
  Shield,
} from "lucide-react"

import {
  obtenerConfiguracion,
  actualizarConfiguracion,
  type ConfiguracionResponse,
} from "@/app/configuracion/configuracion"
import { CatalogoCrud, type CatalogService } from "@/app/configuracion/components/catalogo-crud"
import {
  macroregionCatalogService,
  ejeTematicoCatalogService,
  institucionCatalogService,
  estadoService,
  tipoDocumentoService,
  monedaService,
} from "@/lib/catalog"
import type { EstadoResponseDTO, EstadoCreateDTO, EstadoUpdateDTO, ModuloEstado } from "@/lib/catalog/types/estado"
import type { TipoDocumentoResponseDTO, TipoDocumentoCreateDTO, TipoDocumentoUpdateDTO } from "@/lib/catalog/types/tipo-documento"
import type { MonedaResponseDTO, MonedaCreateDTO, MonedaUpdateDTO } from "@/lib/catalog/types/moneda"
import type { MacroregionResponseDTO, MacroregionCreateDTO, MacroregionUpdateDTO } from "@/lib/catalog/types/macroregion"
import type { EjeTematicoResponseDTO, EjeTematicoCreateDTO, EjeTematicoUpdateDTO } from "@/lib/catalog/types/eje-tematico"
import type { InstitucionResponseDTO, InstitucionCreateDTO, InstitucionUpdateDTO } from "@/lib/catalog/types/institucion"

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
            <TabsList className="grid w-full grid-cols-5 lg:w-[780px]">
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

              <TabsTrigger value="catalogos" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Catálogos</span>
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

            <TabsContent value="catalogos" className="space-y-6">
              <Tabs defaultValue="macroregion" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                  <TabsTrigger value="macroregion">Macroregión</TabsTrigger>
                  <TabsTrigger value="eje-tematico">Eje temático</TabsTrigger>
                  <TabsTrigger value="estado">Estado</TabsTrigger>
                  <TabsTrigger value="instituciones">Instituciones</TabsTrigger>
                  <TabsTrigger value="tipo-documento">Tipo documento</TabsTrigger>
                  <TabsTrigger value="moneda">Moneda</TabsTrigger>
                </TabsList>

                <TabsContent value="macroregion">
                  <CatalogoCrud<MacroregionResponseDTO, MacroregionCreateDTO, MacroregionUpdateDTO>
                    title="Macroregión"
                    description="Administra las macroregiones geográficas de la plataforma."
                    service={macroregionCatalogService}
                    columns={[
                      { key: "nombre", header: "Nombre" },
                      { key: "descripcion", header: "Descripción" },
                      { key: "activo", header: "Activo" },
                    ]}
                    fields={[
                      { name: "nombre", label: "Nombre", type: "text", required: true },
                      { name: "descripcion", label: "Descripción", type: "textarea" },
                      { name: "activo", label: "Activo", type: "switch" },
                    ]}
                    emptyItem={{ nombre: "", descripcion: "", activo: true }}
                  />
                </TabsContent>

                <TabsContent value="eje-tematico">
                  <CatalogoCrud<EjeTematicoResponseDTO, EjeTematicoCreateDTO, EjeTematicoUpdateDTO>
                    title="Eje temático"
                    description="Administra los ejes temáticos de la plataforma."
                    service={ejeTematicoCatalogService}
                    columns={[
                      { key: "nombre", header: "Nombre" },
                      { key: "descripcion", header: "Descripción" },
                      { key: "activo", header: "Activo" },
                    ]}
                    fields={[
                      { name: "nombre", label: "Nombre", type: "text", required: true },
                      { name: "descripcion", label: "Descripción", type: "textarea" },
                      { name: "activo", label: "Activo", type: "switch" },
                    ]}
                    emptyItem={{ nombre: "", descripcion: "", activo: true }}
                  />
                </TabsContent>

                <TabsContent value="estado">
                  <EstadoCrud />
                </TabsContent>

                <TabsContent value="instituciones">
                  <CatalogoCrud<InstitucionResponseDTO, InstitucionCreateDTO, InstitucionUpdateDTO>
                    title="Institución miembro"
                    description="Administra las instituciones miembro de la plataforma."
                    service={institucionCatalogService}
                    columns={[
                      { key: "nombre", header: "Nombre" },
                      { key: "descripcion", header: "Descripción" },
                      { key: "tipo", header: "Tipo" },
                      { key: "activo", header: "Activo" },
                    ]}
                    fields={[
                      { name: "nombre", label: "Nombre", type: "text", required: true },
                      { name: "descripcion", label: "Descripción", type: "textarea" },
                      { name: "tipo", label: "Tipo", type: "text" },
                      { name: "activo", label: "Activo", type: "switch" },
                    ]}
                    emptyItem={{ nombre: "", descripcion: "", tipo: "", activo: true }}
                  />
                </TabsContent>

                <TabsContent value="tipo-documento">
                  <CatalogoCrud<TipoDocumentoResponseDTO, TipoDocumentoCreateDTO, TipoDocumentoUpdateDTO>
                    title="Tipo de documento"
                    description="Administra los tipos de documento de la plataforma."
                    service={tipoDocumentoService}
                    columns={[
                      { key: "nombre", header: "Nombre" },
                      { key: "codigo", header: "Código" },
                      { key: "activo", header: "Activo" },
                    ]}
                    fields={[
                      { name: "nombre", label: "Nombre", type: "text", required: true },
                      { name: "codigo", label: "Código", type: "text", required: true },
                      { name: "descripcion", label: "Descripción", type: "textarea" },
                      { name: "activo", label: "Activo", type: "switch" },
                    ]}
                    emptyItem={{ nombre: "", codigo: "", descripcion: "", activo: true }}
                  />
                </TabsContent>

                <TabsContent value="moneda">
                  <CatalogoCrud<MonedaResponseDTO, MonedaCreateDTO, MonedaUpdateDTO>
                    title="Moneda"
                    description="Administra las monedas de la plataforma."
                    service={monedaService}
                    columns={[
                      { key: "nombre", header: "Nombre" },
                      { key: "codigo", header: "Código" },
                      { key: "simbolo", header: "Símbolo" },
                      { key: "activo", header: "Activo" },
                    ]}
                    fields={[
                      { name: "nombre", label: "Nombre", type: "text", required: true },
                      { name: "codigo", label: "Código", type: "text", required: true },
                      { name: "simbolo", label: "Símbolo", type: "text", required: true },
                      { name: "activo", label: "Activo", type: "switch" },
                    ]}
                    emptyItem={{ nombre: "", codigo: "", simbolo: "", activo: true }}
                  />
                </TabsContent>
              </Tabs>
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

const MODULOS_ESTADO: { value: ModuloEstado; label: string }[] = [
  { value: "PROYECTO", label: "Proyecto" },
  { value: "DOCUMENTO", label: "Documento" },
  { value: "ACTIVIDAD", label: "Actividad" },
  { value: "SUBACTIVIDAD", label: "Subactividad" },
  { value: "OBSERVACION", label: "Observación" },
  { value: "INCIDENCIA", label: "Incidencia" },
]

function EstadoCrud() {
  const [modulo, setModulo] = useState<ModuloEstado>("PROYECTO")

  const service = useMemo<CatalogService<EstadoResponseDTO, EstadoCreateDTO & EstadoUpdateDTO>>(() => ({
    listarPaginado: (page, size) => estadoService.listarPaginado(modulo, page, size),
    crear: (body) => estadoService.crear(body),
    actualizar: (id, body) => estadoService.actualizar(id, body as EstadoUpdateDTO),
    eliminar: (id) => estadoService.eliminar(id),
  }), [modulo])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Label htmlFor="estado-modulo" className="whitespace-nowrap">
              Módulo
            </Label>
            <Select value={modulo} onValueChange={(value) => setModulo(value as ModuloEstado)}>
              <SelectTrigger id="estado-modulo" className="sm:w-[280px]">
                <SelectValue placeholder="Selecciona un módulo" />
              </SelectTrigger>
              <SelectContent>
                {MODULOS_ESTADO.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <CatalogoCrud<EstadoResponseDTO, EstadoCreateDTO & EstadoUpdateDTO, EstadoCreateDTO & EstadoUpdateDTO>
        key={modulo}
        title="Estado"
        description={`Administra los estados del módulo ${modulo.toLowerCase()}.`}
        service={service}
        columns={[
          { key: "nombre", header: "Nombre" },
          { key: "codigo", header: "Código" },
          { key: "modulo", header: "Módulo" },
          { key: "activo", header: "Activo" },
        ]}
        fields={[
          { name: "nombre", label: "Nombre", type: "text", required: true },
          { name: "codigo", label: "Código", type: "text", required: true },
          { name: "descripcion", label: "Descripción", type: "textarea" },
          {
            name: "modulo",
            label: "Módulo",
            type: "select",
            required: true,
            options: MODULOS_ESTADO,
          },
          { name: "activo", label: "Activo", type: "switch" },
        ]}
        emptyItem={{ nombre: "", codigo: "", descripcion: "", modulo, activo: true }}
      />
    </div>
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