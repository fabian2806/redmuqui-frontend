export interface TipoDocumentoResponseDTO {
  id: number
  nombre: string
  codigo: string
  descripcion: string | null
  activo: boolean
}

export interface TipoDocumentoCreateDTO {
  nombre: string
  codigo: string
  descripcion?: string | null
  activo?: boolean
}

export interface TipoDocumentoUpdateDTO {
  nombre: string
  codigo: string
  descripcion?: string | null
  activo: boolean
}
