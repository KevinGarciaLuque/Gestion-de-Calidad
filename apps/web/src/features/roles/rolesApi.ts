import { api } from '@/lib/api'

export interface Rol {
  codigo: string
  nombre: string
  descripcion: string | null
  esSistema: boolean
  activo: boolean
  orden: number
  permisos: string[]
  usuariosAsignados: number
}

export interface Permiso {
  codigo: string
  modulo: string
  descripcion: string
}

export interface ModuloPermisos {
  modulo: string
  permisos: Permiso[]
}

export const rolesApi = {
  async listar(): Promise<Rol[]> {
    const { data } = await api.get<Rol[]>('/roles')
    return data
  },
  async catalogoPermisos(): Promise<ModuloPermisos[]> {
    const { data } = await api.get<ModuloPermisos[]>('/permisos')
    return data
  },
  async crear(payload: { codigo: string; nombre: string; descripcion?: string }): Promise<Rol> {
    const { data } = await api.post<Rol>('/roles', payload)
    return data
  },
  async editar(
    codigo: string,
    payload: { nombre?: string; descripcion?: string; activo?: boolean },
  ): Promise<Rol> {
    const { data } = await api.patch<Rol>(`/roles/${codigo}`, payload)
    return data
  },
  async eliminar(codigo: string): Promise<void> {
    await api.delete(`/roles/${codigo}`)
  },
  async fijarPermisos(codigo: string, permisos: string[]): Promise<Rol> {
    const { data } = await api.put<Rol>(`/roles/${codigo}/permisos`, { permisos })
    return data
  },
}
