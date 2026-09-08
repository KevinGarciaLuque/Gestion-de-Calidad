import { api } from '@/lib/api'
import type { TipoUnidad } from '@/lib/tipos'

export interface NodoUnidad {
  id: string
  codigo: string
  nombre: string
  tipo: TipoUnidad
  activo: boolean
  orden: number
  responsable: { id: string; nombre: string } | null
  hijos: NodoUnidad[]
}

export interface CrearUnidadPayload {
  codigo: string
  nombre: string
  tipo: TipoUnidad
  padreId?: string
  responsableId?: string
  orden?: number
}

export const organizacionApi = {
  async arbol(): Promise<NodoUnidad[]> {
    const { data } = await api.get<NodoUnidad[]>('/organizacion/arbol')
    return data
  },
  async crear(payload: CrearUnidadPayload): Promise<NodoUnidad> {
    const { data } = await api.post<NodoUnidad>('/organizacion', payload)
    return data
  },
  async editar(
    id: string,
    payload: Partial<Omit<CrearUnidadPayload, 'codigo'>>,
  ): Promise<NodoUnidad> {
    const { data } = await api.patch<NodoUnidad>(`/organizacion/${id}`, payload)
    return data
  },
  async activar(id: string): Promise<void> {
    await api.post(`/organizacion/${id}/activar`, {})
  },
  async desactivar(id: string): Promise<void> {
    await api.post(`/organizacion/${id}/desactivar`, {})
  },
}

/** Aplana el árbol para selects. */
export function aplanar(nodos: NodoUnidad[], nivel = 0): { value: string; label: string }[] {
  const salida: { value: string; label: string }[] = []
  for (const n of nodos) {
    salida.push({ value: n.id, label: `${'— '.repeat(nivel)}${n.nombre}` })
    if (n.hijos.length) salida.push(...aplanar(n.hijos, nivel + 1))
  }
  return salida
}
