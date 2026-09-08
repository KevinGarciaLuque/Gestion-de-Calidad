import { App, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import { documentosApi, type DocumentoDetalle } from './documentosApi'

export function VersionMetadataModal({
  detalle,
  onClose,
  onGuardado,
}: {
  detalle: DocumentoDetalle
  onClose: () => void
  onGuardado: () => void
}) {
  const { message } = App.useApp()
  const { puede } = useAuth()
  const [form] = Form.useForm()
  const v = detalle.versionTrabajo

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-doc'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: puede('usuarios.ver'),
  })

  const guardar = useMutation({
    mutationFn: (val: Record<string, unknown>) =>
      documentosApi.guardarVersion(detalle.documento.id, {
        motivoCambio: (val.motivoCambio as string) || undefined,
        fechaEmision: val.fechaEmision ? (val.fechaEmision as dayjs.Dayjs).toISOString() : undefined,
        mesesProximaRevision: (val.mesesProximaRevision as number) || undefined,
        revisorId: (val.revisorId as string) ?? null,
        aprobadorId: (val.aprobadorId as string) ?? null,
      }),
    onSuccess: () => {
      message.success('Datos de la versión guardados')
      onGuardado()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const opciones = usuarios?.datos.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })) ?? []

  return (
    <Modal
      open
      title="Datos de la versión"
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          motivoCambio: v?.motivoCambio ?? '',
          fechaEmision: v?.fechaEmision ? dayjs(v.fechaEmision) : undefined,
          mesesProximaRevision: 24,
          revisorId: v?.revisor?.id,
          aprobadorId: v?.aprobador?.id,
        }}
        onFinish={(val) => guardar.mutate(val)}
      >
        <Form.Item name="motivoCambio" label="Motivo del cambio">
          <Input.TextArea rows={2} placeholder="Qué cambia respecto a la versión anterior" />
        </Form.Item>
        <Form.Item name="fechaEmision" label="Fecha de emisión">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="mesesProximaRevision" label="Vigencia / revisar cada (meses)">
          <InputNumber min={1} max={120} style={{ width: '100%' }} />
        </Form.Item>
        {puede('usuarios.ver') && (
          <>
            <Form.Item name="revisorId" label="Revisor">
              <Select allowClear showSearch optionFilterProp="label" options={opciones} />
            </Form.Item>
            <Form.Item name="aprobadorId" label="Aprobador">
              <Select allowClear showSearch optionFilterProp="label" options={opciones} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}
