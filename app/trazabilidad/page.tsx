"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { StatusBadge, MacroregionBadge, TypeBadge } from "@/components/ui/status-badge"
import { 
  bitacora, 
  proyectos, 
  institucionesMiembro,
  type Macroregion, 
  type EjeTematico 
} from "@/lib/data"
import { 
  Search, 
  Filter,
  Download,
  Calendar,
  FolderKanban,
  FileText,
  CheckCircle2,
  AlertTriangle,
  User,
  Plus,
  X,
  MapPin
} from "lucide-react"
import Link from "next/link"

const macroregiones: Macroregion[] = ["Norte", "Centro", "Sur"]
const ejesTematicos: EjeTematico[] = [
  "Agua y Territorio",
  "Derechos Humanos",
  "Minería Artesanal (MAPE)",
  "Vigilancia Ambiental",
  "Incidencia Política",
  "Fortalecimiento Organizacional"
]
const tiposRegistro = ["proyecto", "informe", "actividad", "incidencia", "usuario"]

const territorios = [
  "Cajamarca", "Piura", "La Libertad", "Lambayeque",
  "Lima", "Junín", "Pasco", "Huancavelica",
  "Arequipa", "Cusco", "Puno", "Moquegua", "Apurímac", "Tacna"
]

export default function TrazabilidadPage() {
  const [selectedMacroregion, setSelectedMacroregion] = useState<Macroregion | "">("")
  const [selectedTerritorio, setSelectedTerritorio] = useState("")
  const [selectedOrganizacion, setSelectedOrganizacion] = useState("")
  const [selectedEje, setSelectedEje] = useState<EjeTematico | "">("")
  const [selectedTipo, setSelectedTipo] = useState("")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [showIncidenciaForm, setShowIncidenciaForm] = useState(false)
  const [incidenciaText, setIncidenciaText] = useState("")

  // Filter bitacora entries
  const filteredBitacora = bitacora.filter(entry => {
    const matchesTipo = !selectedTipo || entry.tipo === selectedTipo
    // Add more filters as needed
    return matchesTipo
  })

  const getIconForType = (tipo: string) => {
    switch (tipo) {
      case "proyecto":
        return <FolderKanban className="h-4 w-4" />
      case "informe":
        return <FileText className="h-4 w-4" />
      case "actividad":
        return <CheckCircle2 className="h-4 w-4" />
      case "incidencia":
        return <AlertTriangle className="h-4 w-4" />
      case "usuario":
        return <User className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getColorForType = (tipo: string) => {
    switch (tipo) {
      case "proyecto":
        return "bg-[#0277BD]/10 text-[#0277BD]"
      case "informe":
        return "bg-[#FFD600]/20 text-[#C9A42B]"
      case "actividad":
        return "bg-[#2E7D32]/10 text-[#2E7D32]"
      case "incidencia":
        return "bg-[#C8102E]/10 text-[#C8102E]"
      case "usuario":
        return "bg-[#5C5C5C]/10 text-[#5C5C5C]"
      default:
        return "bg-[#F7F7F7] text-[#5C5C5C]"
    }
  }

  const clearFilters = () => {
    setSelectedMacroregion("")
    setSelectedTerritorio("")
    setSelectedOrganizacion("")
    setSelectedEje("")
    setSelectedTipo("")
    setFechaInicio("")
    setFechaFin("")
  }

  const handleSubmitIncidencia = () => {
    if (incidenciaText.trim()) {
      alert("Incidencia registrada exitosamente (simulación)")
      setIncidenciaText("")
      setShowIncidenciaForm(false)
    }
  }

  const hasActiveFilters = selectedMacroregion || selectedTerritorio || selectedOrganizacion || selectedEje || selectedTipo || fechaInicio || fechaFin

  return (
    <AppLayout title="Trazabilidad">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Trazabilidad y Seguimiento</h1>
          <p className="text-sm text-[#5C5C5C]">
            Consulta histórica y seguimiento transversal de proyectos, informes y actividades
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Filters Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E0E0E0] px-4 py-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                  Filtros Avanzados
                </h2>
                <Filter className="h-4 w-4 text-[#5C5C5C]" />
              </div>
              <div className="p-4 space-y-4">
                {/* Territorio */}
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Territorio
                  </label>
                  <select
                    value={selectedTerritorio}
                    onChange={(e) => setSelectedTerritorio(e.target.value)}
                    className="w-full rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Todos los territorios</option>
                    {territorios.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Macroregión */}
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Macroregión
                  </label>
                  <select
                    value={selectedMacroregion}
                    onChange={(e) => setSelectedMacroregion(e.target.value as Macroregion | "")}
                    className="w-full rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Todas</option>
                    {macroregiones.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Organización */}
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Organización miembro
                  </label>
                  <select
                    value={selectedOrganizacion}
                    onChange={(e) => setSelectedOrganizacion(e.target.value)}
                    className="w-full rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Todas</option>
                    {institucionesMiembro.map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>

                {/* Eje temático */}
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Eje temático
                  </label>
                  <select
                    value={selectedEje}
                    onChange={(e) => setSelectedEje(e.target.value as EjeTematico | "")}
                    className="w-full rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Todos</option>
                    {ejesTematicos.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>

                {/* Rango de fechas */}
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Rango de fechas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="rounded-lg border border-[#E0E0E0] px-2 py-2 text-xs text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                    />
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="rounded-lg border border-[#E0E0E0] px-2 py-2 text-xs text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                    />
                  </div>
                </div>

                {/* Tipo de registro */}
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Tipo de registro
                  </label>
                  <select
                    value={selectedTipo}
                    onChange={(e) => setSelectedTipo(e.target.value)}
                    className="w-full rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Todos</option>
                    {tiposRegistro.map(t => (
                      <option key={t} value={t} className="capitalize">{t}</option>
                    ))}
                  </select>
                </div>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex w-full items-center justify-center gap-1 rounded-lg border border-[#E0E0E0] bg-white py-2 text-sm text-[#5C5C5C] hover:bg-[#F7F7F7]"
                  >
                    <X className="h-4 w-4" />
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Incidencia form */}
            <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E0E0E0] px-4 py-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                  Registrar Incidencia
                </h2>
                <AlertTriangle className="h-4 w-4 text-[#C8102E]" />
              </div>
              <div className="p-4">
                {!showIncidenciaForm ? (
                  <button
                    onClick={() => setShowIncidenciaForm(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E0E0E0] py-4 text-sm text-[#5C5C5C] hover:border-[#FFD600] hover:bg-[#FFFDE7]"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva incidencia
                  </button>
                ) : (
                  <div className="space-y-3">
                    <select className="w-full rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]">
                      <option value="">Proyecto relacionado</option>
                      {proyectos.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    <textarea
                      rows={3}
                      value={incidenciaText}
                      onChange={(e) => setIncidenciaText(e.target.value)}
                      placeholder="Describa la incidencia u observación..."
                      className="w-full rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowIncidenciaForm(false)}
                        className="flex-1 rounded-lg border border-[#E0E0E0] py-2 text-sm text-[#5C5C5C] hover:bg-[#F7F7F7]"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSubmitIncidencia}
                        className="flex-1 rounded-lg bg-[#C8102E] py-2 text-sm font-bold text-white hover:bg-[#A00D24]"
                      >
                        Registrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-3">
            <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E0E0E0] px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                    Timeline de Actividades
                  </h2>
                  <p className="text-xs text-[#5C5C5C] mt-1">
                    {filteredBitacora.length} registros encontrados
                  </p>
                </div>
                <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]">
                  <Download className="h-4 w-4" />
                  Exportar bitácora
                </button>
              </div>

              <div className="p-5">
                {/* Timeline */}
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[#E0E0E0]" />
                  <div className="space-y-6">
                    {filteredBitacora.map((entry) => (
                      <div key={entry.id} className="relative flex gap-4 pl-12">
                        <div className={`absolute left-3 top-1 flex h-5 w-5 items-center justify-center rounded-full ${getColorForType(entry.tipo)}`}>
                          {getIconForType(entry.tipo)}
                        </div>
                        <div className="flex-1 rounded-lg border border-[#E0E0E0] p-4 hover:bg-[#FFFDE7] transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getColorForType(entry.tipo)}`}>
                                  {entry.tipo}
                                </span>
                                <span className="text-xs text-[#5C5C5C]">•</span>
                                <span className="text-xs font-medium text-[#1A1A1A]">{entry.accion}</span>
                              </div>
                              <Link 
                                href={entry.tipo === "proyecto" ? `/proyectos/${entry.entidadId}` : entry.tipo === "informe" ? `/informes/${entry.entidadId}` : "#"}
                                className="mt-2 block text-sm font-medium text-[#1A1A1A] hover:text-[#C9A42B]"
                              >
                                {entry.entidadNombre}
                              </Link>
                              <p className="mt-1 text-sm text-[#5C5C5C]">
                                {entry.descripcion}
                              </p>
                              <div className="mt-3 flex items-center gap-4 text-xs text-[#5C5C5C]">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {entry.usuario}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {entry.fecha}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {filteredBitacora.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="mx-auto h-12 w-12 text-[#E0E0E0]" />
                    <p className="mt-4 text-sm text-[#5C5C5C]">
                      No se encontraron registros con los filtros aplicados
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
