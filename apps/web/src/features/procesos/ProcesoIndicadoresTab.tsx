import { Button, Empty, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SemaforoDot } from '@/components/Semaforo'
import { useAuth } from '@/features/auth/useAuth'
import {
  ETIQUETA_FRECUENCIA,
  indicadoresApi,
  type IndicadorFila,
} from '@/features/indicadores/indicadoresApi'
import { semEstado } from '@/features/indicadores/IndicadoresPage'
import { IndicadorFormModal } from '@/features/indicadores/IndicadorFormModal'

const { Text } = Typography

export function ProcesoIndicadoresTab({ procesoId }: { procesoId: string }) {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const [crear, setCrear] = useState(false)

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['indicadores', { procesoId }],
    queryFn: () => indicadoresApi.listar({ procesoId, pagina: 1 }),
    enabled: puede('indicadores.ver'),
  })

  if (!puede('indicadores.ver')) {
    return <Text type="secondary">No tienes acceso a los indicadores.</Text>
  }

  return (
    <>
      {puede('indicadores.crear') && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ marginBottom: 12 }}
          onClick={() => setCrear(true)}
        >
          Nuevo indicador
        </Button>
      )}

      <Table<IndicadorFila>
        rowKey="id"
        size="small"
        loading={isFetching}
        dataSource={data?.datos}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin indicadores" /> }}
        onRow={(r) => ({ onClick: () => navigate(`/indicadores/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={false}
        columns={[
          {
            title: 'Indicador',
            dataIndex: 'nombre',
            render: (n: string, r) => (
              <Space direction="vertical" size={0}>
                <Text strong>{n}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {r.codigo} · {ETIQUETA_FRECUENCIA[r.frecuencia]}
                </Text>
              </Space>
            ),
          },
          {
            title: 'Meta',
            dataIndex: 'meta',
            width: 80,
            render: (m: number, r) => `${m}${r.unidad === '%' ? '%' : ` ${r.unidad}`}`,
          },
          {
            title: 'Último',
            key: 'ult',
            width: 150,
            render: (_, r) =>
              r.alerta.ultimoValor == null ? (
                <Text type="secondary">Sin datos</Text>
              ) : (
                <Space>
                  <SemaforoDot estado={semEstado(r.alerta.ultimoSemaforo)} />
                  {r.alerta.ultimoValor}
                  {r.unidad === '%' ? '%' : ` ${r.unidad}`}
                </Space>
              ),
          },
          {
            title: '',
            key: 'a',
            render: (_, r) => (
              <Space size={4} wrap>
                {r.alerta.capturaPendiente && <Tag color="blue">Captura pendiente</Tag>}
                {r.alerta.fueraDeMeta && <Tag color="red">Fuera de meta</Tag>}
              </Space>
            ),
          },
        ]}
      />

      {crear && (
        <IndicadorFormModal
          procesoIdFijo={procesoId}
          onClose={() => setCrear(false)}
          onGuardado={(id) => {
            setCrear(false)
            void refetch()
            navigate(`/indicadores/${id}`)
          }}
        />
      )}
    </>
  )
}
