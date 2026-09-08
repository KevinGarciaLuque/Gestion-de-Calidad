import { App, Form, Input, Modal, Select } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/api'
import { procesosApi } from '@/features/procesos/procesosApi'
import { EscalaSelect } from './EscalaSelect'
import { riesgosApi, type TipoRiesgo } from './riesgosApi'

export function RiesgoFormModal({
  procesoIdFijo,
  onClose,
  onGuardado,
}: {
  procesoIdFijo?: string
  onClose: () => void
  onGuardado: (id: string) => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const { data: matriz } = useQuery({ queryKey: ['matriz-riesgo'], queryFn: riesgosApi.matriz })
  const { data: procesos } = useQuery({
    queryKey: ['procesos-lista'],
    queryFn: () => procesosApi.listar({ pagina: 1 }),
    enabled: !procesoIdFijo,
  })

  const crear = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      riesgosApi.crear({
        codigo: v.codigo as string,
        tipo: v.tipo as TipoRiesgo,
        procesoId: (procesoIdFijo ?? v.procesoId) as string,
        descripcion: v.descripcion as string,
        causa: (v.causa as string) || undefined,
        consecuencia: (v.consecuencia as string) || undefined,
        probabilidadInherente: v.probabilidadInherente as number,
        impactoInherente: v.impactoInherente as number,
      }),
    onSuccess: (det) => {
      message.success('Riesgo registrado')
      onGuardado(det.riesgo.id)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  if (!matriz) return null

  return (
    <Modal
      open
      width={620}
      title="Nuevo riesgo u oportunidad"
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Registrar"
      confirmLoading={crear.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ tipo: 'RIESGO' }}
        onFinish={(v) => crear.mutate(v)}
      >
        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'RIESGO', label: 'Riesgo' },
              { value: 'OPORTUNIDAD', label: 'Oportunidad' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="codigo"
          label="Código"
          rules={[{ required: true, message: 'Ingresa un código' }]}
        >
          <Input placeholder="R-CAL-001" />
        </Form.Item>
        {!procesoIdFijo && (
          <Form.Item name="procesoId" label="Proceso" rules={[{ required: true, message: 'Elige el proceso' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={(procesos?.datos ?? []).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))}
            />
          </Form.Item>
        )}
        <Form.Item name="descripcion" label="Descripción del riesgo u oportunidad" rules={[{ required: true, min: 5 }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="causa" label="Causa">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="consecuencia" label="Consecuencia">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item
          name="probabilidadInherente"
          label="Probabilidad (inherente)"
          rules={[{ required: true, message: 'Selecciona la probabilidad' }]}
        >
          <EscalaSelect escala={matriz.escalaProbabilidad} />
        </Form.Item>
        <Form.Item
          name="impactoInherente"
          label="Impacto (inherente)"
          rules={[{ required: true, message: 'Selecciona el impacto' }]}
        >
          <EscalaSelect escala={matriz.escalaImpacto} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
