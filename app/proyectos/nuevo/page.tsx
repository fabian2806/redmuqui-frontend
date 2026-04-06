"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { 
  institucionesMiembro, 
  type Macroregion, 
  type EjeTematico, 
  type EstadoProyecto 
} from "@/lib/data"
import { ChevronRight, Plus, X, Save, FileText } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const macroregiones: Macroregion[] = ["Norte", "Centro", "Sur"]
const ejesTematicos: EjeTematico[] = [
  "Agua y Territorio",
  "Derechos Humanos",
  "Minería Artesanal (MAPE)",
  "Vigilancia Ambiental",
  "Incidencia Política",
  "Fortalecimiento Organizacional"
]
const estados: EstadoProyecto[] = ["Activo", "En riesgo", "Cerrado", "Suspendido"]
const prioridades = ["Alta", "Media", "Baja"]

const territoriosDisponibles = [
  "Cajamarca", "Piura", "La Libertad", "Lambayeque", // Norte
  "Lima", "Junín", "Pasco", "Huancavelica", // Centro
  "Arequipa", "Cusco", "Puno", "Moquegua", "Apurímac", "Tacna" // Sur
]

const equipoDisponible = [
  "María Torres", "Carlos Quispe", "Ana Huanca", "Luis Vargas",
  "Pedro Mendoza", "Carmen Sánchez", "Roberto Díaz", "José Mamani", "Rosa Quispe"
]

