// =====================================================================
// Tipos del módulo de Reportes e Indicadores (RF-069 a RF-074).
// Alineados con los DTOs Java en com.redmuqui.platform.reporte.dto.
// =====================================================================

import type { EstadoDocumento } from "@/lib/types"

/**
 * `com.redmuqui.platform.reporte.dto.IndicadoresDTO` (RF-069).
 * Cifras agregadas de la red para los KPIs del dashboard.
 */
export interface Indicadores {
  proyectosActivos: number
  proyectosEnRiesgo: number
  presupuestoTotal: number
  avancePromedio: number
  beneficiariosHombres: number
  beneficiariosMujeres: number
  documentosPublicados: number
  documentosPendientes: number
}

/**
 * `com.redmuqui.platform.reporte.dto.ConteoDTO`.
 * Par etiqueta/cantidad para las series de los gráficos (RF-073, RF-074).
 */
export interface Conteo {
  etiqueta: string
  cantidad: number
}

/**
 * `com.redmuqui.platform.reporte.dto.ProyectoRiesgoDTO` (RF-071).
 * Proyecto activo clasificado en riesgo.
 */
export interface ProyectoRiesgo {
  id: number
  nombre: string
  codigoInterno: string
  porcentajeAvance: number
  /** LocalDate serializado como ISO (yyyy-MM-dd); null si no tiene fin estimado. */
  fechaFinEstimada: string | null
  /** Días hasta el fin estimado (negativo si ya pasó); null si no hay fecha. */
  diasRestantes: number | null
  hitosVencidos: number
}

/**
 * `com.redmuqui.platform.reporte.dto.DocumentoRecienteDTO` (RF-072).
 */
export interface DocumentoReciente {
  id: number
  titulo: string
  tipo: string | null
  estado: EstadoDocumento
  /** LocalDate serializado como ISO (yyyy-MM-dd). */
  fechaCarga: string
}

/**
 * `com.redmuqui.platform.reporte.dto.CoberturaTerritorialDTO` (Sprint 4 ④).
 * Cobertura de la red por unidad territorial para el Mapa Territorial.
 */
export interface CoberturaTerritorial {
  idTerritorio: number
  /** UBIGEO (INEI); cruza con la geometría del mapa. Null en territorios libres. */
  codigo: string | null
  nombre: string
  /** Nivel del territorio (hoy "DEPARTAMENTO"). */
  tipo: string
  proyectos: number
  presupuesto: number
  beneficiarios: number
  instituciones: number
}
