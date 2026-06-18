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

export interface UsuarioPerfilUpdate {
  nombres: string
  apellidos: string
  email: string
  telefono?: string | null
}

export interface UsuarioPerfilUpdateResponse {
  usuario: UsuarioResponse
  tokens: TokenResponse
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

export type EstadoProyecto = "ACTIVO" | "CERRADO" | "SUSPENDIDO"

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

export interface InstitucionProyectoRef {
  id: number
  nombre: string
  tipoParticipacion: string | null
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
  instituciones: InstitucionProyectoRef[]
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

export interface ProyectoUpdate extends ProyectoCreate {
  porcentajeAvance?: number
}

export interface InstitucionParticipacion {
  idInstitucion: number
  tipoParticipacion?: string | null
}

export interface AsociarInstitucionesRequest {
  instituciones: InstitucionParticipacion[]
}

// ----- Actividad y Subactividad -----

export type EstadoActividad = "PENDIENTE" | "EN_CURSO" | "FINALIZADA" | "COMPLETADA" | "VENCIDA"

export interface SubactividadArchivoResponse {
  id: number
  nombre: string
  url: string
}

export interface SubactividadCreate {
  nombre: string
  idResponsable: number
  presupuesto?: number
  hombresInvolucrados?: number
  mujeresInvolucradas?: number
  fechaInicio?: string
  fechaFin?: string
  estado?: EstadoActividad
  descripcion?: string
}

export interface SubactividadCofinanciamientoResponse {
  actividadId: number
  monto: number
}

export interface SubactividadResponse {
  id: number
  nombre: string
  responsable: string
  presupuesto?: number
  hombresInvolucrados?: number
  mujeresInvolucradas?: number
  fechaInicio?: string
  fechaFin?: string
  estado?: EstadoActividad
  descripcion?: string
  archivosEvidencia?: SubactividadArchivoResponse[]
  cofinanciadoPor?: SubactividadCofinanciamientoResponse[]
}

export interface ActividadResponse {
  id: number
  nombre: string
  descripcion: string | null
  fechaInicio: string | null
  fechaFin: string | null
  estado: EstadoActividad
  porcentajeAvance: number | null
  idProyecto: number
  idHito: number | null
  nombreHito: string | null
  idResponsables: number[]
  subactividades?: SubactividadResponse[]
}

export interface ActividadCreate {
  nombre: string
  descripcion?: string
  fechaInicio?: string
  fechaFin?: string
  estado?: EstadoActividad
  idProyecto: number
  idHito: number
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
  porcentajeAvance: number
  fechaInicio: string | null
  fechaFin: string | null
  duracionDias: number
  totalActividades: number
  actividadesFinalizadas: number
  fechaCreacion?: string | null
  fechaModificacion?: string | null
}

export interface HitoCreate {
  nombre: string
  descripcion?: string | null
  fechaClave: string
  estado: EstadoHito
}

// ----- Documento -----

// Alineado con el enum EstadoDocumento del backend (RF-056).
export type EstadoDocumento = "BORRADOR" | "EN_REVISION" | "PUBLICADO"

// Tipos de documento permitidos al registrar (RF-046).
// Debe mantenerse IDÉNTICO al Set TIPOS_PERMITIDOS del backend (DocumentoService).
export const TIPOS_DOCUMENTO = [
  "Informe",
  "Pronunciamiento",
  "Investigación",
  "Manual",
  "Cartilla",
  "Resumen técnico",
] as const

export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

export interface DocumentoResponse {
  id: number
  titulo: string
  descripcion: string | null
  tipo: string | null
  estado: EstadoDocumento
  tipoArchivo: string | null
  fechaCarga: string
  enlace: string | null
  version: number
  idProyecto: number | null
  idEjeTematico: number | null
  idRespElaboracion: number | null
  idRespValidacion: number | null
  idTerritorios: number[]
}

export interface DocumentoCreate {
  titulo: string
  tipo: string
  descripcion?: string
  estado?: EstadoDocumento
  idProyecto?: number
  idEjeTematico?: number
  idRespElaboracion: number
  idRespValidacion?: number
  idTerritorios?: number[]
}

// RF-048: todos los campos editables incluyendo fechaCarga y estado
export interface DocumentoUpdate {
  titulo: string
  tipo: string
  descripcion?: string
  estado: EstadoDocumento
  tipoArchivo?: string
  enlace?: string
  fechaCarga: string
  idProyecto?: number
  idEjeTematico?: number
  idRespElaboracion: number
  idRespValidacion?: number
  idTerritorios?: number[]
}

export interface ArchivoResponse {
  id: number
  nombre: string
  url: string
  extension: string | null
  idDocumento: number | null
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
