import { App, DatePicker, Divider, Form, Input, Modal, Select } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import { EscalaSelect } from './EscalaSelect'
import {
  ETIQUETA_EFICACIA,
  ETIQUETA_ESTADO,
  riesgosApi,
  type EficaciaControl,
  type EstadoRiesgo,
  type RiesgoDetalle,
} from './riesgosApi'

const ESTADOS_EDITABLES: EstadoRiesgo[] = ['IDENTIFICADO', 'EN_TRATAMIENTO', 'MONITOREADO']

export function EditarRiesgoModal({
  detalle,
  onClose,
  onGuardado,
}: {
  detalle: RiesgoDetalle
  onClose: () => void
  onGuardado: () => void
}) {
  const { message } = App.useApp()
  const { puede } = useAuth()
  const [form] = Form.useForm()
  const r = detalle.riesgo

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-riesgo'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: puede('usuarios.ver'),
  })

  const guardar = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      riesgosApi.editar(r.id, {
        descripcion: v.descripcion,
        causa: (v.causa as string) ?? null,
        consecuencia: (v.consecuencia as string) ?? null,
        probabilidadInherente: v.probabilidadInherente,
        impactoInherente: v.impactoInherente,
        controles: (v.controles as string) ?? null,
        eficaciaControl: v.eficaciaControl,
        planTratamiento: (v.planTratamiento as string) ?? null,
        responsableId: (v.responsableId as string) ?? null,
        fechaCompromiso: v.fechaCompromiso ? (v.fechaCompromiso as dayjs.Dayjs).toISOString() : null,
        estado: v.estado,
      }),
    onSuccess: () => {
      message.success('Riesgo actualizado')
      onGuardado()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <Modal
      open
      width={640}
      title={`Editar ${r.codigo}`}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          descripcion: r.descripcion,
          causa: r.causa ?? '',
          consecuencia: r.consecuencia ?? '',
          probabilidadInherente: r.probabilidadInherente,
          impactoInherente: r.impactoInherente,
          controles: r.controles ?? '',
          eficaciaControl: r.eficaciaControl,
          planTratamiento: r.planTratamiento ?? '',
          responsableId: r.responsable?.id,
          fechaCompromiso: r.fechaCompromiso ? dayjs(r.fechaCompromiso) : undefined,
          estado: r.estado,
        }}
        onFinish={(v) => guardar.mutate(v)}
      >
        <Form.Item name="descripcion" label="Descripción" rules={[{ required: true, min: 5 }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="causa" label="Causa">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="consecuencia" label="Consecuencia">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Divider orientation="left" style={{ margin: '4px 0 12px' }}>
          Evaluación inherente
        </Divider>
        <Form.Item name="probabilidadInherente" label="Probabilidad" rules={[{ required: true }]}>
          <EscalaSelect escala={detalle.matriz.escalaProbabilidad} />
        </Form.Item>
        <Form.Item name="impactoInherente" label="Impacto" rules={[{ required: true }]}>
          <EscalaSelect escala={detalle.matriz.escalaImpacto} />
        </Form.Item>

        <Divider orientation="left" style={{ margin: '4px 0 12px' }}>
          Controles y tratamiento
        </Divider>
        <Form.Item name="controles" label="Controles existentes">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="eficaciaControl" label="Eficacia del control">
          <Select
            options={(Object.keys(ETIQUETA_EFICACIA) as EficaciaControl[]).map((e) => ({
              value: e,
              label: ETIQUETA_EFICACIA[e],
            }))}
          />
        </Form.Item>
        <Form.Item name="planTratamiento" label="Plan de tratamiento">
          <Input.TextArea rows={2} />
        </Form.Item>
        {puede('usuarios.ver') && (
          <Form.Item name="responsableId" label="Responsable">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={usuarios?.datos.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })) ?? []}
            />
          </Form.Item>
        )}
        <Form.Item name="fechaCompromiso" label="Fecha compromiso del plan">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="estado" label="Estado">
          <Select
            options={ESTADOS_EDITABLES.map((e) => ({ value: e, label: ETIQUETA_ESTADO[e] }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
