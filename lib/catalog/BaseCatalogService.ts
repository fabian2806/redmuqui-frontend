import { ApiError, authenticatedJsonRequest } from "../api"

function rethrowWithCatalogContext(operation: string, error: unknown): never {
  if (error instanceof ApiError) {
    throw error
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Error desconocido"
  throw new Error(`Catálogo (${operation}): ${message}`, { cause: error })
}

/**
 * CRUD genérico para catálogos bajo `NEXT_PUBLIC_API_URL` (p. ej. `/api/v1`).
 * Las peticiones usan `fetch` con JSON y Bearer vía {@link authenticatedJsonRequest}.
 */
export class BaseCatalogService<TResponse, TCreate, TUpdate> {
  constructor(private readonly resourcePath: string) {
    if (!resourcePath.startsWith("/")) {
      throw new Error("resourcePath debe comenzar con '/'")
    }
  }

  async listar(): Promise<TResponse[]> {
    try {
      return await authenticatedJsonRequest<TResponse[]>(this.resourcePath, {
        method: "GET",
      })
    } catch (err) {
      return rethrowWithCatalogContext("listar", err)
    }
  }

  async obtener(id: number): Promise<TResponse> {
    try {
      return await authenticatedJsonRequest<TResponse>(`${this.resourcePath}/${id}`, {
        method: "GET",
      })
    } catch (err) {
      return rethrowWithCatalogContext("obtener", err)
    }
  }

  async crear(body: TCreate): Promise<TResponse> {
    try {
      return await authenticatedJsonRequest<TResponse>(this.resourcePath, {
        method: "POST",
        body,
      })
    } catch (err) {
      return rethrowWithCatalogContext("crear", err)
    }
  }

  async actualizar(id: number, body: TUpdate): Promise<TResponse> {
    try {
      return await authenticatedJsonRequest<TResponse>(`${this.resourcePath}/${id}`, {
        method: "PUT",
        body,
      })
    } catch (err) {
      return rethrowWithCatalogContext("actualizar", err)
    }
  }

  async eliminar(id: number): Promise<void> {
    try {
      await authenticatedJsonRequest<void>(`${this.resourcePath}/${id}`, {
        method: "DELETE",
      })
    } catch (err) {
      return rethrowWithCatalogContext("eliminar", err)
    }
  }
}
