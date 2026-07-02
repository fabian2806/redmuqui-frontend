"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react"
import type { PageResponse } from "@/lib/types"
import { ApiError } from "@/lib/api"
import { Spinner } from "@/components/ui/spinner"

export interface CatalogColumn<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
}

export interface CatalogField {
  name: string
  label: string
  type: "text" | "textarea" | "select" | "switch"
  required?: boolean
  options?: { value: string; label: string }[]
}

export interface CatalogService<T, C = Record<string, unknown>, U = C> {
  listarPaginado: (page: number, size: number) => Promise<PageResponse<T>>
  crear: (body: C) => Promise<T>
  actualizar: (id: number, body: U) => Promise<T>
  eliminar: (id: number) => Promise<void>
}

interface CatalogoCrudProps<T, C = Record<string, unknown>, U = C> {
  title: string
  description: string
  service: CatalogService<T, C, U>
  columns: CatalogColumn<T>[]
  fields: CatalogField[]
  emptyItem: C & U
  idKey?: keyof T
}

const PAGE_SIZE = 10

export function CatalogoCrud<T, C = Record<string, unknown>, U = C>({
  title,
  description,
  service,
  columns,
  fields,
  emptyItem,
  idKey = "id" as keyof T,
}: CatalogoCrudProps<T, C, U>) {
  const [data, setData] = useState<PageResponse<T> | null>(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [form, setForm] = useState<C & U>({ ...emptyItem })
  const [deleteItem, setDeleteItem] = useState<T | null>(null)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.listarPaginado(page, PAGE_SIZE)
      setData(result)
    } catch (error) {
      toast.error("Error al cargar", {
        description: getErrorMessage(error),
      })
    } finally {
      setLoading(false)
    }
  }, [page, service])

  useEffect(() => {
    loadData()
  }, [loadData])

  const resetForm = useCallback(() => {
    setForm({ ...emptyItem })
    setEditingItem(null)
  }, [emptyItem])

  const handleOpenCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const handleOpenEdit = (item: T) => {
    const values: Record<string, unknown> = { ...emptyItem as Record<string, unknown> }
    fields.forEach((field) => {
      values[field.name] = (item as Record<string, unknown>)[field.name] ?? ""
    })
    setForm(values as C & U)
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleSave = async () => {
    const missing = fields
      .filter((f) => f.required && !formValues[f.name] && formValues[f.name] !== false)
      .map((f) => f.label)

    if (missing.length > 0) {
      toast.error("Campos requeridos", {
        description: `Completa: ${missing.join(", ")}`,
      })
      return
    }

    setSaving(true)
    try {
      if (editingItem) {
        await service.actualizar(Number((editingItem as Record<string, unknown>)[String(idKey)]), form)
        toast.success("Actualizado", { description: "El registro se actualizó correctamente." })
      } else {
        await service.crear(form)
        toast.success("Creado", { description: "El registro se creó correctamente." })
      }
      setModalOpen(false)
      resetForm()
      await loadData()
    } catch (error) {
      toast.error(editingItem ? "Error al actualizar" : "Error al crear", {
        description: getErrorMessage(error),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await service.eliminar(Number((deleteItem as Record<string, unknown>)[String(idKey)]))
      toast.success("Eliminado", { description: "El registro se eliminó correctamente." })
      setDeleteItem(null)
      await loadData()
    } catch (error) {
      setDeleteItem(null)
      const isConflict = error instanceof ApiError && error.status === 409
      toast.error("Error al eliminar", {
        description: isConflict
          ? "No se puede eliminar el registro porque está siendo utilizado por otros módulos."
          : getErrorMessage(error),
      })
    }
  }

  const handleFieldChange = (name: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [name]: value }) as C & U)
  }

  const formValues = form as Record<string, unknown>

  const renderCell = (item: T, column: CatalogColumn<T>): React.ReactNode => {
    if (column.render) return column.render(item)
    const value = (item as Record<string, unknown>)[String(column.key)]
    if (typeof value === "boolean") {
      return value ? "Sí" : "No"
    }
    if (value === null || value === undefined) return "—"
    return String(value)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && !data ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={String(column.key)}>{column.header}</TableHead>
                    ))}
                    <TableHead className="w-[120px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data && data.content.length > 0 ? (
                    data.content.map((item, index) => (
                      <TableRow key={String((item as Record<string, unknown>)[String(idKey)]) ?? index}>
                        {columns.map((column) => (
                          <TableCell key={`${String(column.key)}-${index}`}>
                            {renderCell(item, column)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteItem(item)}
                            >
                              <Trash2 className="h-4 w-4 text-[#C8102E]" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                        No hay registros
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {data.totalElements} registros
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={data.first}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {data.page + 1} de {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
                    disabled={data.last}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar" : "Nuevo"} {title.toLowerCase()}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Modifica los datos del registro seleccionado."
                : "Completa los datos para crear un nuevo registro."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-[#C8102E]"> *</span>}
                </Label>
                {field.type === "textarea" ? (
                  <textarea
                    id={field.name}
                    value={String(formValues[field.name] ?? "")}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={String(formValues[field.name] ?? "")}
                    onValueChange={(value) => handleFieldChange(field.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Selecciona ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "switch" ? (
                  <Switch
                    id={field.name}
                    checked={Boolean(formValues[field.name] ?? false)}
                    onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
                  />
                ) : (
                  <Input
                    id={field.name}
                    value={String(formValues[field.name] ?? "")}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si el registro está en uso, no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteItem(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#C8102E] hover:bg-[#C8102E]/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.body?.message ?? error.message ?? "Ocurrió un error inesperado."
  }
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Ocurrió un error inesperado."
}
