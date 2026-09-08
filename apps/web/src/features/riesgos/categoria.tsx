import { Tag } from 'antd'
import {
  ETIQUETA_CATEGORIA,
  ETIQUETA_CATEGORIA_OPORTUNIDAD,
  type CategoriaRiesgo,
  type TipoRiesgo,
} from './riesgosApi'

/**
 * Rampa de un solo tono (rojo) claro→oscuro por severidad: segura para daltonismo
 * porque varía en luminosidad. Siempre se muestra junto a la palabra de la categoría.
 */
export const ESTILO_CATEGORIA: Record<CategoriaRiesgo, { bg: string; fg: string }> = {
  BAJO: { bg: '#fff1f0', fg: '#820014' },
  MEDIO: { bg: '#ffccc7', fg: '#820014' },
  ALTO: { bg: '#ff7875', fg: '#ffffff' },
  CRITICO: { bg: '#cf1322', fg: '#ffffff' },
}

export function CategoriaTag({
  categoria,
  tipo = 'RIESGO',
  sufijo,
}: {
  categoria: CategoriaRiesgo | null | undefined
  tipo?: TipoRiesgo
  sufijo?: string
}) {
  if (!categoria) return <Tag>—</Tag>
  const est = ESTILO_CATEGORIA[categoria]
  const texto =
    tipo === 'OPORTUNIDAD' ? ETIQUETA_CATEGORIA_OPORTUNIDAD[categoria] : ETIQUETA_CATEGORIA[categoria]
  return (
    <Tag style={{ background: est.bg, color: est.fg, border: 'none', fontWeight: 600 }}>
      {texto}
      {sufijo ? ` ${sufijo}` : ''}
    </Tag>
  )
}
