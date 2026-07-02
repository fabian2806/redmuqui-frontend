/**
 * Métricas numéricas del proyecto que acompañan al resumen (Sprint 4 ⑤).
 * Salen de la misma ficha que el texto, así los gráficos y la narrativa cuadran.
 * Espejo de MetricasResumen del backend.
 */
export interface MetricasResumen {
  avance: number
  presupuestoTotal: number | null
  presupuestoEjecutado: number
  beneficiariosHombres: number
  beneficiariosMujeres: number
  actividadesFinalizadas: number
  actividadesEnCurso: number
  actividadesPendientes: number
  actividadesVencidas: number
  actividadesTotal: number
  hitosTotal: number
  hitosFinalizados: number
  hitosVencidos: number
  enRiesgo: boolean
}

/** Resumen ejecutivo de un proyecto generado con IA (Sprint 4 ⑤). Espejo de ResumenIaResponse del backend. */
export interface ResumenIa {
  idProyecto: number
  nombreProyecto: string
  codigoInterno: string
  /** Texto narrativo del resumen (secciones + recomendaciones). */
  resumen: string
  /** true si lo redactó el modelo de IA; false si es la plantilla local de respaldo. */
  generadoPorIa: boolean
  /** Modelo usado (p.ej. "claude-sonnet-4-6", "gemini-2.5-flash") o "plantilla-local". */
  modelo: string
  /** Mensaje opcional para el usuario (p.ej. por qué se usó la plantilla). */
  aviso: string | null
  /** Momento de generación (ISO LocalDateTime del backend). */
  generadoEn: string
  /** Cifras del proyecto para graficar. Puede faltar en cachés antiguas. */
  metricas: MetricasResumen | null
}
