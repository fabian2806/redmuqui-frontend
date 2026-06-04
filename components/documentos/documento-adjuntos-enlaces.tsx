"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { toast } from "sonner"
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { api, ApiError, API_BASE_URL } from "@/lib/api"
import { getAccessToken } from "@/lib/auth"
import type {
  ArchivoDocumentoResponse,
  EnlaceDocumentoCreate,
  EnlaceDocumentoResponse,
} from "@/lib/types"

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx"]

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("es-PE")
}

function extensionFromFile(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? ""
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function DocumentoAdjuntosEnlaces({
  documentoId,
  embedded = false,
}: {
  documentoId: number
  embedded?: boolean
}) {
  const { hasPermission } = useAuth()
  const puedeEditar = hasPermission("DOCUMENTOS_UPDATE")
  const [archivos, setArchivos] = useState<ArchivoDocumentoResponse[]>([])
  const [enlaces, setEnlaces] = useState<EnlaceDocumentoResponse[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [archivoDescripcion, setArchivoDescripcion] = useState("")
  const [enlaceUrl, setEnlaceUrl] = useState("")
  const [enlaceDescripcion, setEnlaceDescripcion] = useState("")
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [savingLink, setSavingLink] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedFileError = useMemo(() => {
    if (!selectedFile) return null
    const extension = extensionFromFile(selectedFile)
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return "Solo se aceptan archivos PDF, DOCX o XLSX."
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      return "El archivo no debe exceder los 20 MB."
    }
    return null
  }, [selectedFile])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [archivosData, enlacesData] = await Promise.all([
        api.get<ArchivoDocumentoResponse[]>(`/documentos/${documentoId}/archivos`),
        api.get<EnlaceDocumentoResponse[]>(`/documentos/${documentoId}/enlaces`),
      ])
      setArchivos(archivosData)
      setEnlaces(enlacesData)
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los adjuntos y enlaces"))
    } finally {
      setLoading(false)
    }
  }, [documentoId])

  useEffect(() => {
    load()
  }, [load])

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!selectedFile) {
      setError("Selecciona un archivo para adjuntar.")
      return
    }
    if (selectedFileError) {
      setError(selectedFileError)
      return
    }

    const formData = new FormData()
    formData.append("archivo", selectedFile)
    if (archivoDescripcion.trim()) {
      formData.append("descripcion", archivoDescripcion.trim())
    }

    setUploading(true)
    try {
      const creado = await api.postForm<ArchivoDocumentoResponse>(
        `/documentos/${documentoId}/archivos`,
        formData,
      )
      setArchivos((current) => [creado, ...current])
      setSelectedFile(null)
      setArchivoDescripcion("")
      const input = document.getElementById("documento-archivo-input") as HTMLInputElement | null
      if (input) input.value = ""
      toast.success("Archivo adjuntado correctamente")
    } catch (err) {
      setError(errorMessage(err, "No se pudo adjuntar el archivo"))
    } finally {
      setUploading(false)
    }
  }

  const handleSaveLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!isValidHttpUrl(enlaceUrl.trim())) {
      setError("Ingresa una URL valida que empiece con http:// o https://.")
      return
    }
    if (!enlaceDescripcion.trim()) {
      setError("Ingresa la descripcion del enlace.")
      return
    }

    const payload: EnlaceDocumentoCreate = {
      url: enlaceUrl.trim(),
      descripcion: enlaceDescripcion.trim(),
    }

    setSavingLink(true)
    try {
      const creado = await api.post<EnlaceDocumentoResponse>(
        `/documentos/${documentoId}/enlaces`,
        payload,
      )
      setEnlaces((current) => [creado, ...current])
      setEnlaceUrl("")
      setEnlaceDescripcion("")
      toast.success("Enlace registrado correctamente")
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar el enlace"))
    } finally {
      setSavingLink(false)
    }
  }

  const handleDeleteArchivo = async (archivoId: number) => {
    setError(null)
    try {
      await api.delete<void>(`/documentos/${documentoId}/archivos/${archivoId}`)
      setArchivos((current) => current.filter((archivo) => archivo.id !== archivoId))
      toast.success("Archivo eliminado correctamente")
    } catch (err) {
      setError(errorMessage(err, "No se pudo eliminar el archivo"))
    }
  }

  const handleDeleteEnlace = async (enlaceId: number) => {
    setError(null)
    try {
      await api.delete<void>(`/documentos/${documentoId}/enlaces/${enlaceId}`)
      setEnlaces((current) => current.filter((enlace) => enlace.id !== enlaceId))
      toast.success("Enlace eliminado correctamente")
    } catch (err) {
      setError(errorMessage(err, "No se pudo eliminar el enlace"))
    }
  }

  const handleDownload = async (archivo: ArchivoDocumentoResponse) => {
    setError(null)
    try {
      const token = getAccessToken()
      const response = await fetch(
        `${API_BASE_URL}/documentos/${documentoId}/archivos/${archivo.id}/descargar`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      )
      if (!response.ok) {
        throw new Error("No se pudo descargar el archivo")
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = archivo.nombreArchivo
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(errorMessage(err, "No se pudo descargar el archivo"))
    }
  }

  return (
    <section className={embedded ? "space-y-6" : "rounded-lg border border-[#E0E0E0] bg-white shadow-sm"}>
      <div className={embedded ? "" : "border-b border-[#E0E0E0] px-6 py-4"}>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
          Adjuntos y enlaces
        </h2>
      </div>

      <div className={embedded ? "space-y-6" : "space-y-6 p-6"}>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {puedeEditar && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <form onSubmit={handleUpload} className="space-y-4 rounded-lg border border-[#E0E0E0] p-4">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[#C9A42B]" />
                <h3 className="text-sm font-bold text-[#1A1A1A]">Adjuntar archivo</h3>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                  Archivo PDF, DOCX o XLSX
                </label>
                <input
                  id="documento-archivo-input"
                  type="file"
                  accept=".pdf,.docx,.xlsx"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] file:mr-3 file:rounded-md file:border-0 file:bg-[#F7F7F7] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                />
                <p className={`mt-1 text-xs ${selectedFileError ? "text-[#C8102E]" : "text-[#5C5C5C]"}`}>
                  {selectedFileError ?? "Tamano maximo: 20 MB."}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                  Descripcion
                </label>
                <textarea
                  rows={3}
                  value={archivoDescripcion}
                  onChange={(event) => setArchivoDescripcion(event.target.value)}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="Describe el contenido o proposito del adjunto"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-4 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Adjuntando..." : "Adjuntar archivo"}
              </button>
            </form>

            <form onSubmit={handleSaveLink} className="space-y-4 rounded-lg border border-[#E0E0E0] p-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-[#0277BD]" />
                <h3 className="text-sm font-bold text-[#1A1A1A]">Registrar enlace</h3>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                  URL
                </label>
                <input
                  type="url"
                  value={enlaceUrl}
                  onChange={(event) => setEnlaceUrl(event.target.value)}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5C5C5C]">
                  Descripcion
                </label>
                <textarea
                  rows={3}
                  value={enlaceDescripcion}
                  onChange={(event) => setEnlaceDescripcion(event.target.value)}
                  className="w-full rounded-lg border border-[#E0E0E0] px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#FFD600] focus:outline-none focus:ring-1 focus:ring-[#FFD600]"
                  placeholder="Describe el recurso enlazado"
                />
              </div>
              <button
                type="submit"
                disabled={savingLink}
                className="flex items-center gap-2 rounded-lg bg-[#FFD600] px-4 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-[#C9A42B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                {savingLink ? "Guardando..." : "Guardar enlace"}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#5C5C5C]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando adjuntos...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                Archivos adjuntos
              </h3>
              {archivos.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#E0E0E0] px-4 py-6 text-center text-sm text-[#5C5C5C]">
                  No hay archivos adjuntos.
                </p>
              ) : (
                <div className="space-y-3">
                  {archivos.map((archivo) => (
                    <div key={archivo.id} className="rounded-lg border border-[#E0E0E0] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-[#C9A42B]" />
                            <p className="truncate text-sm font-medium text-[#1A1A1A]">
                              {archivo.nombreArchivo}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-[#5C5C5C]">
                            {archivo.tipoArchivo?.toUpperCase()} - {formatBytes(archivo.tamanioArchivo)} - {formatDate(archivo.fechaRegistro)}
                          </p>
                          {archivo.descripcion && (
                            <p className="mt-2 text-sm text-[#1A1A1A]">{archivo.descripcion}</p>
                          )}
                          <p className="mt-2 break-all text-xs text-[#5C5C5C]">
                            Ruta: {archivo.rutaArchivo}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownload(archivo)}
                            className="rounded-md p-2 text-[#5C5C5C] hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {puedeEditar && (
                            <button
                              type="button"
                              onClick={() => handleDeleteArchivo(archivo.id)}
                              className="rounded-md p-2 text-[#5C5C5C] hover:bg-[#C8102E]/10 hover:text-[#C8102E]"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#5C5C5C]">
                Enlaces asociados
              </h3>
              {enlaces.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#E0E0E0] px-4 py-6 text-center text-sm text-[#5C5C5C]">
                  No hay enlaces asociados.
                </p>
              ) : (
                <div className="space-y-3">
                  {enlaces.map((enlace) => (
                    <div key={enlace.id} className="rounded-lg border border-[#E0E0E0] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#1A1A1A]">{enlace.descripcion}</p>
                          <a
                            href={enlace.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block break-all text-sm text-[#0277BD] hover:underline"
                          >
                            {enlace.url}
                          </a>
                          <p className="mt-2 text-xs text-[#5C5C5C]">
                            Registrado el {formatDate(enlace.fechaRegistro)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <a
                            href={enlace.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md p-2 text-[#5C5C5C] hover:bg-[#F7F7F7] hover:text-[#1A1A1A]"
                            title="Abrir enlace"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          {puedeEditar && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEnlace(enlace.id)}
                              className="rounded-md p-2 text-[#5C5C5C] hover:bg-[#C8102E]/10 hover:text-[#C8102E]"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
