import { useState } from 'react'
import { Button, Flex, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useAuth } from '@/features/auth/useAuth'
import { HallazgoFormModal } from './HallazgoFormModal'
import {
  ETIQUETA_CLASIFICACION,
  ETIQUETA_ESTADO_HALLAZGO,
  ETIQUETA_ORIGEN,
  hallazgosApi,
  type ClasificacionHallazgo,
  type EstadoHallazgo,
  type HallazgoFila,
  type OrigenHallazgo,
} from './hallazgosApi'

const { Title, Text } = Typography

export function clasifColor(c: ClasificacionHallazgo): string {
  return c === 'NO_CONFORMIDAD_MAYOR'
    ? 'red'
    : c === 'NO_CONFORMIDAD_MENOR'
      ? 'volcano'
      : c === 'OBSERVACION'
        ? 'gold'
        : 'blue'
}

export function HallazgosPage() {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const [q, setQ] = useState('')
  const [origen, setOrigen] = useState<OrigenHallazgo | undefined>()
  const [clasificacion, setClasificacion] = useState<ClasificacionHallazgo | undefined>()
  const [estado, setEstado] = useState<EstadoHallazgo | undefined>()
  const [soloAbiertos, setSoloAbiertos] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [crear, setCrear] = useState(false)

  const { data, isFetching } = useQuery({
    queryKey: ['hallazgos', { q, origen, clasificacion, estado, soloAbiertos, pagina }],
    queryFn: () =>
      hallazgosApi.listar({
        q: q || undefined,
        origen,
        clasificacion,
        estado,
        abiertos: soloAbiertos || undefined,
        pagina,
      }),
  })

  const columnas: ColumnsType<HallazgoFila> = [
    {
      title: 'Hallazgo',
      dataIndex: 'descripcion',
      render: (d: string, h) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ maxWidth: 420, display: 'inline-block' }} ellipsis={{ tooltip: d }}>
            {d}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {h.codigo} · {ETIQUETA_ORIGEN[h.origen]}
            {h.proceso ? ` · ${h.proceso.codigo}` : ''}
            {h.auditoria ? ` · ${h.auditoria.codigo}` : ''}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Clasificación',
      dataIndex: 'clasificacion',
      width: 170,
      render: (c: ClasificacionHallazgo) => <Tag color={clasifColor(c)}>{ETIQUETA_CLASIFICACION[c]}</Tag>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 150,
      render: (e: EstadoHallazgo) => <Tag>{ETIQUETA_ESTADO_HALLAZGO[e]}</Tag>,
    },
    { title: 'Responsable', dataIndex: ['responsable', 'nombre'], width: 150, render: (v: string) => v ?? '—' },
    {
      title: 'Compromiso',
      dataIndex: 'fechaCompromiso',
      width: 130,
      render: (v: string | null, h) =>
        v ? (
          <Space direction="vertical" size={0}>
            <span>{dayjs(v).format('DD/MM/YYYY')}</span>
            {h.alerta.planVencido && <Tag color="volcano">Vencido</Tag>}
          </Space>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Hallazgos y no conformidades
          </Title>
          <Text type="secondary">Desviaciones de auditorías, indicadores, quejas e inspecciones</Text>
        </div>
        {puede('hallazgos.crear') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrear(true)}>
            Nuevo hallazgo
          </Button>
        )}
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Buscar" style={{ maxWidth: 220 }} onSearch={(v) => { setPagina(1); setQ(v) }} />
        <Select allowClear placeholder="Origen" style={{ width: 170 }} value={origen} onChange={(v) => { setPagina(1); setOrigen(v) }}
          options={(Object.keys(ETIQUETA_ORIGEN) as OrigenHallazgo[]).map((o) => ({ value: o, label: ETIQUETA_ORIGEN[o] }))} />
        <Select allowClear placeholder="Clasificación" style={{ width: 190 }} value={clasificacion} onChange={(v) => { setPagina(1); setClasificacion(v) }}
          options={(Object.keys(ETIQUETA_CLASIFICACION) as ClasificacionHallazgo[]).map((c) => ({ value: c, label: ETIQUETA_CLASIFICACION[c] }))} />
        <Select allowClear placeholder="Estado" style={{ width: 170 }} value={estado} onChange={(v) => { setPagina(1); setEstado(v) }}
          options={(Object.keys(ETIQUETA_ESTADO_HALLAZGO) as EstadoHallazgo[]).map((e) => ({ value: e, label: ETIQUETA_ESTADO_HALLAZGO[e] }))} />
        <Select style={{ width: 150 }} value={soloAbiertos ? 'a' : 't'} onChange={(v) => { setPagina(1); setSoloAbiertos(v === 'a') }}
          options={[{ value: 'a', label: 'Abiertos' }, { value: 't', label: 'Todos' }]} />
      </Flex>

      <Table<HallazgoFila>
        rowKey="id"
        columns={columnas}
        dataSource={data?.datos}
        loading={isFetching}
        onRow={(r) => ({ onClick: () => navigate(`/hallazgos/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{ current: pagina, pageSize: data?.porPagina ?? 20, total: data?.total ?? 0, onChange: setPagina, showSizeChanger: false }}
        scroll={{ x: 900 }}
      />

      {crear && (
        <HallazgoFormModal
          onClose={() => setCrear(false)}
          onGuardado={(id) => {
            setCrear(false)
            navigate(`/hallazgos/${id}`)
          }}
        />
      )}
    </>
  )
}
