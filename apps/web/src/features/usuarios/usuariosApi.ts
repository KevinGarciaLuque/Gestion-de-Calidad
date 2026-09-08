import { api } from '@/lib/api'
import type { Paginado, TipoAlcance } from '@/lib/tipos'

export interface RolAsignado {
  id: string
  rolCodigo: string
  tipoAlcance: TipoAlcance
  unidadId: string | null
  procesoId: string | null
  expiraAt: string | null
  rol: { nombre: string }
  unidad: { nombre: string } | null
}

export interface UsuarioFila {
  id: string
  email: string
  nombre: string
  activo: boolean
  debeCambiarPassword: boolean
  ultimoAccesoAt: string | null
  creadoAt: string
  roles: RolAsignado[]
}

export interface ListarUsuariosParams {
  q?: string
  activo?: boolean
  pagina?: number
  porPagina?: number
}

export interface AsignarRolPayload {
  rolCodigo: string
  tipoAlcance: TipoAlcance
  unidadId?: string
  expiraAt?: string
}

export const usuariosApi = {
  async listar(params: ListarUsuariosParams): Promise<Paginado<UsuarioFila>> {
    const { data } = await api.get<Paginado<UsuarioFila>>('/usuarios', { params })
    return data
  },
  async crear(payload: { email: string; nombre: string; password?: string }) {
    const { data } = await api.post<{ usuario: UsuarioFila; passwordTemporal?: string }>(
      '/usuarios',
      payload,
    )
    return data
  },
  async editar(id: string, payload: { nombre?: string }) {
    const { data } = await api.patch<UsuarioFila>(`/usuarios/${id}`, payload)
    return data
  },
  async activar(id: string) {
    await api.post(`/usuarios/${id}/activar`, {})
  },
  async desactivar(id: string) {
    await api.post(`/usuarios/${id}/desactivar`, {})
  },
  async resetearPassword(id: string) {
    const { data } = await api.post<{ passwordTemporal: string }>(
      `/usuarios/${id}/resetear-password`,
      {},
    )
    return data
  },
  async asignarRol(id: string, payload: AsignarRolPayload) {
    await api.post(`/usuarios/${id}/roles`, payload)
  },
  async quitarRol(id: string, usuarioRolId: string) {
    await api.delete(`/usuarios/${id}/roles/${usuarioRolId}`)
  },
}
