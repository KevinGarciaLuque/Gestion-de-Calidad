import { App, Form, Input, Modal, Select } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/api'
import { aplanar, organizacionApi } from '@/features/organizacion/organizacionApi'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import { useAuth } from '@/features/auth/useAuth'
import {
  ETIQUETA_TIPO_PROCESO,
  procesosApi,
  type ProcesoDetalle,
  type TipoProceso,
} from './procesosApi'

export function IdentificacionModal({
  detalle,
  onClose,
  onGuardado,
}: {
  detalle: ProcesoDetalle
  onClose: () => void
  onGuardado: () => void
}) {
  const { message } = App.useApp()
  const { puede } = useAuth()
  const [form] = Form.useForm()
  const p = detalle.proceso

  const { data: arbol } = useQuery({
    queryKey: ['organizacion'],
    queryFn: organizacionApi.arbol,
    enabled: puede('organizacion.ver'),
  })
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-proceso'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: puede('usuarios.ver'),
  })

  const guardar = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      procesosApi.editar(p.id, {
        nombre: v.nombre as string,
        tipo: v.tipo as TipoProceso,
        objetivo: v.objetivo as string,
        areaId: (v.areaId as string) ?? null,
        responsableId: (v.responsableId as string) ?? null,
        suplenteId: (v.suplenteId as string) ?? null,
      }),
    onSuccess: () => {
      message.success('Identificación actualizada')
      onGuardado()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const opcionesUsuario =
    usuarios?.datos.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })) ?? []
  const opcionesArea = arbol ? aplanar(arbol) : []

  return (
    <Modal
      open
      title="Identificación del proceso"
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          nombre: p.nombre,
          tipo: p.tipo,
          objetivo: p.objetivo,
          areaId: p.area?.id,
          responsableId: p.responsable?.id,
          suplenteId: p.suplente?.id,
        }}
        onFinish={(v) => guardar.mutate(v)}
      >
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true, min: 3 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select
            options={(['ESTRATEGICO', 'MISIONAL', 'APOYO'] as TipoProceso[]).map((t) => ({
              value: t,
              label: ETIQUETA_TIPO_PROCESO[t],
            }))}
          />
        </Form.Item>
        <Form.Item name="objetivo" label="Objetivo" rules={[{ required: true, min: 3 }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="areaId" label="Área responsable">
          <Select allowClear showSearch optionFilterProp="label" options={opcionesArea} />
        </Form.Item>
        <Form.Item name="responsableId" label="Dueño del proceso (responsable)">
          <Select allowClear showSearch optionFilterProp="label" options={opcionesUsuario} />
        </Form.Item>
        <Form.Item name="suplenteId" label="Suplente">
          <Select allowClear showSearch optionFilterProp="label" options={opcionesUsuario} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
