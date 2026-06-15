/** Resumen ejecutivo de un proyecto generado con IA (Sprint 4 ⑤). Espejo de ResumenIaResponse del backend. */
export interface ResumenIa {
  idProyecto: number
  nombreProyecto: string
  codigoInterno: string
  /** Texto narrativo del resumen. */
  resumen: string
  /** true si lo redactó el modelo de IA; false si es la plantilla local de respaldo. */
  generadoPorIa: boolean
  /** Modelo usado (p.ej. "gemini-2.0-flash") o "plantilla-local". */
  modelo: string
  /** Mensaje opcional para el usuario (p.ej. por qué se usó la plantilla). */
  aviso: string | null
  /** Momento de generación (ISO LocalDateTime del backend). */
  generadoEn: string
}
