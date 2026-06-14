export type {
  BitacoraConsultaDTO,
  CriticidadIncidencia,
  EstadoObservacion,
  ObservacionRequestDTO,
  ObservacionResponseDTO,
  Page,
  PaginationParams,
} from "./types"

export {
  consultarBitacoraGeneral,
  consultarBitacoraPorEntidad,
} from "./bitacora.service"

export {
  cambiarEstadoObservacion,
  crearObservacion,
  listarObservacionesPorEntidad,
  resolverObservacion,
} from "./observacion.service"
