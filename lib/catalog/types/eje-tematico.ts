/**
 * DTOs de `com.redmuqui.platform.ejetematico.dto.*`
 */

export interface EjeTematicoResponseDTO {
  id: number
  nombre: string
  descripcion: string | null
}

export interface EjeTematicoCreateDTO {
  nombre: string
  descripcion?: string | null
}

export interface EjeTematicoUpdateDTO {
  nombre: string
  descripcion?: string | null
}
