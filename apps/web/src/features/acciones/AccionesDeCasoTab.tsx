import { useState } from 'react'
import { Alert, Button, Empty, Progress, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useAuth } from '@/features/auth/useAuth'
import { AccionFormModal, type OrigenFijo } from './AccionFormModal'
import { estadoColor } from './AccionesPage'
import {
  accionesApi,
  ETIQUETA_ESTADO_ACCION,
  ETIQUETA_TIPO_ACCION,
  type AccionFila,
} from './accionesApi'

const { Text } = Typography

export function AccionesDeCasoTab({
  origenFijo,
  filtro,
  resumen,
}: {
  origenFijo: OrigenFijo
  filtro: { hallazgoId?: string; riesgoId?: string; mccId?: string }
  resumen?: { total: number; cerradas: number }
}) {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const [crear, setCrear] = useState(false)

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['acciones', filtro],
    queryFn: () => accionesApi.listar({ ...filtro, pagina: 1 }),
    enabled: puede('acciones.ver'),
  })

  if (!puede('acciones.ver')) return <Text type="secondary">No tienes acceso a las acciones.</Text>

  return (
    <>
      {resumen && resumen.total > 0 && (
        <Alert
          style={{ marginBottom: 12 }}
          type={resumen.cerradas === resumen.total ? 'success' : 'info'}
          message={
            resumen.cerradas === resumen.total
              ? 'Todas las acciones del plan están completas.'
              : `${resumen.cerradas} de ${resumen.total} acciones completas`
          }
        />
      )}
      {puede('acciones.crear') && (
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 12 }} onClick={() => setCrear(true)}>
          Nueva acción
        </Button>
      )}
      <Table<AccionFila>
        rowKey="id"
        size="small"
        loading={isFetching}
        dataSource={data?.datos}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin acciones" /> }}
        onRow={(r) => ({ onClick: () => navigate(`/acciones/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={false}
        columns={[
          {
            title: 'Acción',
            dataIndex: 'descripcion',
            render: (d: string, a) => (
              <Space direction="vertical" size={0}>
                <Text strong>{d}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {a.codigo} · {ETIQUETA_TIPO_ACCION[a.tipo]}
                </Text>
              </Space>
            ),
          },
          { title: 'Avance', dataIndex: 'avance', width: 120, render: (v: number) => <Progress percent={v} size="small" /> },
          {
            title: 'Estado',
            dataIndex: 'estado',
            width: 120,
            render: (e: AccionFila['estado']) => <Tag color={estadoColor(e)}>{ETIQUETA_ESTADO_ACCION[e]}</Tag>,
          },
          { title: 'Responsable', dataIndex: ['responsable', 'nombre'], render: (v: string) => v ?? '—' },
          {
            title: 'Compromiso',
            dataIndex: 'fechaCompromiso',
            width: 120,
            render: (v: string | null, a) =>
              v ? (
                <Space direction="vertical" size={0}>
                  {dayjs(v).format('DD/MM/YYYY')}
                  {a.alerta.vencida && <Tag color="volcano">Vencida</Tag>}
                </Space>
              ) : (
                '—'
              ),
          },
        ]}
      />
      {crear && (
        <AccionFormModal
          origenFijo={origenFijo}
          onClose={() => setCrear(false)}
          onGuardado={() => {
            setCrear(false)
            void refetch()
          }}
        />
      )}
    </>
  )
}
