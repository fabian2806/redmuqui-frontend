import { api } from "@/lib/api"
import type { ArchivoResponse } from "@/lib/types"

// URL base del servicio Django de OCR. Si no está configurada, simplemente
// no se notifica (el polling de respaldo de Django se encargará más tarde).
const OCR_API_URL = process.env.NEXT_PUBLIC_OCR_API_URL

/**
 * Avisa al servicio de OCR (Django) que hay un archivo nuevo para revisar.
 *
 * Es "fire and forget": no bloquea ni hace fallar la subida si el servicio
 * de OCR está caído o no responde. Django, además, vuelve a verificar contra
 * el backend que este archivo realmente exista antes de procesarlo.
 */
 
 export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("redmuqui.accessToken")
}

function notificarServicioOcr(documentoId: number, archivo: ArchivoResponse) {
  if (!OCR_API_URL) return

  fetch(`${OCR_API_URL}/ocr/api/procesar-archivo/`, {
    method: "POST",
	headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getAccessToken()}`
	},
    body: JSON.stringify({
      documentoId,
      archivoId: archivo.id,
      nombre: archivo.nombre,
      url: archivo.url,
      extension: archivo.extension,
    }),
  }).catch((err) => {
    console.warn("No se pudo notificar al servicio de OCR (se procesará luego por el polling de respaldo):", err)
  })
}

export async function subirArchivoDocumento(
  documentoId: number,
  archivo: File,
): Promise<ArchivoResponse> {
  const formData = new FormData()
  formData.append("archivo", archivo)

  const response = await api.postForm<ArchivoResponse>(
    `/documentos/${documentoId}/archivos`,
    formData,
  )

  notificarServicioOcr(documentoId, response)

  return response
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
