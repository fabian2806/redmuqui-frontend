import { api } from "@/lib/api"
import type {
  ObservacionRequestDTO,
  ObservacionResponseDTO,
  Page,
  PaginationParams,
} from "./types"

function toListadoQueryString(
  entidadReferenciada: string,
  idEntidadReferenciada: number,
  pagination?: PaginationParams,
): string {
  const search = new URLSearchParams()
  search.set("entidadReferenciada", entidadReferenciada)
  search.set("idEntidadReferenciada", String(idEntidadReferenciada))

  if (pagination?.page !== undefined) {
    search.set("page", String(pagination.page))
  }
  if (pagination?.size !== undefined) {
    search.set("size", String(pagination.size))
  }

  return `?${search.toString()}`
}

/**
 * HU022 — POST `/api/v1/observaciones` (RF-067).
 * Registra una observación o incidencia manual.
 */
export async function crearObservacion(
  body: ObservacionRequestDTO,
): Promise<ObservacionResponseDTO> {
  return api.post<ObservacionResponseDTO>("/observaciones", body)
}

/**
 * HU022 — GET `/api/v1/observaciones` (RF-068).
 * Historial paginado de observaciones de una entidad.
 */
export async function listarObservacionesPorEntidad(
  entidadReferenciada: string,
  idEntidadReferenciada: number,
  pagination?: PaginationParams,
): Promise<Page<ObservacionResponseDTO>> {
  return api.get<Page<ObservacionResponseDTO>>(
    `/observaciones${toListadoQueryString(entidadReferenciada, idEntidadReferenciada, pagination)}`,
  )
}
