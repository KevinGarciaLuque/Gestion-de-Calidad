import { Button, Empty, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useAuth } from '@/features/auth/useAuth'
import { DocumentoFormModal } from './DocumentoFormModal'
import { documentosApi, ETIQUETA_TIPO_DOC, type DocumentoFila } from './documentosApi'

const { Text } = Typography

export function ProcesoDocumentosTab({ procesoId }: { procesoId: string }) {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const [crear, setCrear] = useState(false)

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['documentos', { procesoId }],
    queryFn: () => documentosApi.listar({ procesoId, pagina: 1 }),
    enabled: puede('documentos.ver'),
  })

  if (!puede('documentos.ver')) return <Text type="secondary">No tienes acceso al control documental.</Text>

  return (
    <>
      {puede('documentos.crear') && (
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 12 }} onClick={() => setCrear(true)}>
          Nuevo documento
        </Button>
      )}
      <Table<DocumentoFila>
        rowKey="id"
        size="small"
        loading={isFetching}
        dataSource={data?.datos}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin documentos" /> }}
        onRow={(r) => ({ onClick: () => navigate(`/documentos/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={false}
        columns={[
          {
            title: 'Documento',
            dataIndex: 'nombre',
            render: (n: string, d) => (
              <Space direction="vertical" size={0}>
                <Text strong>{n}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {d.codigo} · {ETIQUETA_TIPO_DOC[d.tipo]}
                </Text>
              </Space>
            ),
          },
          {
            title: 'Vigente',
            key: 'v',
            width: 90,
            render: (_, d) => (d.versionVigente ? <Tag color="green">v{d.versionVigente}</Tag> : <Text type="secondary">—</Text>),
          },
          {
            title: 'Próxima revisión',
            dataIndex: 'proximaRevisionAt',
            width: 130,
            render: (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
          },
          {
            title: '',
            key: 'a',
            render: (_, d) => (
              <Space size={4} wrap>
                {d.estadoTrabajo === 'EN_REVISION' && <Tag color="gold">En revisión</Tag>}
                {d.alerta.revisionVencida && <Tag color="volcano">Revisión vencida</Tag>}
              </Space>
            ),
          },
        ]}
      />
      {crear && (
        <DocumentoFormModal
          procesoIdFijo={procesoId}
          onClose={() => setCrear(false)}
          onGuardado={(id) => {
            setCrear(false)
            void refetch()
            navigate(`/documentos/${id}`)
          }}
        />
      )}
    </>
  )
}