export default function NuevoProyectoPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    descripcion: "",
    objetivo: "",
    macroregiones: [] as Macroregion[],
    ejeTematico: "" as EjeTematico | "",
    territorios: [] as string[],
    institucionesMiembro: [] as string[],
    responsable: "",
    equipo: [] as string[],
    fechaInicio: "",
    fechaFin: "",
    estado: "Activo" as EstadoProyecto,
    prioridad: "Media"
  })

  const [hitos, setHitos] = useState<{ nombre: string; fecha: string }[]>([])
  const [nuevoHito, setNuevoHito] = useState({ nombre: "", fecha: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would save to database
    alert("Proyecto creado exitosamente (simulación)")
    router.push("/proyectos")
  }

  const handleSaveDraft = () => {
    alert("Borrador guardado (simulación)")
  }

  const addHito = () => {
    if (nuevoHito.nombre && nuevoHito.fecha) {
      setHitos([...hitos, nuevoHito])
      setNuevoHito({ nombre: "", fecha: "" })
    }
  }

  const removeHito = (index: number) => {
    setHitos(hitos.filter((_, i) => i !== index))
  }

  const toggleArrayItem = (field: "macroregiones" | "territorios" | "institucionesMiembro" | "equipo", value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value as never)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value as never]
    }))
  }

  return (
    <AppLayout title="Nuevo Proyecto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href="/proyectos" className="hover:text-[#1A1A1A]">Proyectos</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#1A1A1A] font-medium">Nuevo Proyecto</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Crear Nuevo Proyecto</h1>
          <p className="text-sm text-[#5C5C5C]">
            Complete la información del proyecto para registrarlo en la plataforma
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información General */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Información General
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Nombre del proyecto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                    placeholder="Ej: Monitoreo Ambiental Comunitario - Conga"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Código interno
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                    placeholder="Ej: PRY-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Eje temático *
                  </label>
                  <select
                    required
                    value={formData.ejeTematico}
                    onChange={(e) => setFormData({ ...formData, ejeTematico: e.target.value as EjeTematico })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Seleccionar eje temático</option>
                    {ejesTematicos.map(eje => (
                      <option key={eje} value={eje}>{eje}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                  Descripción *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="Describa brevemente el proyecto..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                  Objetivo general *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="Defina el objetivo principal del proyecto..."
                />
              </div>
            </div>
          </div>

          {/* Clasificación */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Clasificación
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5C5C5C] mb-2">
                  Macroregión *
                </label>
                <div className="flex flex-wrap gap-2">
                  {macroregiones.map(macro => (
                    <button
                      key={macro}
                      type="button"
                      onClick={() => toggleArrayItem("macroregiones", macro)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        formData.macroregiones.includes(macro)
                          ? macro === "Norte" ? "bg-[#C8102E] text-white" :
                            macro === "Centro" ? "bg-[#C9A42B] text-white" :
                            "bg-[#424242] text-white"
                          : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                      }`}
                    >
                      {macro}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5C5C] mb-2">
                  Territorios involucrados
                </label>
                <div className="flex flex-wrap gap-2">
                  {territoriosDisponibles.map(territorio => (
                    <button
                      key={territorio}
                      type="button"
                      onClick={() => toggleArrayItem("territorios", territorio)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        formData.territorios.includes(territorio)
                          ? "bg-[#FFD600] text-[#1A1A1A]"
                          : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                      }`}
                    >
                      {territorio}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5C5C] mb-2">
                  Instituciones miembro vinculadas
                </label>
                <div className="flex flex-wrap gap-2">
                  {institucionesMiembro.map(inst => (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => toggleArrayItem("institucionesMiembro", inst)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        formData.institucionesMiembro.includes(inst)
                          ? "bg-[#C9A42B] text-white"
                          : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                      }`}
                    >
                      {inst}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Equipo */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Equipo
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                  Responsable principal *
                </label>
                <select
                  required
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                >
                  <option value="">Seleccionar responsable</option>
                  {equipoDisponible.map(persona => (
                    <option key={persona} value={persona}>{persona}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5C5C] mb-2">
                  Equipo adicional
                </label>
                <div className="flex flex-wrap gap-2">
                  {equipoDisponible.filter(p => p !== formData.responsable).map(persona => (
                    <button
                      key={persona}
                      type="button"
                      onClick={() => toggleArrayItem("equipo", persona)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        formData.equipo.includes(persona)
                          ? "bg-[#FFD600] text-[#1A1A1A]"
                          : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                      }`}
                    >
                      {persona}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Temporalidad */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Temporalidad
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Fecha de inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Fecha de fin estimada *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaFin}
                    onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  />
                </div>
              </div>

              {/* Hitos */}
              <div>
                <label className="block text-xs font-medium text-[#5C5C5C] mb-2">
                  Hitos clave
                </label>
                {hitos.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {hitos.map((hito, index) => (
                      <div key={index} className="flex items-center gap-2 rounded-lg bg-[#F7F7F7] px-3 py-2">
                        <span className="flex-1 text-sm text-[#1A1A1A]">{hito.nombre}</span>
                        <span className="text-xs text-[#5C5C5C]">
                          {new Date(hito.fecha).toLocaleDateString("es-PE")}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeHito(index)}
                          className="text-[#C8102E] hover:text-[#A00D24]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuevoHito.nombre}
                    onChange={(e) => setNuevoHito({ ...nuevoHito, nombre: e.target.value })}
                    placeholder="Nombre del hito"
                    className="flex-1 rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  />
                  <input
                    type="date"
                    value={nuevoHito.fecha}
                    onChange={(e) => setNuevoHito({ ...nuevoHito, fecha: e.target.value })}
                    className="w-40 rounded-lg border border-[#E0E0E0] px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  />
                  <button
                    type="button"
                    onClick={addHito}
                    className="flex items-center gap-1 rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-sm text-[#5C5C5C] hover:bg-[#F7F7F7]"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Estado y Prioridad */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Estado y Prioridad
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Estado inicial
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as EstadoProyecto })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    {estados.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Nivel de prioridad
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    {prioridades.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/proyectos"
              className="rounded-lg border border-[#E0E0E0] bg-white px-6 py-2.5 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-6 py-2.5 text-sm font-medium text-[#5C5C5C] hover:bg-[#F7F7F7]"
            >
              <FileText className="h-4 w-4" />
              Guardar borrador
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-6 py-2.5 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B]"
            >
              <Save className="h-4 w-4" />
              Crear proyecto
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
