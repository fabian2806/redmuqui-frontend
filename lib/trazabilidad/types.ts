import type { PageResponse } from "@/lib/types"

/**
 * Respuesta paginada del backend (`com.redmuqui.platform.common.dto.PageResponse`).
 * Alias `Page<T>` para alinear con la convención de Spring Data.
 */
export type Page<T> = PageResponse<T>

/** Parámetros de paginación Spring (`Pageable`: query `page`, `size`). */
export interface PaginationParams {
  page?: number
  size?: number
}

/**
 * `com.redmuqui.platform.trazabilidad.dto.BitacoraConsultaDTO` (HU021, RF-066).
 */
export interface BitacoraConsultaDTO {
  nombre: string
  descripcion: string
  tipoAccion: string
  /** LocalDateTime serializado como ISO-8601 */
  fecha: string
}

/**
 * `com.redmuqui.platform.trazabilidad.dto.ObservacionRequestDTO` (HU022, RF-067).
 */
export interface ObservacionRequestDTO {
  descripcion: string
  entidadReferenciada: string
  idEntidadReferenciada: number
}

/** `com.redmuqui.platform.trazabilidad.entity.EstadoObservacion` */
export type EstadoObservacion = "PENDIENTE" | "RESUELTA"

/**
 * `com.redmuqui.platform.trazabilidad.dto.ObservacionResponseDTO` (HU022, RF-068).
 */
export interface ObservacionResponseDTO {
  id: number
  descripcion: string
  /** LocalDateTime serializado como ISO-8601 */
  fecha: string
  estado: EstadoObservacion
  entidadReferenciada: string
  idEntidadReferenciada: number
  idUsuario: number | null
  nombreUsuario: string | null
  emailUsuario: string | null
}
