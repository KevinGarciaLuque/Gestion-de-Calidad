import { Tooltip } from 'antd'
import { semaforo as coloresSemaforo } from '@/app/theme'
import type { Medicion } from './indicadoresApi'

const AZUL = '#00629b'

/**
 * Barras de valor por periodo con línea de meta. Serie única: sin leyenda.
 * El semáforo NO se codifica solo por color (green↔amber no son distinguibles
 * en protanopía): la posición respecto a la línea de meta y el punto de estado
 * bajo cada barra lo refuerzan, y el tooltip lo nombra.
 */
export function TendenciaChart({
  mediciones,
  meta,
  unidad,
  alto = 200,
}: {
  mediciones: Medicion[]
  meta: number
  unidad: string
  alto?: number
}) {
  if (mediciones.length === 0) {
    return <div style={{ color: '#8c8c8c', padding: 24 }}>Aún no hay mediciones para graficar.</div>
  }

  const pad = { top: 30, right: 16, bottom: 40, left: 64 }
  const ancho = Math.max(360, mediciones.length * 74 + pad.left + pad.right)
  const w = ancho - pad.left - pad.right
  const h = alto - pad.top - pad.bottom

  const maxDato = Math.max(meta, ...mediciones.map((m) => m.valor))
  const maxY = maxDato * 1.15 || 1
  const y = (v: number) => pad.top + h - (v / maxY) * h
  const bandW = w / mediciones.length
  const barW = Math.min(40, bandW * 0.55)

  const ticks = [0, maxY / 2, maxY].map((v) => Math.round(v))

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={ancho} height={alto} role="img" aria-label="Tendencia del indicador por periodo">
        {/* Grid + eje Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={ancho - pad.right} y1={y(t)} y2={y(t)} stroke="#f0f0f0" />
            <text x={pad.left - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#8c8c8c">
              {t}
            </text>
          </g>
        ))}

        {/* Línea de meta */}
        <line
          x1={pad.left}
          x2={ancho - pad.right}
          y1={y(meta)}
          y2={y(meta)}
          stroke={coloresSemaforo.verde}
          strokeWidth={2}
          strokeDasharray="5 4"
        />
        <text x={pad.left} y={y(meta) < pad.top + 12 ? y(meta) + 14 : y(meta) - 5} fontSize={11} fill={coloresSemaforo.verde}>
          Meta {meta}
          {unidad === '%' ? '%' : ''}
        </text>

        {/* Barras */}
        {mediciones.map((m, i) => {
          const cx = pad.left + i * bandW + bandW / 2
          const barH = Math.max(2, pad.top + h - y(m.valor))
          const color =
            m.semaforo === 'ROJO'
              ? coloresSemaforo.rojo
              : m.semaforo === 'AMARILLO'
                ? coloresSemaforo.amarillo
                : AZUL
          return (
            <Tooltip
              key={m.id}
              title={`${m.etiqueta}: ${m.valor}${unidad === '%' ? '%' : ` ${unidad}`} · ${
                m.semaforo === 'VERDE' ? 'En meta' : m.semaforo === 'AMARILLO' ? 'Cerca de la meta' : 'Fuera de meta'
              }`}
            >
              <g>
                <rect
                  x={cx - barW / 2}
                  y={y(m.valor)}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill={color}
                />
                <text x={cx} y={y(m.valor) - 6} textAnchor="middle" fontSize={11} fill="#595959">
                  {Math.round(m.valor * 100) / 100}
                </text>
                <text x={cx} y={alto - pad.bottom + 16} textAnchor="middle" fontSize={10} fill="#8c8c8c">
                  {abreviar(m.etiqueta)}
                </text>
              </g>
            </Tooltip>
          )
        })}
      </svg>
    </div>
  )
}

function abreviar(etiqueta: string): string {
  return etiqueta
    .replace('.º trimestre ', 'T')
    .replace('.º semestre ', 'S')
    .replace('Año ', '')
}
