import { PlayCircleOutlined, SettingOutlined } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  Descriptions,
  Flex,
  Form,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { automatizacionesApi, type ReglaAutomatizacion } from './automatizacionesApi'

const { Title, Text, Paragraph } = Typography

const DESTINO_LABEL: Record<string, string> = {
  responsable: 'Responsable',
  jefatura: 'Jefatura del proceso',
  calidad: 'Gestión de Calidad',
}

interface EscalaPaso {
  dias: number
  a: 'responsable' | 'jefatura' | 'calidad'
}

export function AutomatizacionesConfigPage() {
  const { message, modal } = App.useApp()
  const qc = useQueryClient()
  const [editando, setEditando] = useState<ReglaAutomatizacion | null>(null)

  const reglas = useQuery({ queryKey: ['automatizaciones', 'reglas'], queryFn: automatizacionesApi.reglas })
  const estado = useQuery({ queryKey: ['automatizaciones', 'estado'], queryFn: automatizacionesApi.estado })

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ['automatizaciones'] })
    void qc.invalidateQueries({ queryKey: ['notificaciones'] })
  }

  const configurar = useMutation({
    mutationFn: (v: { codigo: string; activa?: boolean; config?: Record<string, unknown> }) =>
      automatizacionesApi.configurar(v.codigo, { activa: v.activa, config: v.config }),
    onSuccess: () => {
      message.success('Regla actualizada')
      setEditando(null)
      invalidar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const ejecutar = useMutation({
    mutationFn: automatizacionesApi.ejecutar,
    onSuccess: (r) => {
      message.success(`Motor ejecutado: ${r.notificaciones} notificación(es) generada(s).`)
      invalidar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <>
      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Motor de automatizaciones
          </Title>
          <Text type="secondary">
            Reglas que se evalúan cada día a las 07:00 para generar alertas y escalamientos
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={ejecutar.isPending}
          onClick={() =>
            modal.confirm({
              title: 'Ejecutar el motor ahora',
              content: 'Se evaluarán todas las reglas activas y se generarán las notificaciones pendientes.',
              okText: 'Ejecutar',
              onOk: () => ejecutar.mutateAsync(),
            })
          }
        >
          Ejecutar ahora
        </Button>
      </Flex>

      <Card size="small" style={{ marginBottom: 16 }} title="Última ejecución">
        {estado.data ? (
          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
            <Descriptions.Item label="Fecha">
              {dayjs(estado.data.inicio).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Tipo">{estado.data.manual ? 'Manual' : 'Programada'}</Descriptions.Item>
            <Descriptions.Item label="Notificaciones">{estado.data.notificaciones}</Descriptions.Item>
            <Descriptions.Item label="Duración">
              {estado.data.fin
                ? `${dayjs(estado.data.fin).diff(dayjs(estado.data.inicio))} ms`
                : 'En curso'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">El motor todavía no se ha ejecutado.</Text>
        )}
      </Card>

      <List
        loading={reglas.isLoading}
        dataSource={reglas.data}
        rowKey="codigo"
        renderItem={(r) => (
          <List.Item
            actions={[
              <Button
                key="cfg"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => setEditando(r)}
              >
                Configurar
              </Button>,
              <Switch
                key="on"
                checked={r.activa}
                loading={configurar.isPending && configurar.variables?.codigo === r.codigo}
                onChange={(activa) => configurar.mutate({ codigo: r.codigo, activa })}
              />,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  {r.nombre}
                  {!r.activa && <Tag>Inactiva</Tag>}
                </Space>
              }
              description={
                <>
                  <div>{r.descripcion}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {resumenConfig(r.config)}
                  </Text>
                </>
              }
            />
          </List.Item>
        )}
      />

      <ModalConfig
        regla={editando}
        onClose={() => setEditando(null)}
        onGuardar={(config) => editando && configurar.mutate({ codigo: editando.codigo, config })}
        guardando={configurar.isPending}
      />
    </>
  )
}

function resumenConfig(config: Record<string, unknown>): string {
  const partes: string[] = []
  if (Array.isArray(config.diasAviso)) partes.push(`Avisos: ${(config.diasAviso as number[]).join(', ')} días antes`)
  if (typeof config.diasEspera === 'number') partes.push(`Espera: ${config.diasEspera} días`)
  if (Array.isArray(config.escalamiento)) {
    const e = config.escalamiento as EscalaPaso[]
    partes.push('Escalamiento: ' + e.map((p) => `día ${p.dias} → ${DESTINO_LABEL[p.a] ?? p.a}`).join(', '))
  }
  if (config.enviarCorreo) partes.push('Envía correo')
  return partes.join(' · ')
}

function ModalConfig({
  regla,
  onClose,
  onGuardar,
  guardando,
}: {
  regla: ReglaAutomatizacion | null
  onClose: () => void
  onGuardar: (config: Record<string, unknown>) => void
  guardando: boolean
}) {
  const [form] = Form.useForm()
  const config = regla?.config ?? {}
  const tieneDiasAviso = Array.isArray(config.diasAviso)
  const tieneDiasEspera = typeof config.diasEspera === 'number'
  const tieneEscalamiento = Array.isArray(config.escalamiento)
  const tieneCorreo = 'enviarCorreo' in config

  useEffect(() => {
    if (!regla) return
    form.setFieldsValue({
      diasAviso: (regla.config.diasAviso as number[] | undefined)?.map(String),
      diasEspera: regla.config.diasEspera,
      escalamiento: regla.config.escalamiento ?? [],
      enviarCorreo: !!regla.config.enviarCorreo,
    })
  }, [regla, form])

  return (
    <Modal
      open={!!regla}
      title={regla?.nombre}
      onCancel={onClose}
      okText="Guardar"
      confirmLoading={guardando}
      destroyOnClose
      onOk={() => {
        form.validateFields().then((v) => {
          const nuevo: Record<string, unknown> = { ...config }
          if (tieneDiasAviso) nuevo.diasAviso = (v.diasAviso ?? []).map(Number).sort((a: number, b: number) => b - a)
          if (tieneDiasEspera) nuevo.diasEspera = v.diasEspera
          if (tieneEscalamiento) nuevo.escalamiento = v.escalamiento
          if (tieneCorreo) nuevo.enviarCorreo = v.enviarCorreo
          onGuardar(nuevo)
        })
      }}
    >
      {regla && (
        <Form key={regla.codigo} form={form} layout="vertical">
          <Paragraph type="secondary">{regla.descripcion}</Paragraph>

          {tieneDiasAviso && (
            <Form.Item
              name="diasAviso"
              label="Días de antelación para avisar"
              tooltip="Se enviará un recordatorio cuando falten esos días"
              rules={[{ required: true, message: 'Indica al menos un valor' }]}
            >
              <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="Ej. 30, 15, 7" />
            </Form.Item>
          )}

          {tieneDiasEspera && (
            <Form.Item name="diasEspera" label="Días de espera antes de avisar" rules={[{ required: true }]}>
              <InputNumber min={1} max={60} />
            </Form.Item>
          )}

          {tieneEscalamiento && (
            <Form.Item label="Escalamiento (según días de retraso)">
              <Form.List name="escalamiento">
                {(campos, { add, remove }) => (
                  <>
                    {campos.map(({ key, name }) => (
                      <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                        <Form.Item name={[name, 'dias']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                          <InputNumber min={0} addonBefore="Día" style={{ width: 110 }} />
                        </Form.Item>
                        <Form.Item name={[name, 'a']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                          <Select
                            style={{ width: 190 }}
                            options={Object.entries(DESTINO_LABEL).map(([value, label]) => ({ value, label }))}
                          />
                        </Form.Item>
                        <Button type="text" danger onClick={() => remove(name)}>
                          Quitar
                        </Button>
                      </Space>
                    ))}
                    <Button type="dashed" block onClick={() => add({ dias: 1, a: 'responsable' })}>
                      Agregar paso
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          )}

          {tieneCorreo && (
            <Form.Item name="enviarCorreo" label="Enviar también por correo electrónico" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      )}
    </Modal>
  )
}
