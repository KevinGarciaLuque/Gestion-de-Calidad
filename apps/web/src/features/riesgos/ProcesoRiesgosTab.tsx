import { Button, Empty, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { CategoriaTag } from './categoria'
import { RiesgoFormModal } from './RiesgoFormModal'
import { ETIQUETA_ESTADO, riesgosApi, type RiesgoFila } from './riesgosApi'

const { Text } = Typography

export function ProcesoRiesgosTab({ procesoId }: { procesoId: string }) {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const [crear, setCrear] = useState(false)

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['riesgos', { procesoId }],
    queryFn: () => riesgosApi.listar({ procesoId, pagina: 1 }),
    enabled: puede('riesgos.ver'),
  })

  if (!puede('riesgos.ver')) return <Text type="secondary">No tienes acceso a los riesgos.</Text>

  return (
    <>
      {puede('riesgos.crear') && (
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 12 }} onClick={() => setCrear(true)}>
          Nuevo riesgo
        </Button>
      )}
      <Table<RiesgoFila>
        rowKey="id"
        size="small"
        scroll={{ x: 'max-content' }}
        loading={isFetching}
        dataSource={data?.datos}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin riesgos" /> }}
        onRow={(r) => ({ onClick: () => navigate(`/riesgos/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={false}
        columns={[
          {
            title: 'Riesgo / oportunidad',
            dataIndex: 'descripcion',
            render: (d: string, r) => (
              <Space direction="vertical" size={0}>
                <Text strong>{d}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {r.codigo} · {r.tipo === 'OPORTUNIDAD' ? 'Oportunidad' : 'Riesgo'}
                </Text>
              </Space>
            ),
          },
          {
            title: 'Nivel',
            key: 'n',
            width: 130,
            render: (_, r) => (
              <CategoriaTag
                categoria={r.categoriaEfectiva}
                tipo={r.tipo}
                sufijo={`(${r.nivelResidual ?? r.nivelInherente})`}
              />
            ),
          },
          {
            title: 'Estado',
            dataIndex: 'estado',
            width: 130,
            render: (e: RiesgoFila['estado']) => <Tag>{ETIQUETA_ESTADO[e]}</Tag>,
          },
          {
            title: '',
            key: 'a',
            render: (_, r) => (
              <Space size={4} wrap>
                {r.alerta.faltaTratamiento && <Tag color="red">Falta tratamiento</Tag>}
                {r.alerta.revisionVencida && <Tag color="volcano">Revisión vencida</Tag>}
              </Space>
            ),
          },
        ]}
      />
      {crear && (
        <RiesgoFormModal
          procesoIdFijo={procesoId}
          onClose={() => setCrear(false)}
          onGuardado={(id) => {
            setCrear(false)
            void refetch()
            navigate(`/riesgos/${id}`)
          }}
        />
      )}
    </>
  )
}
