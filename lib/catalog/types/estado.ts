export type ModuloEstado =
  | "PROYECTO"
  | "DOCUMENTO"
  | "ACTIVIDAD"
  | "SUBACTIVIDAD"
  | "OBSERVACION"
  | "INCIDENCIA"

export interface EstadoResponseDTO {
  id: number
  nombre: string
  codigo: string
  descripcion: string | null
  modulo: ModuloEstado
  activo: boolean
}

export interface EstadoCreateDTO {
  nombre: string
  codigo: string
  descripcion?: string | null
  modulo: ModuloEstado
  activo?: boolean
}

export interface EstadoUpdateDTO {
  nombre: string
  codigo: string
  descripcion?: string | null
  modulo: ModuloEstado
  activo: boolean
}
