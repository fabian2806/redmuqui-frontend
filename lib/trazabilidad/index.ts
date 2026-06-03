export type {
  BitacoraConsultaDTO,
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

export { crearObservacion, listarObservacionesPorEntidad } from "./observacion.service"
