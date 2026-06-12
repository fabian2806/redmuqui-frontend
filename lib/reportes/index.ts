export type {
  Conteo,
  DocumentoReciente,
  Indicadores,
  ProyectoRiesgo,
} from "./types"

export {
  obtenerIndicadores,
  obtenerProyectosPorMacroregion,
  obtenerActividadesPorEstado,
  obtenerProyectosEnRiesgo,
  obtenerDocumentosRecientes,
} from "./reportes.service"

export type { NivelSemaforo, NivelRiesgo } from "./semaforo"
export { clasificarRiesgo, SEMAFORO } from "./semaforo"
