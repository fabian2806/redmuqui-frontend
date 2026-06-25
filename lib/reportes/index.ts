export type {
  ActividadReciente,
  CoberturaTerritorial,
  Conteo,
  ConteoPresupuesto,
  DocumentoReciente,
  Indicadores,
  MacroregionResumen,
  PresupuestoPorMoneda,
  ProyectoAvance,
  ProyectoRiesgo,
} from "./types"

export {
  obtenerIndicadores,
  obtenerProyectosPorMacroregion,
  obtenerProyectosPorEstado,
  obtenerProyectosPorEje,
  obtenerAvanceProyectos,
  obtenerActividadesPorEstado,
  obtenerProyectosEnRiesgo,
  obtenerDocumentosRecientes,
  obtenerDocumentosPorTipo,
  obtenerDocumentosPorEstado,
  obtenerResumenMacroregiones,
  obtenerActividadReciente,
  obtenerCoberturaTerritorial,
} from "./reportes.service"

export type { NivelSemaforo, NivelRiesgo } from "./semaforo"
export { clasificarRiesgo, SEMAFORO } from "./semaforo"
