/**
 * DTOs de `com.redmuqui.platform.institucion.dto.*`
 */

export interface InstitucionResponseDTO {
  id: number
  nombre: string
  descripcion: string | null
  tipo: string | null
}

export interface InstitucionCreateDTO {
  nombre: string
  descripcion?: string | null
  tipo?: string | null
}

export interface InstitucionUpdateDTO {
  nombre: string
  descripcion?: string | null
  tipo?: string | null
}
