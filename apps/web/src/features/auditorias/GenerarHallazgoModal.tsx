import { App, DatePicker, Form, Input, Modal, Select } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import { ETIQUETA_CLASIFICACION } from '@/features/hallazgos/hallazgosApi'
import { auditoriasApi, type ItemChecklist } from './auditoriasApi'

export function GenerarHallazgoModal({
  auditoriaId,
  item,
  onClose,
  onGuardado,
}: {
  auditoriaId: string
  item: ItemChecklist
  onClose: () => void
  onGuardado: () => void
}) {
  const { message } = App.useApp()
  const { puede } = useAuth()
  const [form] = Form.useForm()

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-hallazgo'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: puede('usuarios.ver'),
  })

  const generar = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      auditoriasApi.generarHallazgo(auditoriaId, item.id, {
        clasificacion: v.clasificacion as string,
        descripcion: (v.descripcion as string) || undefined,
        requisito: (v.requisito as string) || undefined,
        responsableId: (v.responsableId as string) || undefined,
        fechaCompromiso: v.fechaCompromiso ? (v.fechaCompromiso as dayjs.Dayjs).toISOString() : undefined,
        prioridad: (v.prioridad as string) || undefined,
      }),
    onSuccess: () => {
      message.success('Hallazgo generado')
      onGuardado()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <Modal
      open
      title="Generar hallazgo desde el checklist"
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Generar"
      confirmLoading={generar.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          clasificacion: item.resultado === 'NO_CUMPLE' ? 'NO_CONFORMIDAD_MENOR' : 'OBSERVACION',
          descripcion: item.notas ?? item.criterio,
          requisito: item.criterio.slice(0, 180),
          prioridad: 'MEDIA',
        }}
        onFinish={(v) => generar.mutate(v)}
      >
        <Form.Item name="clasificacion" label="Clasificación" rules={[{ required: true }]}>
          <Select
            options={(Object.keys(ETIQUETA_CLASIFICACION) as (keyof typeof ETIQUETA_CLASIFICACION)[]).map((c) => ({
              value: c,
              label: ETIQUETA_CLASIFICACION[c],
            }))}
          />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción del hallazgo" rules={[{ required: true, min: 5 }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="requisito" label="Requisito relacionado">
          <Input />
        </Form.Item>
        <Form.Item name="prioridad" label="Prioridad">
          <Select
            options={[
              { value: 'BAJA', label: 'Baja' },
              { value: 'MEDIA', label: 'Media' },
              { value: 'ALTA', label: 'Alta' },
            ]}
          />
        </Form.Item>
        {puede('usuarios.ver') && (
          <Form.Item name="responsableId" label="Responsable de respuesta">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={usuarios?.datos.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })) ?? []}
            />
          </Form.Item>
        )}
        <Form.Item name="fechaCompromiso" label="Fecha compromiso">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
