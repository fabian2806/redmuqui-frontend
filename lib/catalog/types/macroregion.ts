/**
 * DTOs de `com.redmuqui.platform.macroregion.dto.*`
 * Sin `activo` ni `estado` (eliminados en el contrato del frontend).
 */

export interface MacroregionResponseDTO {
  id: number
  nombre: string
  descripcion: string | null
}

export interface MacroregionCreateDTO {
  nombre: string
  descripcion?: string | null
}

export interface MacroregionUpdateDTO {
  nombre: string
  descripcion?: string | null
}
