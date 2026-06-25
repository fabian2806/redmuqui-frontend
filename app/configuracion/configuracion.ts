import { api } from "@/lib/api"

export type ConfiguracionResponse = {
  general: {
    nombreOrganizacion: string
    nombrePlataforma: string
    correoSoporte: string
    telefono: string
    direccion: string
    sistemaActivo: boolean
  }
  documentos: {
    tamanioMaximoMb: number
    cantidadMaximaAdjuntos: number
    estadoInicial: string
  }
  seguridad: {
    intentosMaximosLogin: number
    tiempoBloqueoMinutos: number
    duracionAccessTokenMinutos: number
    duracionRefreshTokenDias: number
    recuperacionPassword: boolean
    cierrePorInactividad: boolean
  }
}

export async function obtenerConfiguracion(): Promise<ConfiguracionResponse> {
  return api.get<ConfiguracionResponse>("/configuracion")
}

export async function actualizarConfiguracion(
  configuracion: ConfiguracionResponse,
): Promise<ConfiguracionResponse> {
  return api.put<ConfiguracionResponse>("/configuracion", configuracion)
}