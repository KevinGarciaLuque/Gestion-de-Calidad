import { Alert, Card, Col, Empty, Flex, Progress, Row, Segmented, Skeleton, Table, Tag, Tooltip, Typography } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { Dona } from '@/features/dashboard/Charts'
import {
  COLOR_ESTATUS,
  COLOR_TIPO,
  ETIQUETA_ESTATUS,
  ETIQUETA_TIPO,
  lempiras,
  mccApi,
  TAG_ESTATUS,
  type FiltrosControl,
  type TableroMCC,
} from './mccApi'

const { Text, Title } = Typography

const AZUL = '#0b2a45'

export function MccTablero({
  filtros,
  onFiltrar,
  onVerRegistro,
}: {
  filtros: FiltrosControl
  onFiltrar: (f: Partial<FiltrosControl>) => void
  onVerRegistro: (id: string) => void
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mcc', 'tablero', filtros],
    queryFn: () => mccApi.tablero(filtros),
  })

  if (error) return <Alert type="error" showIcon message={mensajeDeError(error)} />
  if (isLoading || !data) return <Skeleton active paragraph={{ rows: 10 }} />
  if (data.kpis.total === 0)
    return <Empty description="No hay registros con estos filtros. Importa el histórico o crea un registro nuevo." />

  const k = data.kpis
  return (
    <Flex vertical gap={16}>
      <SafetyClock data={data} />

      <Row gutter={[16, 16]}>
        <Kpi color="#0958d9" titulo="Total hallazgos registrados" valor={k.total} detalle={`Costo de la no calidad: ${lempiras(k.costoTotal)}`} />
        <Kpi color="#d48806" titulo="Acciones ACyP pendientes" valor={data.acyp.pendientes + data.acyp.seguimiento} detalle="Abiertas o en seguimiento" />
        <Kpi color="#389e0d" titulo="Acciones ACyP completadas" valor={data.acyp.completadas} detalle="100 % de cumplimiento o cerradas" />
        <Kpi color="#cf1322" titulo="Acciones ACyP vencidas" valor={data.acyp.vencidas} detalle="Fuera de la fecha límite" />
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={9}>
          <Card title="Matriz de estado y % de cierre" extra={<Tag color="green">{k.porcentajeCierre}% cierre</Tag>} style={{ height: '100%' }}>
            <Table
              size="small"
              pagination={false}
              rowKey="estatus"
              dataSource={data.matrizEstado}
              columns={[
                { title: 'Estado', dataIndex: 'estatus', render: (e) => <Tag color={TAG_ESTATUS[e as keyof typeof TAG_ESTATUS]}>{ETIQUETA_ESTATUS[e as keyof typeof ETIQUETA_ESTATUS]}</Tag> },
                { title: 'Cantidad', dataIndex: 'cantidad', align: 'right' },
                { title: '% total', dataIndex: 'porcentaje', align: 'right', render: (p: number) => `${p}%` },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Text strong>{k.total}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><Text strong>100%</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
              Progreso de cierre efectivo ({k.cerrados} de {k.baseCierre}; no cuenta desestimados ni sin estado)
            </Text>
            <Progress percent={k.porcentajeCierre} strokeColor="#389e0d" />
          </Card>
        </Col>
        <Col xs={24} lg={15}>
          <Card title="Mapa por tipo de registro" extra={<Tag>{data.porTipo.length} tipos</Tag>} style={{ height: '100%' }}>
            <Row gutter={[12, 12]}>
              {data.porTipo.map((t) => (
                <Col xs={24} sm={12} xl={8} key={t.tipo}>
                  <div
                    onClick={() => t.tipo !== 'SIN_CLASIFICAR' && onFiltrar({ tipo: filtros.tipo === t.tipo ? undefined : t.tipo })}
                    style={{
                      border: '1px solid #f0f0f0', borderLeft: `4px solid ${COLOR_TIPO[t.tipo]}`, borderRadius: 8, padding: 12,
                      cursor: t.tipo === 'SIN_CLASIFICAR' ? 'default' : 'pointer', background: filtros.tipo === t.tipo ? '#f0f7ff' : undefined,
                    }}
                  >
                    <Flex justify="space-between" align="center">
                      <Text strong style={{ fontSize: 13 }}>{ETIQUETA_TIPO[t.tipo].toUpperCase()}</Text>
                      <Tag color={COLOR_TIPO[t.tipo]} style={{ marginInlineEnd: 0 }}>{t.total}</Tag>
                    </Flex>
                    <Flex justify="space-between" style={{ fontSize: 12, marginTop: 4 }}>
                      <Text type="secondary">{t.porcentaje}%</Text>
                      <Text strong>{t.porcentajeCierre}% cierre</Text>
                    </Flex>
                    <Progress percent={t.porcentajeCierre} showInfo={false} size="small" strokeColor={COLOR_TIPO[t.tipo]} />
                    <Flex gap={4} wrap style={{ fontSize: 11 }}>
                      <Tag color="green" bordered={false}>Cerr: {t.cerrados}</Tag>
                      <Tag color="red" bordered={false}>Ab: {t.abiertos}</Tag>
                      <Tag color="gold" bordered={false}>Seg: {t.seguimiento}</Tag>
                      {t.vencidos > 0 && <Tag color="#262626">Venc: {t.vencidos}</Tag>}
                    </Flex>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title="Distribución por tipo" style={{ height: '100%' }}>
            <Dona
              size={170}
              etiquetaCentro="registros"
              datos={data.porTipo.map((t) => ({ nombre: `${ETIQUETA_TIPO[t.tipo]} (${t.porcentaje}%)`, valor: t.total, color: COLOR_TIPO[t.tipo] }))}
            />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="Estatus de acciones ACyP" style={{ height: '100%' }}>
            <BarrasVerticales
              datos={[
                { nombre: 'Pendientes (abiertas)', valor: data.acyp.pendientes, color: '#ff4d4f' },
                { nombre: 'En seguimiento', valor: data.acyp.seguimiento, color: '#faad14' },
                { nombre: 'Completadas', valor: data.acyp.completadas, color: '#52c41a' },
                { nombre: 'Vencidas (con mora)', valor: data.acyp.vencidas, color: '#820014' },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <PorArea data={data} onFiltrar={onFiltrar} />

      <Card
        title="Tabla consolidada por macroproceso y área"
        extra={<Tag color="blue">{data.consolidado.length} áreas</Tag>}
      >
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
          Haz clic en un código para abrir el registro, o en el macroproceso / área para filtrar todo el tablero.
        </Text>
        <Table
          size="small"
          rowKey={(r) => `${r.macroproceso}|${r.area}`}
          dataSource={data.consolidado}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          scroll={{ x: 1100 }}
          columns={[
            {
              title: 'Macroproceso', dataIndex: 'macroproceso', width: 160,
              render: (m: string) => <a onClick={() => onFiltrar({ macroproceso: m === 'Sin macroproceso' ? undefined : m, area: undefined })}>{m}</a>,
            },
            {
              title: 'Área responsable', dataIndex: 'area', width: 190,
              render: (a: string, r) => (
                <a onClick={() => onFiltrar({ macroproceso: r.macroproceso === 'Sin macroproceso' ? undefined : r.macroproceso, area: a === 'Sin área' ? undefined : a })}>{a}</a>
              ),
            },
            {
              title: 'Códigos', dataIndex: 'codigos', width: 260,
              render: (cs: { id: string; codigo: string }[]) => (
                <div style={{ maxHeight: 64, overflowY: 'auto' }}>
                  <Flex gap={4} wrap>
                    {cs.map((c) => (
                      <Tag key={c.id} color="blue" style={{ cursor: 'pointer', marginInlineEnd: 0 }} onClick={() => onVerRegistro(c.id)}>
                        {c.codigo}
                      </Tag>
                    ))}
                  </Flex>
                </div>
              ),
            },
            { title: 'Total', dataIndex: 'total', align: 'center', width: 60, render: (n: number) => <Text strong>{n}</Text> },
            { title: 'Abiertos', dataIndex: 'abiertos', align: 'center', width: 75, render: (n: number) => <Contador n={n} color="#cf1322" /> },
            { title: 'En seg.', dataIndex: 'seguimiento', align: 'center', width: 70, render: (n: number) => <Contador n={n} color="#d48806" /> },
            { title: 'Cerrados', dataIndex: 'cerrados', align: 'center', width: 75, render: (n: number) => <Contador n={n} color="#389e0d" siempre /> },
            { title: 'Desest.', dataIndex: 'desestimados', align: 'center', width: 70 },
            { title: 'Vencidos', dataIndex: 'vencidos', align: 'center', width: 75, render: (n: number) => <Contador n={n} color="#262626" /> },
            {
              title: '% cierre', dataIndex: 'porcentajeCierre', align: 'center', width: 80,
              render: (p: number) => <Text strong style={{ color: p >= 80 ? '#389e0d' : p >= 50 ? '#d48806' : '#cf1322' }}>{p}%</Text>,
            },
            { title: 'ACyP pend.', dataIndex: 'acypPendientes', align: 'center', width: 80 },
            { title: 'ACyP comp.', dataIndex: 'acypCompletadas', align: 'center', width: 85, render: (n: number) => <Text style={{ color: '#389e0d' }}>{n}</Text> },
            { title: 'ACyP venc.', dataIndex: 'acypVencidas', align: 'center', width: 80, render: (n: number) => <Text style={{ color: '#cf1322' }}>{n}</Text> },
          ]}
        />
      </Card>
    </Flex>
  )
}

function SafetyClock({ data }: { data: TableroMCC }) {
  const k = data.kpis
  const celda = (titulo: string, valor: React.ReactNode, detalle: string, color: string) => (
    <Col xs={12} md={6}>
      <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 14px', height: '100%' }}>
        <div style={{ color: '#c9d6e2', fontSize: 12 }}>{titulo}</div>
        <div style={{ color, fontSize: 28, fontWeight: 700, lineHeight: 1.3 }}>{valor}</div>
        <div style={{ color: '#9fb3c8', fontSize: 12 }}>{detalle}</div>
      </div>
    </Col>
  )
  return (
    <div style={{ background: `linear-gradient(135deg, ${AZUL}, #12476e)`, borderRadius: 12, padding: 20 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} lg={8}>
          <Flex align="center" gap={16}>
            <ClockCircleOutlined style={{ fontSize: 44, color: '#f5c242' }} />
            <div>
              <Tooltip title="Días desde la recepción del último registro crítico (impacto alto/grave/crítico o prioridad alta). Se reinicia con cada evento crítico nuevo.">
                <div style={{ color: '#f5c242', fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>SAFETY CLOCK · CONTROL MCC</div>
              </Tooltip>
              <Flex align="baseline" gap={8}>
                <Title level={1} style={{ color: '#fff', margin: 0 }}>{data.safetyClock.dias ?? '—'}</Title>
                <Text style={{ color: '#c9d6e2' }}>
                  {data.safetyClock.dias === null ? 'sin registros críticos' : 'días desde el último hallazgo crítico'}
                </Text>
              </Flex>
              {data.safetyClock.desde && (
                <Text style={{ color: '#9fb3c8', fontSize: 12 }}>Último: {dayjs(data.safetyClock.desde).format('DD/MM/YYYY')}</Text>
              )}
            </div>
          </Flex>
        </Col>
        <Col xs={24} lg={16}>
          <Row gutter={[12, 12]}>
            {celda('% cerrados vs abiertos', `${k.porcentajeCierre}%`, `${k.cerrados} cerrados / ${k.baseCierre}`, '#73d13d')}
            {celda('Total abiertos / seguimiento', k.abiertos + k.seguimiento, `${k.abiertos} ab · ${k.seguimiento} seg`, '#f5c242')}
            {celda('Fechas de cierre vencidas', k.vencidos, 'En mora', '#ff7875')}
            {celda(`Por vencer (≤ 7 días)`, k.porVencer, 'Próximos', '#69c0ff')}
          </Row>
        </Col>
      </Row>
    </div>
  )
}

function Kpi({ titulo, valor, detalle, color }: { titulo: string; valor: number; detalle: string; color: string }) {
  return (
    <Col xs={24} sm={12} lg={6}>
      <Card style={{ borderLeft: `4px solid ${color}`, height: '100%' }} styles={{ body: { padding: 16 } }}>
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>{titulo}</Text>
        <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1.4 }}>{valor}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{detalle}</Text>
      </Card>
    </Col>
  )
}

function Contador({ n, color, siempre }: { n: number; color: string; siempre?: boolean }) {
  if (!n && !siempre) return <Text type="secondary">0</Text>
  return <Tag color={color} style={{ marginInlineEnd: 0, minWidth: 24, textAlign: 'center' }}>{n}</Tag>
}

function BarrasVerticales({ datos }: { datos: { nombre: string; valor: number; color: string }[] }) {
  const total = datos.reduce((s, d) => s + d.valor, 0)
  const max = Math.max(1, ...datos.map((d) => d.valor))
  if (!total) return <Empty description="Ningún registro requiere ACyP con estos filtros" />
  return (
    <Flex gap={16} align="flex-end" style={{ height: 230, paddingTop: 8 }}>
      {datos.map((d) => (
        <Flex key={d.nombre} vertical align="center" justify="flex-end" style={{ flex: 1, height: '100%' }}>
          <Text strong style={{ fontSize: 12 }}>
            {d.valor} ({Math.round((d.valor / total) * 1000) / 10}%)
          </Text>
          <div style={{ width: '70%', height: `${(d.valor / max) * 170}px`, minHeight: d.valor ? 4 : 0, background: d.color, borderRadius: '4px 4px 0 0' }} />
          <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', marginTop: 6 }}>{d.nombre}</Text>
        </Flex>
      ))}
    </Flex>
  )
}

function PorArea({ data, onFiltrar }: { data: TableroMCC; onFiltrar: (f: Partial<FiltrosControl>) => void }) {
  const [modo, setModo] = useState<'Horizontal' | 'Vertical'>('Horizontal')
  const max = Math.max(1, ...data.porArea.map((a) => a.total))
  const segmentos = (a: TableroMCC['porArea'][number]) => [
    { nombre: 'Cerrados', valor: a.cerrados, color: COLOR_ESTATUS.CERRADO },
    { nombre: 'Abiertos / seg.', valor: a.abiertos, color: COLOR_ESTATUS.ABIERTO },
    { nombre: 'Otros / desest.', valor: a.otros, color: '#adb5bd' },
  ]
  const leyenda = (
    <Flex gap={16} justify="center" style={{ fontSize: 12, marginBottom: 12 }}>
      {segmentos({ area: '', macroproceso: null, total: 0, porcentaje: 0, cerrados: 0, abiertos: 0, otros: 0 }).map((s) => (
        <Flex key={s.nombre} align="center" gap={6}>
          <span style={{ width: 12, height: 10, background: s.color, display: 'inline-block', borderRadius: 2 }} />
          {s.nombre}
        </Flex>
      ))}
    </Flex>
  )
  return (
    <Card
      title={
        <div>
          Frecuencia de hallazgos por área y macroproceso
          <div style={{ fontSize: 12, fontWeight: 400, color: '#8c8c8c' }}>Top 15 áreas (cantidad y %)</div>
        </div>
      }
      extra={<Segmented options={['Horizontal', 'Vertical']} value={modo} onChange={(v) => setModo(v as typeof modo)} />}
    >
      {leyenda}
      {modo === 'Horizontal' ? (
        <Flex vertical gap={6}>
          {data.porArea.map((a) => (
            <Flex key={`${a.macroproceso}|${a.area}`} align="center" gap={8}>
              <Tooltip title={a.macroproceso ?? ''}>
                <a
                  style={{ width: 260, textAlign: 'right', fontSize: 12, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  onClick={() => onFiltrar({ area: a.area === 'Sin área' ? undefined : a.area })}
                >
                  {a.area} {a.macroproceso ? `(${a.macroproceso})` : ''} — {a.total} ({a.porcentaje}%)
                </a>
              </Tooltip>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', width: `${(a.total / max) * 100}%`, minWidth: 30, height: 20, borderRadius: 3, overflow: 'hidden' }}>
                  {segmentos(a).map((s) =>
                    s.valor > 0 ? (
                      <Tooltip key={s.nombre} title={`${s.nombre}: ${s.valor}`}>
                        <div style={{ flex: s.valor, background: s.color, color: '#fff', fontSize: 11, textAlign: 'center', lineHeight: '20px', overflow: 'hidden' }}>
                          {s.valor} ({Math.round((s.valor / a.total) * 100)}%)
                        </div>
                      </Tooltip>
                    ) : null,
                  )}
                </div>
              </div>
            </Flex>
          ))}
        </Flex>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <Flex gap={10} align="flex-end" style={{ height: 280, minWidth: data.porArea.length * 70 }}>
            {data.porArea.map((a) => (
              <Flex key={`${a.macroproceso}|${a.area}`} vertical align="center" justify="flex-end" style={{ flex: 1, height: '100%' }}>
                <Text strong style={{ fontSize: 11 }}>{a.total}</Text>
                <Flex vertical style={{ width: '70%', height: `${(a.total / max) * 200}px`, borderRadius: '3px 3px 0 0', overflow: 'hidden' }}>
                  {[...segmentos(a)].reverse().map((s) =>
                    s.valor > 0 ? (
                      <Tooltip key={s.nombre} title={`${s.nombre}: ${s.valor}`}>
                        <div style={{ flex: s.valor, background: s.color }} />
                      </Tooltip>
                    ) : null,
                  )}
                </Flex>
                <a
                  onClick={() => onFiltrar({ area: a.area === 'Sin área' ? undefined : a.area })}
                  style={{ fontSize: 10, textAlign: 'center', marginTop: 4, height: 40, overflow: 'hidden', lineHeight: 1.2 }}
                >
                  {a.area}
                </a>
              </Flex>
            ))}
          </Flex>
        </div>
      )}
    </Card>
  )
}
