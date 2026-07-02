import type {
  EstadoCreateDTO,
  EstadoResponseDTO,
  EstadoUpdateDTO,
  ModuloEstado,
} from "./types/estado"
import { ApiError, authenticatedJsonRequest } from "@/lib/api"
import type { PageResponse } from "@/lib/types"

function rethrowWithContext(operation: string, error: unknown): never {
  if (error instanceof ApiError) throw error
  const message = error instanceof Error ? error.message : "Error desconocido"
  throw new Error(`Estado (${operation}): ${message}`, { cause: error })
}

export class EstadoService {
  constructor(private readonly basePath = "/estados") {}

  async listar(modulo: ModuloEstado): Promise<EstadoResponseDTO[]> {
    try {
      return await authenticatedJsonRequest<EstadoResponseDTO[]>(
        `${this.basePath}?modulo=${encodeURIComponent(modulo)}`,
        { method: "GET" },
      )
    } catch (err) {
      return rethrowWithContext("listar", err)
    }
  }

  async listarPaginado(
    modulo: ModuloEstado,
    page = 0,
    size = 10,
  ): Promise<PageResponse<EstadoResponseDTO>> {
    try {
      return await authenticatedJsonRequest<PageResponse<EstadoResponseDTO>>(
        `${this.basePath}/page?modulo=${encodeURIComponent(modulo)}&page=${page}&size=${size}`,
        { method: "GET" },
      )
    } catch (err) {
      return rethrowWithContext("listarPaginado", err)
    }
  }

  async obtener(id: number): Promise<EstadoResponseDTO> {
    try {
      return await authenticatedJsonRequest<EstadoResponseDTO>(`${this.basePath}/${id}`, {
        method: "GET",
      })
    } catch (err) {
      return rethrowWithContext("obtener", err)
    }
  }

  async crear(body: EstadoCreateDTO): Promise<EstadoResponseDTO> {
    try {
      return await authenticatedJsonRequest<EstadoResponseDTO>(this.basePath, {
        method: "POST",
        body,
      })
    } catch (err) {
      return rethrowWithContext("crear", err)
    }
  }

  async actualizar(id: number, body: EstadoUpdateDTO): Promise<EstadoResponseDTO> {
    try {
      return await authenticatedJsonRequest<EstadoResponseDTO>(`${this.basePath}/${id}`, {
        method: "PUT",
        body,
      })
    } catch (err) {
      return rethrowWithContext("actualizar", err)
    }
  }

  async eliminar(id: number): Promise<void> {
    try {
      await authenticatedJsonRequest<void>(`${this.basePath}/${id}`, { method: "DELETE" })
    } catch (err) {
      return rethrowWithContext("eliminar", err)
    }
  }
}

export const estadoService = new EstadoService()
