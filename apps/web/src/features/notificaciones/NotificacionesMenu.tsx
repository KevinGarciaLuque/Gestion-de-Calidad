import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { Badge, Button, Dropdown, Empty, List, Spin, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { notificacionesApi, type NivelNotificacion, type Notificacion } from './notificacionesApi'

const { Text } = Typography

const COLOR_NIVEL: Record<NivelNotificacion, string> = {
  INFO: 'blue',
  AVISO: 'gold',
  URGENTE: 'red',
}

export function NotificacionesMenu() {
  const [abierto, setAbierto] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const contador = useQuery({
    queryKey: ['notificaciones', 'contador'],
    queryFn: notificacionesApi.contador,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  const lista = useQuery({
    queryKey: ['notificaciones', 'lista'],
    queryFn: () => notificacionesApi.listar(),
    enabled: abierto,
  })

  const marcarLeida = useMutation({
    mutationFn: notificacionesApi.marcarLeida,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  })
  const marcarTodas = useMutation({
    mutationFn: notificacionesApi.marcarTodasLeidas,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  })

  const abrir = (n: Notificacion) => {
    if (!n.leidaAt) marcarLeida.mutate(n.id)
    setAbierto(false)
    if (n.ruta) navigate(n.ruta)
  }

  const noLeidas = contador.data?.noLeidas ?? 0

  const contenido = (
    <div
      style={{
        width: 380,
        maxWidth: '90vw',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Text strong>Notificaciones</Text>
        <Button
          type="link"
          size="small"
          disabled={noLeidas === 0}
          loading={marcarTodas.isPending}
          onClick={() => marcarTodas.mutate()}
        >
          Marcar todas como leídas
        </Button>
      </div>

      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {lista.isLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin />
          </div>
        ) : !lista.data?.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin notificaciones" style={{ padding: 24 }} />
        ) : (
          <List
            size="small"
            dataSource={lista.data}
            renderItem={(n) => (
              <List.Item
                onClick={() => abrir(n)}
                style={{
                  cursor: 'pointer',
                  padding: '10px 14px',
                  background: n.leidaAt ? undefined : 'rgba(22,119,255,0.06)',
                  alignItems: 'flex-start',
                }}
                actions={
                  n.leidaAt
                    ? undefined
                    : [
                        <Button
                          key="ok"
                          type="text"
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            marcarLeida.mutate(n.id)
                          }}
                        />,
                      ]
                }
              >
                <List.Item.Meta
                  title={
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Tag color={COLOR_NIVEL[n.nivel]} style={{ marginInlineEnd: 0 }}>
                        {n.nivel}
                      </Tag>
                      <span style={{ fontWeight: n.leidaAt ? 400 : 600 }}>{n.titulo}</span>
                    </span>
                  }
                  description={
                    <>
                      <div style={{ color: 'rgba(0,0,0,0.65)' }}>{n.mensaje}</div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(n.creadoAt).fromNow()}
                      </Text>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0', padding: 8, textAlign: 'center' }}>
        <Button
          type="link"
          size="small"
          onClick={() => {
            setAbierto(false)
            navigate('/notificaciones')
          }}
        >
          Ver todas
        </Button>
      </div>
    </div>
  )

  return (
    <Dropdown
      open={abierto}
      onOpenChange={setAbierto}
      trigger={['click']}
      placement="bottomRight"
      dropdownRender={() => contenido}
    >
      <Badge count={noLeidas} size="small" offset={[-2, 4]}>
        <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Dropdown>
  )
}
