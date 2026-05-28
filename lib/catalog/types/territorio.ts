/**
 * DTOs de `com.redmuqui.platform.territorio.dto.*`
 */

export interface TerritorioResponseDTO {
  id: number
  nombre: string
  descripcion: string | null
}

export interface TerritorioCreateDTO {
  nombre: string
  descripcion: string
}

export interface TerritorioUpdateDTO {
  nombre: string
  descripcion: string
}
