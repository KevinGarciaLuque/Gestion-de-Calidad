import { App, DatePicker, Form, Input, Modal, Select } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { procesosApi } from '@/features/procesos/procesosApi'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import {
  ETIQUETA_CLASIFICACION,
  ETIQUETA_ORIGEN,
  hallazgosApi,
  type ClasificacionHallazgo,
  type HallazgoDetalle,
  type OrigenHallazgo,
} from './hallazgosApi'

export function HallazgoFormModal({
  hallazgo,
  onClose,
  onGuardado,
}: {
  hallazgo?: HallazgoDetalle['hallazgo']
  onClose: () => void
  onGuardado: (id: string) => void
}) {
  const { message } = App.useApp()
  const { puede } = useAuth()
  const [form] = Form.useForm()
  const edicion = !!hallazgo

  const { data: procesos } = useQuery({ queryKey: ['procesos-lista'], queryFn: () => procesosApi.listar({ pagina: 1 }), enabled: !edicion })
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-hallazgo'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: puede('usuarios.ver'),
  })

  const guardar = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      const base = {
        descripcion: v.descripcion as string,
        clasificacion: v.clasificacion as ClasificacionHallazgo,
        requisito: (v.requisito as string) || undefined,
        prioridad: v.prioridad as 'BAJA' | 'MEDIA' | 'ALTA',
        responsableId: (v.responsableId as string) || undefined,
        fechaCompromiso: v.fechaCompromiso ? (v.fechaCompromiso as dayjs.Dayjs).toISOString() : undefined,
      }
      return edicion
        ? hallazgosApi.editar(hallazgo!.id, base)
        : hallazgosApi.crear({
            ...base,
            origen: v.origen as OrigenHallazgo,
            procesoId: (v.procesoId as string) || undefined,
            evidencia: (v.evidencia as string) || undefined,
          })
    },
    onSuccess: (det) => {
      message.success(edicion ? 'Hallazgo actualizado' : 'Hallazgo registrado')
      onGuardado(det.hallazgo.id)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const opcionesUsuario = usuarios?.datos.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })) ?? []

  return (
    <Modal
      open
      width={600}
      title={edicion ? `Editar ${hallazgo!.codigo}` : 'Nuevo hallazgo'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          hallazgo
            ? {
                descripcion: hallazgo.descripcion,
                clasificacion: hallazgo.clasificacion,
                requisito: hallazgo.requisito ?? '',
                prioridad: hallazgo.prioridad,
                responsableId: hallazgo.responsable?.id,
                fechaCompromiso: hallazgo.fechaCompromiso ? dayjs(hallazgo.fechaCompromiso) : undefined,
                correccionInmediata: hallazgo.correccionInmediata ?? '',
              }
            : { origen: 'OTRO', clasificacion: 'OBSERVACION', prioridad: 'MEDIA' }
        }
        onFinish={(v) => guardar.mutate(v)}
      >
        {!edicion && (
          <Form.Item name="origen" label="Origen" rules={[{ required: true }]}>
            <Select
              options={(Object.keys(ETIQUETA_ORIGEN) as OrigenHallazgo[]).map((o) => ({ value: o, label: ETIQUETA_ORIGEN[o] }))}
            />
          </Form.Item>
        )}
        {!edicion && (
          <Form.Item name="procesoId" label="Proceso">
            <Select allowClear showSearch optionFilterProp="label"
              options={(procesos?.datos ?? []).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))} />
          </Form.Item>
        )}
        <Form.Item name="descripcion" label="Descripción" rules={[{ required: true, min: 5 }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="clasificacion" label="Clasificación" rules={[{ required: true }]}>
          <Select
            options={(Object.keys(ETIQUETA_CLASIFICACION) as ClasificacionHallazgo[]).map((c) => ({ value: c, label: ETIQUETA_CLASIFICACION[c] }))}
          />
        </Form.Item>
        <Form.Item name="requisito" label="Requisito relacionado">
          <Input />
        </Form.Item>
        {!edicion && (
          <Form.Item name="evidencia" label="Evidencia objetiva">
            <Input.TextArea rows={2} />
          </Form.Item>
        )}
        <Form.Item name="prioridad" label="Prioridad">
          <Select options={[{ value: 'BAJA', label: 'Baja' }, { value: 'MEDIA', label: 'Media' }, { value: 'ALTA', label: 'Alta' }]} />
        </Form.Item>
        {puede('usuarios.ver') && (
          <Form.Item name="responsableId" label="Responsable de respuesta">
            <Select allowClear showSearch optionFilterProp="label" options={opcionesUsuario} />
          </Form.Item>
        )}
        <Form.Item name="fechaCompromiso" label="Fecha compromiso">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        {edicion && (
          <Form.Item name="correccionInmediata" label="Corrección inmediata">
            <Input.TextArea rows={2} placeholder="Contención aplicada de inmediato" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}
