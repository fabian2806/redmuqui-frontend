export interface MonedaResponseDTO {
  id: number
  nombre: string
  codigo: string
  simbolo: string
  activo: boolean
}

export interface MonedaCreateDTO {
  nombre: string
  codigo: string
  simbolo: string
  activo?: boolean
}

export interface MonedaUpdateDTO {
  nombre: string
  codigo: string
  simbolo: string
  activo: boolean
}
