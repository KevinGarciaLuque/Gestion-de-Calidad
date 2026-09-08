import { api } from '@/lib/api'

export type NivelNotificacion = 'INFO' | 'AVISO' | 'URGENTE'

export interface Notificacion {
  id: string
  nivel: NivelNotificacion
  titulo: string
  mensaje: string
  entidad: string | null
  entidadId: string | null
  ruta: string | null
  leidaAt: string | null
  creadoAt: string
}

export const notificacionesApi = {
  listar: async (soloNoLeidas?: boolean): Promise<Notificacion[]> =>
    (await api.get('/notificaciones', { params: soloNoLeidas ? { soloNoLeidas: 'true' } : {} })).data,
  contador: async (): Promise<{ noLeidas: number }> => (await api.get('/notificaciones/contador')).data,
  marcarLeida: async (id: string): Promise<void> => {
    await api.post(`/notificaciones/${id}/leida`, {})
  },
  marcarTodasLeidas: async (): Promise<void> => {
    await api.post('/notificaciones/marcar-todas-leidas', {})
  },
}
