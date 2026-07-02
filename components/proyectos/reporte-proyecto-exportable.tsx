"use client"

import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer"
import type { ActividadResponse, DocumentoResponse, FaseResponse, ProyectoResponse } from "@/lib/types"

Font.register({
  family: "Selawik",
  fonts: [
    { src: "/fonts/Selawik-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Selawik-Bold.ttf", fontWeight: 700 },
  ],
})

interface HitoExportable {
  id: string | number
  nombre: string
  estado: string
  fecha: string | null
  nombreFase?: string | null
  porcentajeAvance?: number | null
}

interface MiembroEquipo {
  nombre: string
  rol: string
}

interface ReporteProyectoExportableProps {
  proyecto: ProyectoResponse | null
  actividades: ActividadResponse[]
  hitos: HitoExportable[]
  fases: FaseResponse[]
  documentos: DocumentoResponse[]
  equipo: MiembroEquipo[]
}

const COLORS = {
  black: "#1A1A1A",
  gray: "#5C5C5C",
  lightGray: "#9CA3AF",
  border: "#E0E0E0",
  lightBorder: "#F0F0F0",
  background: "#F7F7F7",
  yellow: "#FFD600",
  white: "#FFFFFF",
  green: "#22C55E",
  orange: "#F59E0B",
  red: "#EF4444",
  darkRed: "#7F1D1D",
}

const PAGE = {
  marginX: 28,
  marginTop: 28,
  marginBottom: 28,
  headerHeight: 56,
  footerHeight: 20,
  headerGap: 12,
}

function redondearNumero(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0
  return Number(value.toFixed(1))
}

function redondear(value: number | null | undefined): string {
  return redondearNumero(value).toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function formatearFecha(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatearFechaHora(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
}

function formatearMoneda(value: number | null | undefined, moneda = "PEN"): string {
  if (value == null || Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda }).format(value)
}

function formatearEstado(estado: string): string {
  const map: Record<string, string> = { ACTIVO: "Activo", CERRADO: "Cerrado", SUSPENDIDO: "Suspendido" }
  return map[estado] ?? estado
}

function formatearEstadoActividad(estado: string): string {
  const map: Record<string, string> = { PENDIENTE: "Pendiente", EN_CURSO: "En curso", FINALIZADA: "Finalizada", CANCELADA: "Cancelada" }
  return map[estado] ?? estado
}

function formatearEstadoDocumento(estado: string): string {
  const map: Record<string, string> = { BORRADOR: "Borrador", EN_REVISION: "En revision", PUBLICADO: "Publicado" }
  return map[estado] ?? estado
}

function formatearAlertaPresupuesto(alerta: string | null | undefined): string {
  const map: Record<string, string> = { NORMAL: "Normal", PREVENTIVO: "Preventivo", CRITICO: "Critico", EXCEDIDO: "Excedido" }
  return map[alerta ?? ""] ?? alerta ?? "—"
}

function colorAlerta(alerta: string | null | undefined): string {
  switch (alerta) {
    case "NORMAL":
      return COLORS.green
    case "PREVENTIVO":
      return COLORS.orange
    case "CRITICO":
      return COLORS.red
    case "EXCEDIDO":
      return COLORS.darkRed
    default:
      return COLORS.yellow
  }
}

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE.marginTop + PAGE.headerHeight + PAGE.headerGap,
    paddingBottom: PAGE.marginBottom + PAGE.footerHeight,
    paddingHorizontal: PAGE.marginX,
    fontFamily: "Selawik",
    fontSize: 10,
    color: COLORS.black,
  },
  header: {
    position: "absolute",
    top: PAGE.marginTop,
    left: PAGE.marginX,
    right: PAGE.marginX,
    height: PAGE.headerHeight,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.yellow,
    paddingBottom: 10,
    height: "100%",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.black,
  },
  brand: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 9,
    color: COLORS.gray,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  dateText: {
    fontSize: 9,
    color: COLORS.gray,
  },
  headerSpacer: {
    height: "100%",
  },
  footer: {
    position: "absolute",
    bottom: PAGE.marginBottom,
    left: PAGE.marginX,
    right: PAGE.marginX,
    height: PAGE.footerHeight,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.lightGray,
  },
  content: {
    flex: 1,
  },
  seccion: {
    marginBottom: 14,
  },
  seccionTitulo: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  infoItem: {
    width: "31%",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: COLORS.gray,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
  },
  descripcionBlock: {
    marginTop: 8,
  },
  barraProgresoContainer: {
    marginTop: 8,
  },
  barraProgresoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  barraProgresoLabel: {
    fontSize: 8,
    fontWeight: "bold",
  },
  barraProgresoValue: {
    fontSize: 8,
  },
  barraProgresoTrack: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  barraProgresoFill: {
    height: "100%",
    borderRadius: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
    alignItems: "center",
  },
  tableHeaderCell: {
    padding: 5,
    backgroundColor: COLORS.background,
    fontSize: 7,
    fontWeight: "bold",
    color: COLORS.gray,
    textTransform: "uppercase",
  },
  tableCell: {
    padding: 5,
    fontSize: 8,
  },
  noData: {
    fontSize: 9,
    color: COLORS.gray,
    fontStyle: "italic",
  },
  closingFooter: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: "center",
  },
  closingText: {
    fontSize: 8,
    color: COLORS.lightGray,
  },
})

