import { useState } from 'react'
import {
  Button,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { SemaforoDot } from '@/components/Semaforo'
import { useAuth } from '@/features/auth/useAuth'
import {
  ETIQUETA_FRECUENCIA,
  indicadoresApi,
  type Frecuencia,
  type IndicadorFila,
  type SemaforoMedicion,
} from './indicadoresApi'
import { IndicadorFormModal } from './IndicadorFormModal'

const { Title, Text } = Typography

export function semEstado(s: SemaforoMedicion | null) {
  return s === 'VERDE' ? 'verde' : s === 'AMARILLO' ? 'amarillo' : s === 'ROJO' ? 'rojo' : 'gris'
}

export function IndicadoresPage() {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const [q, setQ] = useState('')
  const [frecuencia, setFrecuencia] = useState<Frecuencia | undefined>()
  const [soloAlerta, setSoloAlerta] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [crear, setCrear] = useState(false)

  const { data, isFetching } = useQuery({
    queryKey: ['indicadores', { q, frecuencia, soloAlerta, pagina }],
    queryFn: () =>
      indicadoresApi.listar({
        q: q || undefined,
        frecuencia,
        soloConAlerta: soloAlerta || undefined,
        pagina,
      }),
  })

  const columnas: ColumnsType<IndicadorFila> = [
    {
      title: 'Indicador',
      dataIndex: 'nombre',
      render: (nombre: string, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{nombre}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.codigo} · {r.proceso.codigo}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Frecuencia',
      dataIndex: 'frecuencia',
      width: 110,
      render: (f: Frecuencia) => ETIQUETA_FRECUENCIA[f],
    },
    {
      title: 'Meta',
      dataIndex: 'meta',
      width: 90,
      render: (m: number, r) => `${m}${r.unidad === '%' ? '%' : ` ${r.unidad}`}`,
    },
    {
      title: 'Último resultado',
      key: 'ultimo',
      width: 170,
      render: (_, r) =>
        r.alerta.ultimoValor == null ? (
          <Text type="secondary">Sin datos</Text>
        ) : (
          <Space>
            <SemaforoDot estado={semEstado(r.alerta.ultimoSemaforo)} />
            <span>
              {r.alerta.ultimoValor}
              {r.unidad === '%' ? '%' : ` ${r.unidad}`}
            </span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.alerta.ultimoPeriodo}
            </Text>
          </Space>
        ),
    },
    {
      title: 'Alertas',
      key: 'alertas',
      render: (_, r) => (
        <Space size={[4, 4]} wrap>
          {r.alerta.capturaPendiente && <Tag color="blue">Captura pendiente</Tag>}
          {r.alerta.periodosVencidos > 0 && (
            <Tag color="volcano">{r.alerta.periodosVencidos} periodo(s) sin capturar</Tag>
          )}
          {r.alerta.reincidente && <Tag color="red">Reincidente</Tag>}
          {r.alerta.requierenAnalisis > 0 && (
            <Tooltip title="Mediciones fuera de meta sin análisis registrado">
              <Tag color="gold">{r.alerta.requierenAnalisis} sin análisis</Tag>
            </Tooltip>
          )}
          {!r.activo && <Tag>Archivado</Tag>}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Indicadores
          </Title>
          <Text type="secondary">Desempeño, metas y tendencias de los procesos</Text>
        </div>
        {puede('indicadores.crear') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrear(true)}>
            Nuevo indicador
          </Button>
        )}
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="Buscar por nombre o código"
          style={{ maxWidth: 280 }}
          onSearch={(v) => {
            setPagina(1)
            setQ(v)
          }}
        />
        <Select
          allowClear
          placeholder="Frecuencia"
          style={{ width: 160 }}
          value={frecuencia}
          onChange={(v) => {
            setPagina(1)
            setFrecuencia(v)
          }}
          options={(Object.keys(ETIQUETA_FRECUENCIA) as Frecuencia[]).map((f) => ({
            value: f,
            label: ETIQUETA_FRECUENCIA[f],
          }))}
        />
        <Select
          style={{ width: 170 }}
          value={soloAlerta ? 'alerta' : 'todos'}
          onChange={(v) => {
            setPagina(1)
            setSoloAlerta(v === 'alerta')
          }}
          options={[
            { value: 'todos', label: 'Todos' },
            { value: 'alerta', label: 'Solo con alerta' },
          ]}
        />
      </Flex>

      <Table<IndicadorFila>
        rowKey="id"
        columns={columnas}
        dataSource={data?.datos}
        loading={isFetching}
        onRow={(r) => ({ onClick: () => navigate(`/indicadores/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{
          current: pagina,
          pageSize: data?.porPagina ?? 20,
          total: data?.total ?? 0,
          onChange: setPagina,
          showSizeChanger: false,
        }}
        scroll={{ x: 820 }}
      />

      {crear && (
        <IndicadorFormModal
          onClose={() => setCrear(false)}
          onGuardado={(id) => {
            setCrear(false)
            navigate(`/indicadores/${id}`)
          }}
        />
      )}
    </>
  )
}

export function IconoTendencia({ t }: { t: string }) {
  if (t === 'MEJORA') return <ArrowUpOutlined style={{ color: '#389e0d' }} />
  if (t === 'DETERIORO') return <ArrowDownOutlined style={{ color: '#cf1322' }} />
  if (t === 'ESTABLE') return <MinusOutlined style={{ color: '#8c8c8c' }} />
  return <span style={{ color: '#bbb' }}>—</span>
}
