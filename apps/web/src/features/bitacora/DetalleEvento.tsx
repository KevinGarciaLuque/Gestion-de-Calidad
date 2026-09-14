import { DesktopOutlined, GlobalOutlined, MobileOutlined } from '@ant-design/icons'
import { Empty, Flex, Typography } from 'antd'
import dayjs from 'dayjs'
import type { EventoBitacora } from './bitacoraApi'

const { Text } = Typography

/** Etiquetas legibles para los campos más comunes que se guardan en la bitácora. */
const ETIQUETAS: Record<string, string> = {
  codigo: 'Código',
  nombre: 'Nombre',
  titulo: 'Título',
  tipo: 'Tipo',
  estado: 'Estado',
  avance: '% avance',
  fechaCompromiso: 'Fecha compromiso',
  fechaNueva: 'Nueva fecha',
  fechaAnterior: 'Fecha anterior',
  proximaRevisionAt: 'Próxima revisión',
  comentario: 'Comentario',
  motivo: 'Motivo',
  periodo: 'Periodo',
  valor: 'Valor',
  semaforo: 'Semáforo',
  origen: 'Origen',
  auditoria: 'Auditoría',
  metodologia: 'Metodología',
  itemId: 'Ítem',
  documentoId: 'Documento',
  version: 'Versión',
  archivo: 'Archivo',
  hash: 'Huella (hash)',
  anio: 'Año',
  procesoId: 'Proceso',
  activa: 'Activa',
  config: 'Configuración',
}

function humanizar(clave: string): string {
  if (ETIQUETAS[clave]) return ETIQUETAS[clave]
  const espaciada = clave.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/Id$/, '')
  return espaciada.charAt(0).toUpperCase() + espaciada.slice(1)
}

function formatValor(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
      const d = dayjs(v)
      if (d.isValid()) return d.format('DD/MM/YYYY HH:mm')
    }
    return v
  }
  if (Array.isArray(v)) return v.length === 0 ? '—' : v.map((x) => formatValor(x)).join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Interpreta un user-agent en algo legible, sin depender de una librería. */
function parseDispositivo(ua: string | null): { texto: string; movil: boolean } | null {
  if (!ua) return null
  let so = ''
  if (/iPhone/.test(ua)) so = 'iPhone'
  else if (/iPad/.test(ua)) so = 'iPad'
  else if (/Android/.test(ua)) so = 'Android'
  else if (/Windows/.test(ua)) so = 'Windows'
  else if (/Macintosh|Mac OS X/.test(ua)) so = 'Mac'
  else if (/Linux/.test(ua)) so = 'Linux'

  let nav = ''
  if (/EdgA|Edg\//.test(ua)) nav = 'Edge'
  else if (/CriOS|Chrome\//.test(ua)) nav = 'Chrome'
  else if (/FxiOS|Firefox\//.test(ua)) nav = 'Firefox'
  else if (/Safari\//.test(ua)) nav = 'Safari'

  const texto = [so, nav].filter(Boolean).join(' · ')
  return { texto: texto || 'Navegador no identificado', movil: /iPhone|iPad|Android|Mobile/.test(ua) }
}

function InfoChip({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
  return (
    <Flex align="center" gap={8}>
      <span style={{ color: '#8c8c8c', fontSize: 16 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: '#8c8c8c', lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{valor}</div>
      </div>
    </Flex>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '5px 10px',
  fontSize: 11,
  color: '#8c8c8c',
  fontWeight: 600,
  borderBottom: '1px solid #e8e8e8',
}
const td: React.CSSProperties = { padding: '5px 10px', fontSize: 12.5, borderBottom: '1px solid #f0f0f0' }

function TablaValores({ anterior, nuevo }: { anterior: unknown; nuevo: unknown }) {
  const a = esObjeto(anterior) ? anterior : null
  const n = esObjeto(nuevo) ? nuevo : null

  if (!a && !n) {
    // Valor suelto (no es un objeto): lo mostramos tal cual.
    const suelto = anterior ?? nuevo
    if (suelto === undefined || suelto === null) return null
    return <Text code style={{ fontSize: 12.5 }}>{formatValor(suelto)}</Text>
  }

  const claves = [...new Set([...(n ? Object.keys(n) : []), ...(a ? Object.keys(a) : [])])]
  if (claves.length === 0) return null

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 6 }}>
      <thead>
        <tr>
          <th style={th}>Campo</th>
          {a && <th style={th}>Antes</th>}
          {n && <th style={th}>{a ? 'Después' : 'Valor'}</th>}
        </tr>
      </thead>
      <tbody>
        {claves.map((k) => {
          const va = a?.[k]
          const vn = n?.[k]
          const cambio = !!a && !!n && JSON.stringify(va) !== JSON.stringify(vn)
          return (
            <tr key={k}>
              <td style={{ ...td, color: '#595959', fontWeight: 500 }}>{humanizar(k)}</td>
              {a && (
                <td style={{ ...td, color: cambio ? '#cf1322' : '#262626', textDecoration: cambio ? 'line-through' : 'none' }}>
                  {formatValor(va)}
                </td>
              )}
              {n && (
                <td style={{ ...td, color: cambio ? '#389e0d' : '#262626', fontWeight: cambio ? 600 : 400 }}>
                  {formatValor(vn)}
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function DetalleEvento({ evento }: { evento: EventoBitacora }) {
  const dispositivo = parseDispositivo(evento.userAgent)
  const tieneContexto = !!(evento.ip || dispositivo)
  const tieneValores = evento.valorAnterior != null || evento.valorNuevo != null

  if (!tieneContexto && !tieneValores) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin detalle adicional" style={{ margin: '8px 0' }} />
  }

  return (
    <div style={{ padding: '6px 4px' }}>
      {tieneContexto && (
        <Flex gap={28} wrap style={{ marginBottom: tieneValores ? 14 : 0 }}>
          {evento.ip && <InfoChip icon={<GlobalOutlined />} label="Dirección IP" valor={evento.ip} />}
          {dispositivo && (
            <InfoChip
              icon={dispositivo.movil ? <MobileOutlined /> : <DesktopOutlined />}
              label="Dispositivo"
              valor={dispositivo.texto}
            />
          )}
        </Flex>
      )}
      {tieneValores && <TablaValores anterior={evento.valorAnterior} nuevo={evento.valorNuevo} />}
    </div>
  )
}