function Header({ fechaExportacion }: { fechaExportacion: string }) {
  return (
    <View style={styles.header} fixed>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>RM</Text>
          </View>
          <View>
            <Text style={styles.brand}>RED MUQUI</Text>
            <Text style={styles.subtitle}>Ficha Tecnica del Proyecto</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.dateText}>{fechaExportacion}</Text>
          <Text style={styles.dateText}>Documento interno</Text>
        </View>
      </View>
    </View>
  )
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Red Muqui - Documento interno</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`}
        fixed
      />
    </View>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  )
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.infoGrid}>{children}</View>
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? "—"}</Text>
    </View>
  )
}

function BarraProgreso({ label, valor, color }: { label: string; valor: number; color: string }) {
  const pct = Math.max(0, Math.min(100, redondearNumero(valor)))
  return (
    <View style={styles.barraProgresoContainer}>
      <View style={styles.barraProgresoHeader}>
        <Text style={styles.barraProgresoLabel}>{label}</Text>
        <Text style={styles.barraProgresoValue}>{pct}%</Text>
      </View>
      <View style={styles.barraProgresoTrack}>
        <View style={[styles.barraProgresoFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

function Tabla({
  columnas,
  anchos,
  children,
}: {
  columnas: string[]
  anchos: string[]
  children: React.ReactNode
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableRow} wrap={false}>
        {columnas.map((col, idx) => (
          <Text key={idx} style={[styles.tableHeaderCell, { width: anchos[idx] ?? `${100 / columnas.length}%` }]}>
            {col}
          </Text>
        ))}
      </View>
      {children}
    </View>
  )
}

function FilaTabla({ celdas, anchos }: { celdas: React.ReactNode[]; anchos: string[] }) {
  return (
    <View style={styles.tableRow} wrap={false}>
      {celdas.map((celda, idx) => (
        <Text key={idx} style={[styles.tableCell, { width: anchos[idx] ?? "auto" }]}>
          {celda}
        </Text>
      ))}
    </View>
  )
}

export function ReporteProyectoExportable({
  proyecto,
  actividades,
  hitos,
  fases,
  documentos,
  equipo,
}: ReporteProyectoExportableProps) {
  if (!proyecto) return null

  const fechaExportacion = formatearFechaHora(new Date().toISOString())

  return (
    <Document title={`Ficha Tecnica - ${proyecto.codigoInterno}`}>
      <Page size="A4" style={styles.page}>
        <Header fechaExportacion={fechaExportacion} />
        <Footer />

        <View style={styles.content}>
          <Seccion titulo="Datos generales">
            <InfoGrid>
              <InfoItem label="Nombre" value={proyecto.nombre} />
              <InfoItem label="Codigo interno" value={proyecto.codigoInterno} />
              <InfoItem label="Estado" value={formatearEstado(proyecto.estado)} />
              <InfoItem label="Prioridad" value={proyecto.nivelPrioridad ? `Nivel ${proyecto.nivelPrioridad}` : "No definida"} />
              <InfoItem
                label="Macroregion"
                value={
                  proyecto.macroregiones?.length
                    ? proyecto.macroregiones.map(m => m.nombre).join(", ")
                    : proyecto.nombreMacroregion ?? "Sin macroregion"
                }
              />
              <InfoItem label="Eje tematico" value={proyecto.nombreEjeTematico ?? "Sin eje tematico"} />
              <InfoItem
                label="Territorios"
                value={
                  proyecto.territorios?.length
                    ? proyecto.territorios.map(t => t.nombre).join(", ")
                    : "Sin territorios"
                }
              />
              <InfoItem label="Fecha de inicio" value={formatearFecha(proyecto.fechaInicio)} />
              <InfoItem label="Fecha de fin estimada" value={formatearFecha(proyecto.fechaFinEstimada)} />
            </InfoGrid>

            {proyecto.descripcion && (
              <View style={styles.descripcionBlock}>
                <Text style={styles.infoLabel}>Descripcion</Text>
                <Text style={styles.infoValue}>{proyecto.descripcion}</Text>
              </View>
            )}

            {proyecto.objetivoGeneral && (
              <View style={styles.descripcionBlock}>
                <Text style={styles.infoLabel}>Objetivo general</Text>
                <Text style={styles.infoValue}>{proyecto.objetivoGeneral}</Text>
              </View>
            )}
          </Seccion>

          <Seccion titulo="Avance y presupuesto">
            <InfoGrid>
              <InfoItem label="Avance fisico" value={`${redondear(proyecto.porcentajeAvance)}%`} />
              <InfoItem label="Avance planificado" value={`${redondear(proyecto.avancePlanificado)}%`} />
              <InfoItem label="Presupuesto total" value={formatearMoneda(proyecto.presupuesto, proyecto.moneda)} />
              <InfoItem label="Costo estimado" value={formatearMoneda(proyecto.costoEstimado, proyecto.moneda)} />
              <InfoItem label="Costo real" value={formatearMoneda(proyecto.costoReal, proyecto.moneda)} />
              <InfoItem label="Presupuesto ejecutado" value={`${redondear(proyecto.porcentajePresupuestoEjecutado)}%`} />
              <InfoItem label="Alerta presupuesto" value={formatearAlertaPresupuesto(proyecto.alertaPresupuesto)} />
            </InfoGrid>

            <BarraProgreso label="Avance fisico" valor={proyecto.porcentajeAvance ?? 0} color={COLORS.yellow} />
            <BarraProgreso
              label="Presupuesto ejecutado"
              valor={proyecto.porcentajePresupuestoEjecutado ?? 0}
              color={colorAlerta(proyecto.alertaPresupuesto)}
            />
          </Seccion>

          <Seccion titulo="Responsable principal">
            {proyecto.responsablePrincipal ? (
              <View>
                <Text style={{ fontSize: 9, fontWeight: "bold" }}>
                  {`${proyecto.responsablePrincipal.nombres} ${proyecto.responsablePrincipal.apellidos}`.trim()}
                </Text>
                <Text style={{ fontSize: 8, color: COLORS.gray }}>{proyecto.responsablePrincipal.email}</Text>
              </View>
            ) : (
              <Text style={styles.noData}>Sin responsable principal asignado.</Text>
            )}
          </Seccion>

          {proyecto.instituciones && proyecto.instituciones.length > 0 && (
            <Seccion titulo="Instituciones miembro">
              <Tabla columnas={["Nombre", "Tipo de participacion"]} anchos={["50%", "50%"]}>
                {proyecto.instituciones.map(inst => (
                  <FilaTabla key={inst.id} celdas={[inst.nombre, inst.tipoParticipacion || "—"]} anchos={["50%", "50%"]} />
                ))}
              </Tabla>
            </Seccion>
          )}

          {fases.length > 0 && (
            <Seccion titulo="Fases">
              <Tabla columnas={["Nombre", "Inicio planificado", "Fin planificado", "Avance", "Actividades"]} anchos={["30%", "18%", "18%", "12%", "22%"]}>
                {fases.map(fase => (
                  <FilaTabla
                    key={fase.id}
                    celdas={[
                      fase.nombre,
                      formatearFecha(fase.fechaInicioPlanificada),
                      formatearFecha(fase.fechaFinPlanificada),
                      `${redondear(fase.porcentajeAvance)}%`,
                      `${fase.actividadesFinalizadas}/${fase.totalActividades} finalizadas`,
                    ]}
                    anchos={["30%", "18%", "18%", "12%", "22%"]}
                  />
                ))}
              </Tabla>
            </Seccion>
          )}

          {hitos.length > 0 && (
            <Seccion titulo="Hitos">
              <Tabla columnas={["Nombre", "Fecha clave", "Estado", "Fase", "Avance"]} anchos={["34%", "16%", "16%", "18%", "16%"]}>
                {hitos.map(hito => (
                  <FilaTabla
                    key={hito.id}
                    celdas={[
                      hito.nombre,
                      formatearFecha(hito.fecha),
                      hito.estado,
                      hito.nombreFase || "—",
                      `${redondear(hito.porcentajeAvance)}%`,
                    ]}
                    anchos={["34%", "16%", "16%", "18%", "16%"]}
                  />
                ))}
              </Tabla>
            </Seccion>
          )}

          {actividades.length > 0 && (
            <Seccion titulo="Actividades">
              <Tabla columnas={["Nombre", "Fase", "Hito", "Inicio", "Fin", "Estado", "Avance"]} anchos={["24%", "14%", "14%", "12%", "12%", "12%", "12%"]}>
                {actividades.map(act => (
                  <FilaTabla
                    key={act.id}
                    celdas={[
                      act.nombre,
                      act.nombreFase || "—",
                      act.nombreHito || "—",
                      formatearFecha(act.fechaInicioPlanificada),
                      formatearFecha(act.fechaFinPlanificada),
                      formatearEstadoActividad(act.estado),
                      `${redondear(act.porcentajeAvance)}%`,
                    ]}
                    anchos={["24%", "14%", "14%", "12%", "12%", "12%", "12%"]}
                  />
                ))}
              </Tabla>
            </Seccion>
          )}

          {documentos.length > 0 && (
            <Seccion titulo="Informes y documentos asociados">
              <Tabla columnas={["Titulo", "Tipo", "Estado", "Version", "Fecha de carga", "Cargado por"]} anchos={["30%", "12%", "14%", "10%", "16%", "18%"]}>
                {documentos.map(doc => (
                  <FilaTabla
                    key={doc.id}
                    celdas={[
                      doc.titulo,
                      doc.tipo || "—",
                      formatearEstadoDocumento(doc.estado),
                      String(doc.version),
                      formatearFecha(doc.fechaCarga),
                      doc.usuarioCarga || "—",
                    ]}
                    anchos={["30%", "12%", "14%", "10%", "16%", "18%"]}
                  />
                ))}
              </Tabla>
            </Seccion>
          )}

          {equipo.length > 0 && (
            <Seccion titulo="Equipo del proyecto">
              <Tabla columnas={["Nombre", "Rol"]} anchos={["50%", "50%"]}>
                {equipo.map((miembro, idx) => (
                  <FilaTabla key={idx} celdas={[miembro.nombre, miembro.rol]} anchos={["50%", "50%"]} />
                ))}
              </Tabla>
            </Seccion>
          )}

          <View style={styles.closingFooter}>
            <Text style={styles.closingText}>Red Muqui - Ficha tecnica generada desde la plataforma - Documento interno</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
