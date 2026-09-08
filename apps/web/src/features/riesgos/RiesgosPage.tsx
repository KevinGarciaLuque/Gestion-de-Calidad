import { useState } from 'react'
import {
  Button,
  Empty,
  Flex,
  Input,
  List,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { CategoriaTag } from './categoria'
import { MapaCalorRiesgos } from './MapaCalorRiesgos'
import { RiesgoFormModal } from './RiesgoFormModal'
import {
  ETIQUETA_ESTADO,
  riesgosApi,
  type CategoriaRiesgo,
  type EstadoRiesgo,
  type RiesgoFila,
  type TipoRiesgo,
} from './riesgosApi'

const { Title, Text } = Typography

export function RiesgosPage() {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const [tab, setTab] = useState('lista')
  const [crear, setCrear] = useState(false)

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Riesgos y oportunidades
          </Title>
          <Text type="secondary">Pensamiento basado en riesgos por proceso</Text>
        </div>
        <Space>
          {puede('riesgos.configurar') && (
            <Button icon={<SettingOutlined />} onClick={() => navigate('/riesgos/matriz')}>
              Matriz
            </Button>
          )}
          {puede('riesgos.crear') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrear(true)}>
              Nuevo riesgo
            </Button>
          )}
        </Space>
      </Flex>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'lista', label: 'Lista', children: <ListaRiesgos /> },
          { key: 'mapa', label: 'Mapa de calor', children: <TabMapa /> },
          { key: 'transversales', label: 'Transversales', children: <TabTransversales /> },
        ]}
      />

      {crear && (
        <RiesgoFormModal
          onClose={() => setCrear(false)}
          onGuardado={(id) => {
            setCrear(false)
            navigate(`/riesgos/${id}`)
          }}
        />
      )}
    </>
  )
}

function ListaRiesgos() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState<TipoRiesgo | undefined>()
  const [categoria, setCategoria] = useState<CategoriaRiesgo | undefined>()
  const [estado, setEstado] = useState<EstadoRiesgo | undefined>()
  const [soloAlerta, setSoloAlerta] = useState(false)
  const [pagina, setPagina] = useState(1)

  const { data, isFetching } = useQuery({
    queryKey: ['riesgos', { q, tipo, categoria, estado, soloAlerta, pagina }],
    queryFn: () =>
      riesgosApi.listar({
        q: q || undefined,
        tipo,
        categoria,
        estado,
        soloConAlerta: soloAlerta || undefined,
        pagina,
      }),
  })

  const columnas: ColumnsType<RiesgoFila> = [
    {
      title: 'Riesgo / oportunidad',
      dataIndex: 'descripcion',
      render: (d: string, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ maxWidth: 380, display: 'inline-block' }} ellipsis={{ tooltip: d }}>
            {d}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.codigo} · {r.proceso.codigo} · {r.tipo === 'OPORTUNIDAD' ? 'Oportunidad' : 'Riesgo'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Inherente',
      key: 'inh',
      width: 110,
      render: (_, r) => <CategoriaTag categoria={r.categoriaInherente} tipo={r.tipo} sufijo={`(${r.nivelInherente})`} />,
    },
    {
      title: 'Residual',
      key: 'res',
      width: 110,
      render: (_, r) =>
        r.categoriaResidual ? (
          <CategoriaTag categoria={r.categoriaResidual} tipo={r.tipo} sufijo={`(${r.nivelResidual})`} />
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 130,
      render: (e: EstadoRiesgo) => <Tag>{ETIQUETA_ESTADO[e]}</Tag>,
    },
    {
      title: 'Alertas',
      key: 'al',
      render: (_, r) => (
        <Space size={[4, 4]} wrap>
          {r.alerta.revisionVencida && <Tag color="volcano">Revisión vencida</Tag>}
          {r.alerta.revisionProxima && <Tag color="gold">Revisión próxima</Tag>}
          {r.alerta.planVencido && <Tag color="red">Plan vencido</Tag>}
          {r.alerta.faltaTratamiento && (
            <Tooltip title="Riesgo alto/crítico sin responsable o sin plan de tratamiento">
              <Tag color="red">Falta tratamiento</Tag>
            </Tooltip>
          )}
          {r.alerta.requiereReevaluacion && <Tag color="blue">Reevaluar</Tag>}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input.Search allowClear placeholder="Buscar" style={{ maxWidth: 220 }} onSearch={(v) => { setPagina(1); setQ(v) }} />
        <Select allowClear placeholder="Tipo" style={{ width: 130 }} value={tipo} onChange={(v) => { setPagina(1); setTipo(v) }}
          options={[{ value: 'RIESGO', label: 'Riesgo' }, { value: 'OPORTUNIDAD', label: 'Oportunidad' }]} />
        <Select allowClear placeholder="Categoría" style={{ width: 140 }} value={categoria} onChange={(v) => { setPagina(1); setCategoria(v) }}
          options={(['BAJO', 'MEDIO', 'ALTO', 'CRITICO'] as CategoriaRiesgo[]).map((c) => ({ value: c, label: c }))} />
        <Select allowClear placeholder="Estado" style={{ width: 150 }} value={estado} onChange={(v) => { setPagina(1); setEstado(v) }}
          options={(Object.keys(ETIQUETA_ESTADO) as EstadoRiesgo[]).map((e) => ({ value: e, label: ETIQUETA_ESTADO[e] }))} />
        <Select style={{ width: 160 }} value={soloAlerta ? 'a' : 't'} onChange={(v) => { setPagina(1); setSoloAlerta(v === 'a') }}
          options={[{ value: 't', label: 'Todos' }, { value: 'a', label: 'Solo con alerta' }]} />
      </Flex>

      <Table<RiesgoFila>
        rowKey="id"
        columns={columnas}
        dataSource={data?.datos}
        loading={isFetching}
        onRow={(r) => ({ onClick: () => navigate(`/riesgos/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{ current: pagina, pageSize: data?.porPagina ?? 20, total: data?.total ?? 0, onChange: setPagina, showSizeChanger: false }}
        scroll={{ x: 900 }}
      />
    </>
  )
}

function TabMapa() {
  const [tipo, setTipo] = useState<TipoRiesgo>('RIESGO')
  const { data } = useQuery({ queryKey: ['mapa-calor', tipo], queryFn: () => riesgosApi.mapaCalor(tipo) })
  return (
    <>
      <Select
        value={tipo}
        onChange={setTipo}
        style={{ width: 160, marginBottom: 16 }}
        options={[{ value: 'RIESGO', label: 'Riesgos' }, { value: 'OPORTUNIDAD', label: 'Oportunidades' }]}
      />
      {data ? <MapaCalorRiesgos mapa={data} /> : null}
      {data && (
        <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
          {data.total} {tipo === 'RIESGO' ? 'riesgos' : 'oportunidades'} activos, ubicados por su nivel residual (o inherente si aún no se reevalúa).
        </Text>
      )}
    </>
  )
}

function TabTransversales() {
  const { data } = useQuery({ queryKey: ['riesgos-transversales'], queryFn: riesgosApi.transversales })
  if (!data) return null
  if (data.length === 0)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay riesgos repetidos en varios procesos" />
  return (
    <List
      dataSource={data}
      renderItem={(t) => (
        <List.Item>
          <List.Item.Meta
            title={t.descripcion}
            description={
              <Space wrap>
                {t.procesos.map((p) => (
                  <Link key={p.riesgoId} to={`/riesgos/${p.riesgoId}`}>
                    <Tag>{p.proceso.codigo}</Tag>
                  </Link>
                ))}
              </Space>
            }
          />
        </List.Item>
      )}
    />
  )
}
