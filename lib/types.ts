// =====================================================================
// Tipos compartidos con el backend.
// Alineados con los DTOs Java en com.redmuqui.platform.*.dto.
// =====================================================================

// ----- Auth -----

export interface LoginRequest {
  email: string
  contrasenha: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresInMs: number
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RecoverRequest {
  email: string
}

export interface ResetRequest {
  token: string
  nuevaContrasenha: string
}

// ----- Usuario -----

export interface UsuarioResponse {
  id: number
  nombres: string
  apellidos: string
  email: string
  telefono: string | null
  estado: boolean
  nombreRol: string
  idRol: number
  nombreMacroregion: string | null
  idMacroregion: number | null
  nombreInstitucion: string | null
  idInstitucion: number | null
  ultimoAcceso: string | null
  // TODO(Squad Usuarios día 2-3): el backend debe agregar al DTO
  // un campo `permisos: string[]` con los nombres de permisos del rol
  // del usuario (ej. ["USUARIOS_READ", "PROYECTOS_CREATE", ...]).
  permisos?: string[]
}

export interface UsuarioCreate {
  nombres: string
  apellidos: string
  email: string
  telefono?: string | null
  contrasenha: string
  idRol: number
  idMacroregion?: number | null
  idInstitucion?: number | null
}

export interface UsuarioUpdate {
  nombres: string
  apellidos: string
  email: string
  telefono?: string | null
  idRol: number
  idMacroregion?: number | null
  idInstitucion?: number | null
}

// ----- Rol y permisos -----

export interface Rol {
  id: number
  nombre: string
  descripcion: string | null
  permisos?: Permiso[]
}

export interface Permiso {
  id: number
  nombre: string
  tipo: string | null
}

// ----- Catálogos -----

export interface Macroregion {
  id: number
  nombre: string
  descripcion: string | null
}

export interface Institucion {
  id: number
  nombre: string
  tipo: string | null
}

export interface Territorio {
  id: number
  nombre: string
  descripcion: string | null
}

export interface EjeTematico {
  id: number
  nombre: string
  descripcion: string | null
}

// ----- Proyecto -----

export type EstadoProyecto = "PENDIENTE" | "EN_CURSO" | "FINALIZADO"

export interface UsuarioSummary {
  id: number
  nombres: string
  apellidos: string
  email: string
}

export interface TerritorioRef {
  id: number
  nombre: string
}

export interface MacroregionRef {
  id: number
  nombre: string
}

export interface ProyectoResponse {
  id: number
  nombre: string
  codigoInterno: string
  descripcion: string | null
  objetivoGeneral: string | null
  fechaInicio: string
  fechaFinEstimada: string | null
  estado: EstadoProyecto
  nivelPrioridad: number | null
  porcentajeAvance: number | null
  presupuesto: number | null
  nombreMacroregion: string | null
  idMacroregion: number | null
  macroregiones: MacroregionRef[]
  nombreEjeTematico: string | null
  idEjeTematico: number | null
  responsablePrincipal: UsuarioSummary | null
  territorios: TerritorioRef[]
}

export interface ProyectoCreate {
  nombre: string
  codigoInterno: string
  descripcion?: string
  objetivoGeneral?: string
  fechaInicio: string
  fechaFinEstimada?: string
  estado?: EstadoProyecto
  nivelPrioridad?: number
  presupuesto?: number
  idMacroregion?: number
  idMacroregiones?: number[]
  idEjeTematico?: number
  idResponsablePrincipal?: number
  idTerritorios?: number[]
}

// ----- Actividad -----

export type EstadoActividad = "PENDIENTE" | "EN_CURSO" | "FINALIZADA"

export interface ActividadResponse {
  id: number
  nombre: string
  descripcion: string | null
  fechaInicio: string | null
  fechaFin: string | null
  estado: EstadoActividad
  idProyecto: number
  idResponsables: number[]
}

export interface ActividadCreate {
  nombre: string
  descripcion?: string
  fechaInicio?: string
  fechaFin?: string
  estado?: EstadoActividad
  idProyecto: number
  idResponsables?: number[]
}

// ----- Hito -----

export type EstadoHito = "PENDIENTE" | "EN_CURSO" | "FINALIZADO"

export interface HitoResponse {
  id: number
  nombre: string
  descripcion: string | null
  fechaClave: string
  estado: EstadoHito
  idProyecto: number
  fechaCreacion?: string | null
  fechaModificacion?: string | null
}

export interface HitoCreate {
  nombre: string
  descripcion?: string | null
  fechaClave: string
  estado: EstadoHito
}

// ----- Bitacora -----

export interface BitacoraResponse {
  id: number
  tipoAccion: string
  fecha: string
  descripcion: string
  entidadReferenciada: string
  idEntidadRef: number
  idUsuario: number | null
  nombreUsuario: string | null
}

export interface EquipoMember {
  idUsuario: number
  rolEnProyecto: string | null
}

// ----- Comunes -----

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface FieldError {
  field: string
  message: string
}

export interface ErrorResponse {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors?: FieldError[]
}
