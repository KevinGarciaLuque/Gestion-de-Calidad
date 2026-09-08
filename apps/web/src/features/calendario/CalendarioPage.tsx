import { Badge, Calendar, Card, Empty, Flex, List, Segmented, Tag, Typography } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  calendarioApi,
  COLOR_TIPO_EVENTO,
  ETIQUETA_TIPO_EVENTO,
  type EventoCalendario,
  type TipoEvento,
} from './calendarioApi'

const { Title, Text } = Typography

const NIVEL_BADGE: Record<EventoCalendario['nivel'], 'success' | 'warning' | 'error'> = {
  INFO: 'success',
  AVISO: 'warning',
  URGENTE: 'error',
}

export function CalendarioPage() {
  const navigate = useNavigate()
  const [mes, setMes] = useState<Dayjs>(dayjs())
  const [vista, setVista] = useState<'mes' | 'lista'>('mes')

  const desde = vista === 'lista' ? dayjs().subtract(1, 'month') : mes.startOf('month').subtract(7, 'day')
  const hasta = vista === 'lista' ? dayjs().add(12, 'month') : mes.endOf('month').add(7, 'day')

  const { data } = useQuery({
    queryKey: ['calendario', vista, desde.format('YYYY-MM-DD'), hasta.format('YYYY-MM-DD')],
    queryFn: () => calendarioApi.eventos(desde.toISOString(), hasta.toISOString()),
  })

  const porDia = useMemo(() => {
    const m = new Map<string, EventoCalendario[]>()
    for (const e of data ?? []) {
      const k = dayjs(e.fecha).format('YYYY-MM-DD')
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return m
  }, [data])

  const proximos = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [data],
  )

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Calendario del SGC
          </Title>
          <Text type="secondary">
            Auditorías, revisiones documentales y de riesgos, compromisos y capturas de indicadores
          </Text>
        </div>
        <Segmented
          value={vista}
          onChange={(v) => setVista(v as 'mes' | 'lista')}
          options={[
            { label: 'Mes', value: 'mes' },
            { label: 'Lista', value: 'lista' },
          ]}
        />
      </Flex>

      <Flex gap={8} wrap style={{ marginBottom: 16 }}>
        {(Object.keys(ETIQUETA_TIPO_EVENTO) as TipoEvento[]).map((t) => (
          <Tag key={t} color={COLOR_TIPO_EVENTO[t]}>
            {ETIQUETA_TIPO_EVENTO[t]}
          </Tag>
        ))}
      </Flex>

      {vista === 'mes' ? (
        <Card styles={{ body: { padding: 8 } }}>
          <Calendar
            value={mes}
            onPanelChange={(v) => setMes(v)}
            onSelect={(v, info) => {
              if (info.source === 'date') setMes(v)
            }}
            cellRender={(current, info) => {
              if (info.type !== 'date') return info.originNode
              const eventos = porDia.get(current.format('YYYY-MM-DD')) ?? []
              if (!eventos.length) return null
              return (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {eventos.slice(0, 4).map((e, i) => (
                    <li
                      key={i}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        navigate(e.ruta)
                      }}
                      style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      <Badge status={NIVEL_BADGE[e.nivel]} text={<span style={{ fontSize: 11 }}>{e.titulo}</span>} />
                    </li>
                  ))}
                  {eventos.length > 4 && (
                    <li style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>+{eventos.length - 4} más</li>
                  )}
                </ul>
              )
            }}
          />
        </Card>
      ) : !proximos.length ? (
        <Empty description="No hay eventos en el periodo" style={{ padding: 48 }} />
      ) : (
        <List
          bordered
          dataSource={proximos}
          renderItem={(e) => (
            <List.Item
              onClick={() => navigate(e.ruta)}
              style={{ cursor: 'pointer' }}
              actions={[
                e.vencido ? (
                  <Tag key="v" color="red">
                    Vencido
                  </Tag>
                ) : (
                  <Text key="d" type="secondary">
                    {dayjs(e.fecha).fromNow()}
                  </Text>
                ),
              ]}
            >
              <List.Item.Meta
                title={
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Tag color={COLOR_TIPO_EVENTO[e.tipo]}>{ETIQUETA_TIPO_EVENTO[e.tipo]}</Tag>
                    <span>{e.titulo}</span>
                  </span>
                }
                description={dayjs(e.fecha).format('dddd, D [de] MMMM [de] YYYY')}
              />
            </List.Item>
          )}
        />
      )}
    </>
  )
}
