import { CloudDownloadOutlined, DatabaseOutlined, PlusOutlined } from '@ant-design/icons'
import { App, Alert, Button, Empty, Flex, List, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { mensajeDeError } from '@/lib/api'
import { descargarRespaldo, respaldosApi, tamanoLegible } from './respaldosApi'

dayjs.extend(relativeTime)

const { Title, Text, Paragraph } = Typography

export function RespaldosPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ['respaldos'], queryFn: respaldosApi.listar })

  const crear = useMutation({
    mutationFn: respaldosApi.crear,
    onSuccess: (r) => {
      message.success(`Respaldo generado: ${tamanoLegible(r.tamanoBytes)}`)
      void qc.invalidateQueries({ queryKey: ['respaldos'] })
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const descargar = useMutation({
    mutationFn: descargarRespaldo,
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const ultimo = data?.[0]
  const horasDesdeUltimo = ultimo ? dayjs().diff(dayjs(ultimo.creadoAt), 'hour') : null

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Respaldos de la base de datos
          </Title>
          <Text type="secondary">
            Copia completa de todas las tablas, comprimida. Se genera sola todos los días a las 3:00 a. m.
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={crear.isPending}
          onClick={() => crear.mutate()}
        >
          Generar respaldo ahora
        </Button>
      </Flex>

      {horasDesdeUltimo !== null && horasDesdeUltimo > 30 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="El último respaldo tiene más de un día"
          description="Revisa que el motor de automatizaciones esté activo, o genera uno manualmente."
        />
      )}

      <Paragraph type="secondary" style={{ fontSize: 12.5 }}>
        Se conservan los últimos 14 respaldos diarios; los más antiguos se eliminan solos. Esto{' '}
        <b>no reemplaza</b> un respaldo a nivel de infraestructura (por ejemplo, de Railway) — es una
        segunda capa de seguridad, útil para recuperar datos ante un error humano o de la aplicación.
      </Paragraph>

      <List
        loading={isLoading}
        bordered
        dataSource={data}
        locale={{ emptyText: <Empty description="Todavía no hay respaldos" /> }}
        renderItem={(r, i) => (
          <List.Item
            actions={[
              <Button
                key="d"
                size="small"
                icon={<CloudDownloadOutlined />}
                loading={descargar.isPending && descargar.variables === r.nombre}
                onClick={() => descargar.mutate(r.nombre)}
              >
                Descargar
              </Button>,
            ]}
          >
            <List.Item.Meta
              avatar={<DatabaseOutlined style={{ fontSize: 20, color: '#00629b' }} />}
              title={
                <Flex align="center" gap={8}>
                  <span>{dayjs(r.creadoAt).format('DD/MM/YYYY HH:mm')}</span>
                  {i === 0 && <Tag color="green">Más reciente</Tag>}
                </Flex>
              }
              description={`${tamanoLegible(r.tamanoBytes)} · ${dayjs(r.creadoAt).fromNow()}`}
            />
          </List.Item>
        )}
      />
    </>
  )
}
