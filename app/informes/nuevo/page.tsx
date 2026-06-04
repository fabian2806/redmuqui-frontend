"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PermissionGuard } from "@/components/auth/permission-guard"
import { 
  proyectos,
  institucionesMiembro,
  type TipoDocumento, 
  type EjeTematico, 
  type EstadoDocumento,
  type Macroregion
} from "@/lib/data"
import { ChevronRight, Save, FileText, Upload, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const tiposDocumento: TipoDocumento[] = [
  "Informe", "Pronunciamiento", "Investigación", "Manual", "Cartilla", "Resumen técnico"
]
const estadosDocumento: EstadoDocumento[] = ["Borrador", "En revisión", "Publicado"]
const ejesTematicos: EjeTematico[] = [
  "Agua y Territorio",
  "Derechos Humanos",
  "Minería Artesanal (MAPE)",
  "Vigilancia Ambiental",
  "Incidencia Política",
  "Fortalecimiento Organizacional"
]
const macroregiones: Macroregion[] = ["Norte", "Centro", "Sur"]
const equipoDisponible = [
  "María Torres", "Carlos Quispe", "Ana Huanca", "Luis Vargas",
  "Pedro Mendoza", "Carmen Sánchez", "Roberto Díaz", "José Mamani", "Rosa Quispe"
]

export default function NuevoInformePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    titulo: "",
    tipo: "" as TipoDocumento | "",
    descripcion: "",
    proyectoId: "",
    territorio: "",
    ejeTematico: "" as EjeTematico | "",
    macroregion: "" as Macroregion | "",
    responsableElaboracion: "",
    validadoPor: "",
    fechaElaboracion: new Date().toISOString().split("T")[0],
    estado: "Borrador" as EstadoDocumento,
    institucionesMiembro: [] as string[]
  })

  const [archivos, setArchivos] = useState<{ nombre: string; tamaño: string }[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert("Documento registrado exitosamente (simulación)")
    router.push("/informes")
  }

  const handleSaveDraft = () => {
    alert("Borrador guardado (simulación)")
  }

  const handleFileUpload = () => {
    // Simular subida de archivo
    setArchivos([
      ...archivos,
      { nombre: `documento-${archivos.length + 1}.pdf`, tamaño: "2.5 MB" }
    ])
  }

  const removeFile = (index: number) => {
    setArchivos(archivos.filter((_, i) => i !== index))
  }

  const toggleInstitucion = (inst: string) => {
    setFormData(prev => ({
      ...prev,
      institucionesMiembro: prev.institucionesMiembro.includes(inst)
        ? prev.institucionesMiembro.filter(i => i !== inst)
        : [...prev.institucionesMiembro, inst]
    }))
  }

  return (
    <AppLayout title="Nuevo Documento">
      <PermissionGuard permiso="DOCUMENTOS_CREATE">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href="/informes" className="hover:text-[#1A1A1A]">Informes y Productos</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-[#1A1A1A] font-medium">Nuevo Documento</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Registrar Documento</h1>
          <p className="text-sm text-[#5C5C5C]">
            Complete la información del documento para agregarlo al repositorio
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Documento */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Información del Documento
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                  Título del documento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="Ej: Informe sobre agua, minería y crisis climática 2025"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Tipo de documento *
                  </label>
                  <select
                    required
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoDocumento })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Seleccionar tipo</option>
                    {tiposDocumento.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
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
                  Descripción / Resumen *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="Describa brevemente el contenido y alcance del documento..."
                />
              </div>
            </div>
          </div>

          {/* Asociaciones */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Asociaciones
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Proyecto vinculado (opcional)
                  </label>
                  <select
                    value={formData.proyectoId}
                    onChange={(e) => setFormData({ ...formData, proyectoId: e.target.value })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Sin proyecto asociado</option>
                    {proyectos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Territorio
                  </label>
                  <input
                    type="text"
                    value={formData.territorio}
                    onChange={(e) => setFormData({ ...formData, territorio: e.target.value })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                    placeholder="Ej: Cajamarca"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Macroregión
                  </label>
                  <select
                    value={formData.macroregion}
                    onChange={(e) => setFormData({ ...formData, macroregion: e.target.value as Macroregion | "" })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Seleccionar macroregión</option>
                    {macroregiones.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C5C5C] mb-2">
                  Instituciones miembro participantes
                </label>
                <div className="flex flex-wrap gap-2">
                  {institucionesMiembro.map(inst => (
                    <button
                      key={inst}
                      type="button"
                      onClick={() => toggleInstitucion(inst)}
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

          {/* Responsables y Fechas */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Responsables y Fechas
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Responsable de elaboración *
                  </label>
                  <select
                    required
                    value={formData.responsableElaboracion}
                    onChange={(e) => setFormData({ ...formData, responsableElaboracion: e.target.value })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Seleccionar responsable</option>
                    {equipoDisponible.map(persona => (
                      <option key={persona} value={persona}>{persona}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Validado por
                  </label>
                  <select
                    value={formData.validadoPor}
                    onChange={(e) => setFormData({ ...formData, validadoPor: e.target.value })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    <option value="">Seleccionar validador</option>
                    {equipoDisponible.filter(p => p !== formData.responsableElaboracion).map(persona => (
                      <option key={persona} value={persona}>{persona}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Fecha de elaboración *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaElaboracion}
                    onChange={(e) => setFormData({ ...formData, fechaElaboracion: e.target.value })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as EstadoDocumento })}
                    className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  >
                    {estadosDocumento.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Archivos */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Archivos Adjuntos
              </h2>
            </div>
            <div className="p-6">
              {/* Upload area */}
              <div
                onClick={handleFileUpload}
                className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E0E0E0] bg-[#F7F7F7] p-8 transition-colors hover:border-[#FFD600] hover:bg-[#FFFDE7]"
              >
                <Upload className="h-8 w-8 text-[#5C5C5C]" />
                <p className="mt-2 text-sm font-medium text-[#1A1A1A]">
                  Haz clic para subir archivos
                </p>
                <p className="text-xs text-[#5C5C5C]">
                  PDF, DOC, DOCX hasta 50MB
                </p>
              </div>

              {/* Uploaded files */}
              {archivos.length > 0 && (
                <div className="space-y-2">
                  {archivos.map((archivo, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-[#E0E0E0] p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-[#C9A42B]" />
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">{archivo.nombre}</p>
                          <p className="text-xs text-[#5C5C5C]">{archivo.tamaño}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-[#C8102E] hover:text-[#A00D24]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/informes"
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
              Registrar documento
            </button>
          </div>
        </form>
      </div>
      </PermissionGuard>
    </AppLayout>
  )
}
