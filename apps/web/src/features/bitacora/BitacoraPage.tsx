import { useState } from 'react'
import { Card, DatePicker, Flex, Input, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { bitacoraApi, type EventoBitacora } from './bitacoraApi'
import { DetalleEvento } from './DetalleEvento'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export function BitacoraPage() {
  const [accion, setAccion] = useState('')
  const [rango, setRango] = useState<[Dayjs, Dayjs] | null>(null)
  const [pagina, setPagina] = useState(1)

  const { data, isFetching } = useQuery({
    queryKey: ['bitacora', { accion, rango, pagina }],
    queryFn: () =>
      bitacoraApi.listar({
        accion: accion || undefined,
        desde: rango?.[0]?.startOf('day').toISOString(),
        hasta: rango?.[1]?.endOf('day').toISOString(),
        pagina,
        porPagina: 20,
      }),
  })

  const columnas: ColumnsType<EventoBitacora> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      width: 160,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Usuario',
      dataIndex: 'actorEmail',
      width: 200,
      render: (v: string | null) => v ?? <Text type="secondary">sistema</Text>,
    },
    {
      title: 'Acción',
      dataIndex: 'accion',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      width: 160,
      render: (v: string | null, r) =>
        v ? (
          <Space direction="vertical" size={0}>
            <Text>{v}</Text>
            {r.entidadId && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {r.entidadId.slice(0, 8)}…
              </Text>
            )}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ]

  return (
    <>
      <Title level={3} style={{ marginTop: 0 }}>
        Bitácora
      </Title>
      <Text type="secondary">Registro inmutable de acciones del sistema</Text>

      <Card size="small" style={{ margin: '16px 0' }}>
        <Flex gap={12} wrap>
          <Input
            allowClear
            placeholder="Filtrar por acción (ej. usuario.crear)"
            style={{ maxWidth: 280 }}
            onChange={(e) => {
              setPagina(1)
              setAccion(e.target.value)
            }}
          />
          <RangePicker
            onChange={(v) => {
              setPagina(1)
              setRango(v as [Dayjs, Dayjs] | null)
            }}
          />
        </Flex>
      </Card>

      <Table<EventoBitacora>
        rowKey="id"
        columns={columnas}
        dataSource={data?.datos}
        loading={isFetching}
        size="small"
        expandable={{
          expandedRowRender: (r) => <DetalleEvento evento={r} />,
          rowExpandable: (r) => !!(r.valorAnterior || r.valorNuevo || r.ip || r.userAgent),
        }}
        pagination={{
          current: pagina,
          pageSize: data?.porPagina ?? 20,
          total: data?.total ?? 0,
          onChange: setPagina,
          showSizeChanger: false,
        }}
        scroll={{ x: 700 }}
      />
    </>
  )
}
