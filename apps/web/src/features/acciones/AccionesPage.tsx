import { useState } from 'react'
import { Button, Flex, Input, Progress, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useAuth } from '@/features/auth/useAuth'
import { AccionFormModal } from './AccionFormModal'
import {
  accionesApi,
  ETIQUETA_ESTADO_ACCION,
  ETIQUETA_ORIGEN_ACCION,
  ETIQUETA_TIPO_ACCION,
  type AccionFila,
  type EstadoAccion,
  type OrigenAccion,
  type TipoAccion,
} from './accionesApi'

const { Title, Text } = Typography

export function estadoColor(e: EstadoAccion): string {
  return e === 'VERIFICADA'
    ? 'success'
    : e === 'COMPLETADA'
      ? 'blue'
      : e === 'EN_CURSO'
        ? 'processing'
        : e === 'CANCELADA'
          ? 'default'
          : 'warning'
}

export function AccionesPage() {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState<TipoAccion | undefined>()
  const [estado, setEstado] = useState<EstadoAccion | undefined>()
  const [origen, setOrigen] = useState<OrigenAccion | undefined>()
  const [vista, setVista] = useState<'abiertas' | 'mias' | 'vencidas' | 'todas'>('abiertas')
  const [pagina, setPagina] = useState(1)
  const [crear, setCrear] = useState(false)

  const { data, isFetching } = useQuery({
    queryKey: ['acciones', { q, tipo, estado, origen, vista, pagina }],
    queryFn: () =>
      accionesApi.listar({
        q: q || undefined,
        tipo,
        estado,
        origen,
        mias: vista === 'mias' || undefined,
        vencidas: vista === 'vencidas' || undefined,
        abiertas: vista === 'abiertas' || undefined,
        pagina,
      }),
  })

  const columnas: ColumnsType<AccionFila> = [
    {
      title: 'Acción',
      dataIndex: 'descripcion',
      render: (d: string, a) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ maxWidth: 420, display: 'inline-block' }} ellipsis={{ tooltip: d }}>
            {d}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {a.codigo} · {ETIQUETA_TIPO_ACCION[a.tipo]} ·{' '}
            {a.origen.ruta ? (
              <Link to={a.origen.ruta} onClick={(e) => e.stopPropagation()}>
                {a.origen.tipo} {a.origen.ref}
              </Link>
            ) : (
              `${a.origen.tipo}${a.origen.ref ? ` · ${a.origen.ref}` : ''}`
            )}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Avance',
      dataIndex: 'avance',
      width: 130,
      render: (v: number, a) => (
        <Progress
          percent={v}
          size="small"
          status={a.estado === 'VERIFICADA' ? 'success' : a.alerta.vencida ? 'exception' : 'active'}
        />
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 130,
      render: (e: EstadoAccion) => <Tag color={estadoColor(e)}>{ETIQUETA_ESTADO_ACCION[e]}</Tag>,
    },
    { title: 'Responsable', dataIndex: ['responsable', 'nombre'], width: 150, render: (v: string) => v ?? '—' },
    {
      title: 'Compromiso',
      dataIndex: 'fechaCompromiso',
      width: 130,
      render: (v: string | null, a) =>
        v ? (
          <Space direction="vertical" size={0}>
            <span>{dayjs(v).format('DD/MM/YYYY')}</span>
            {a.alerta.vencida && <Tag color="volcano">Vencida</Tag>}
            {a.alerta.proxima && <Tag color="gold">Vence pronto</Tag>}
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
            Planes de mejora y acciones
          </Title>
          <Text type="secondary">Correcciones, acciones correctivas, tratamientos y mejoras (CAPA)</Text>
        </div>
        {puede('acciones.crear') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrear(true)}>
            Nueva acción
          </Button>
        )}
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Buscar" style={{ maxWidth: 220 }} onSearch={(v) => { setPagina(1); setQ(v) }} />
        <Select style={{ width: 150 }} value={vista} onChange={(v) => { setPagina(1); setVista(v) }}
          options={[
            { value: 'abiertas', label: 'Abiertas' },
            { value: 'mias', label: 'Mis acciones' },
            { value: 'vencidas', label: 'Vencidas' },
            { value: 'todas', label: 'Todas' },
          ]} />
        <Select allowClear placeholder="Tipo" style={{ width: 190 }} value={tipo} onChange={(v) => { setPagina(1); setTipo(v) }}
          options={(Object.keys(ETIQUETA_TIPO_ACCION) as TipoAccion[]).map((t) => ({ value: t, label: ETIQUETA_TIPO_ACCION[t] }))} />
        <Select allowClear placeholder="Estado" style={{ width: 150 }} value={estado} onChange={(v) => { setPagina(1); setEstado(v) }}
          options={(Object.keys(ETIQUETA_ESTADO_ACCION) as EstadoAccion[]).map((e) => ({ value: e, label: ETIQUETA_ESTADO_ACCION[e] }))} />
        <Select allowClear placeholder="Origen" style={{ width: 190 }} value={origen} onChange={(v) => { setPagina(1); setOrigen(v) }}
          options={(Object.keys(ETIQUETA_ORIGEN_ACCION) as OrigenAccion[]).map((o) => ({ value: o, label: ETIQUETA_ORIGEN_ACCION[o] }))} />
      </Flex>

      <Table<AccionFila>
        rowKey="id"
        columns={columnas}
        dataSource={data?.datos}
        loading={isFetching}
        onRow={(r) => ({ onClick: () => navigate(`/acciones/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{ current: pagina, pageSize: data?.porPagina ?? 20, total: data?.total ?? 0, onChange: setPagina, showSizeChanger: false }}
        scroll={{ x: 950 }}
      />

      {crear && (
        <AccionFormModal
          onClose={() => setCrear(false)}
          onGuardado={(id) => {
            setCrear(false)
            navigate(`/acciones/${id}`)
          }}
        />
      )}
    </>
  )
}
