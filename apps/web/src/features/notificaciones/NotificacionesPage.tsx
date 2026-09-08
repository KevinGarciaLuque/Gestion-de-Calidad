import { CheckOutlined } from '@ant-design/icons'
import { Button, Empty, Flex, List, Segmented, Spin, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { notificacionesApi, type NivelNotificacion } from './notificacionesApi'

const { Title, Text } = Typography

const COLOR_NIVEL: Record<NivelNotificacion, string> = { INFO: 'blue', AVISO: 'gold', URGENTE: 'red' }

export function NotificacionesPage() {
  const [filtro, setFiltro] = useState<'todas' | 'noLeidas'>('todas')
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notificaciones', 'pagina', filtro],
    queryFn: () => notificacionesApi.listar(filtro === 'noLeidas'),
  })

  const marcarLeida = useMutation({
    mutationFn: notificacionesApi.marcarLeida,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  })
  const marcarTodas = useMutation({
    mutationFn: notificacionesApi.marcarTodasLeidas,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  })

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Mis notificaciones
          </Title>
          <Text type="secondary">Alertas de vencimientos, escalamientos y recordatorios del SGC</Text>
        </div>
        <Button onClick={() => marcarTodas.mutate()} loading={marcarTodas.isPending}>
          Marcar todas como leídas
        </Button>
      </Flex>

      <Segmented
        value={filtro}
        onChange={(v) => setFiltro(v as 'todas' | 'noLeidas')}
        options={[
          { label: 'Todas', value: 'todas' },
          { label: 'No leídas', value: 'noLeidas' },
        ]}
        style={{ marginBottom: 12 }}
      />

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : !data?.length ? (
        <Empty description="Sin notificaciones" style={{ padding: 48 }} />
      ) : (
        <List
          bordered
          dataSource={data}
          renderItem={(n) => (
            <List.Item
              onClick={() => {
                if (!n.leidaAt) marcarLeida.mutate(n.id)
                if (n.ruta) navigate(n.ruta)
              }}
              style={{
                cursor: n.ruta ? 'pointer' : 'default',
                background: n.leidaAt ? undefined : 'rgba(22,119,255,0.05)',
              }}
              actions={[
                <Text key="f" type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(n.creadoAt).format('DD/MM/YYYY HH:mm')}
                </Text>,
                n.leidaAt ? (
                  <Tag key="l" color="default">
                    Leída
                  </Tag>
                ) : (
                  <Button
                    key="m"
                    type="text"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      marcarLeida.mutate(n.id)
                    }}
                  />
                ),
              ]}
            >
              <List.Item.Meta
                title={
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Tag color={COLOR_NIVEL[n.nivel]}>{n.nivel}</Tag>
                    <span style={{ fontWeight: n.leidaAt ? 400 : 600 }}>{n.titulo}</span>
                  </span>
                }
                description={n.mensaje}
              />
            </List.Item>
          )}
        />
      )}
    </>
  )
}
