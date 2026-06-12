import { api } from "@/lib/api"
import type { ArchivoResponse } from "@/lib/types"

export async function subirArchivoDocumento(
  documentoId: number,
  archivo: File,
): Promise<ArchivoResponse> {
  const formData = new FormData()
  formData.append("archivo", archivo)

  return api.postForm<ArchivoResponse>(
    `/documentos/${documentoId}/archivos`,
    formData,
  )
}

export async function obtenerArchivosDocumento(
  documentoId: number,
): Promise<ArchivoResponse[]> {
  return api.get<ArchivoResponse[]>(`/documentos/${documentoId}/archivos`)
}

export async function obtenerUrlDescargaArchivo(
  documentoId: number,
  archivoId: number,
): Promise<string> {
  const response = await api.get<{ url: string }>(
    `/documentos/${documentoId}/archivos/${archivoId}/descarga`,
  )

  return response.url
}