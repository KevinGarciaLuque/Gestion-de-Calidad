import { Popover, Space, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { ESTILO_CATEGORIA } from './categoria'
import { ETIQUETA_CATEGORIA, type MapaCalor } from './riesgosApi'

const { Text } = Typography

export function MapaCalorRiesgos({ mapa }: { mapa: MapaCalor }) {
  // Filas: probabilidad de mayor a menor (arriba = más probable)
  const probs = [...mapa.escalaProbabilidad].sort((a, b) => b.valor - a.valor)
  const imps = [...mapa.escalaImpacto].sort((a, b) => a.valor - b.valor)

  const celda = (prob: number, imp: number) =>
    mapa.celdas.flat().find((c) => c.probabilidad === prob && c.impacto === imp)!

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 3 }}>
        <thead>
          <tr>
            <th style={{ width: 90 }} />
            <th colSpan={imps.length} style={{ padding: '4px 0', fontWeight: 600, color: '#595959' }}>
              Impacto →
            </th>
          </tr>
          <tr>
            <th />
            {imps.map((i) => (
              <th key={i.valor} style={{ padding: 6, fontSize: 12, color: '#595959', minWidth: 96 }}>
                {i.valor}. {i.etiqueta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {probs.map((p, idx) => (
            <tr key={p.valor}>
              <th
                style={{
                  textAlign: 'right',
                  padding: 6,
                  fontSize: 12,
                  color: '#595959',
                  whiteSpace: 'nowrap',
                }}
              >
                {idx === 0 && (
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>↑ Probabilidad</div>
                )}
                {p.valor}. {p.etiqueta}
              </th>
              {imps.map((i) => {
                const c = celda(p.valor, i.valor)
                const est = ESTILO_CATEGORIA[c.categoria]
                const contenido = (
                  <div
                    style={{
                      background: est.bg,
                      color: est.fg,
                      borderRadius: 6,
                      padding: '10px 6px',
                      textAlign: 'center',
                      minHeight: 56,
                      cursor: c.riesgos.length ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{ fontSize: 11, opacity: 0.85 }}>
                      {ETIQUETA_CATEGORIA[c.categoria]} · {c.nivel}
                    </div>
                    {c.riesgos.length > 0 && (
                      <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
                        {c.riesgos.length}
                      </div>
                    )}
                  </div>
                )
                return (
                  <td key={i.valor}>
                    {c.riesgos.length > 0 ? (
                      <Popover
                        title={`${c.riesgos.length} riesgo(s) — ${ETIQUETA_CATEGORIA[c.categoria]}`}
                        content={
                          <Space direction="vertical" size={2} style={{ maxWidth: 280 }}>
                            {c.riesgos.map((r) => (
                              <Link key={r.id} to={`/riesgos/${r.id}`}>
                                {r.codigo} · {r.descripcion.slice(0, 60)}
                              </Link>
                            ))}
                          </Space>
                        }
                      >
                        {contenido}
                      </Popover>
                    ) : (
                      contenido
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <Space size={16} style={{ marginTop: 12 }}>
        {(['BAJO', 'MEDIO', 'ALTO', 'CRITICO'] as const).map((cat) => (
          <Space key={cat} size={6}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: ESTILO_CATEGORIA[cat].bg,
                display: 'inline-block',
                border: '1px solid #eee',
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {ETIQUETA_CATEGORIA[cat]}
            </Text>
          </Space>
        ))}
      </Space>
    </div>
  )
}
