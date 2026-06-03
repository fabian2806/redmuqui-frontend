import { api } from "@/lib/api"
import { toPageQueryString } from "./pagination"
import type { BitacoraConsultaDTO, Page, PaginationParams } from "./types"

/**
 * HU021 — GET `/api/v1/bitacora` (RF-064).
 * Listado general de eventos de auditoría paginado.
 */
export async function consultarBitacoraGeneral(
  pagination?: PaginationParams,
): Promise<Page<BitacoraConsultaDTO>> {
  return api.get<Page<BitacoraConsultaDTO>>(`/bitacora${toPageQueryString(pagination)}`)
}

/**
 * HU021 — GET `/api/v1/bitacora/entidades/{entidadReferenciada}/{idEntidadRef}` (RF-065).
 * Historial de una entidad referenciada paginado.
 */
export async function consultarBitacoraPorEntidad(
  entidadReferenciada: string,
  idEntidadRef: number,
  pagination?: PaginationParams,
): Promise<Page<BitacoraConsultaDTO>> {
  const entidad = encodeURIComponent(entidadReferenciada)
  return api.get<Page<BitacoraConsultaDTO>>(
    `/bitacora/entidades/${entidad}/${idEntidadRef}${toPageQueryString(pagination)}`,
  )
}
