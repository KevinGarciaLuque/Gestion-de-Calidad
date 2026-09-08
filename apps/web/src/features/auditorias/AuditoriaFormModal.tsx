import { App, DatePicker, Form, Input, Modal, Select } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { aplanar, organizacionApi } from '@/features/organizacion/organizacionApi'
import { procesosApi } from '@/features/procesos/procesosApi'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import { auditoriasApi, type AuditoriaDetalle, type TipoAuditoria } from './auditoriasApi'

export function AuditoriaFormModal({
  auditoria,
  programaId,
  anio,
  onClose,
  onGuardado,
}: {
  auditoria?: AuditoriaDetalle['auditoria']
  programaId?: string
  anio: number
  onClose: () => void
  onGuardado: (id: string) => void
}) {
  const { message } = App.useApp()
  const { puede } = useAuth()
  const [form] = Form.useForm()
  const edicion = !!auditoria

  const { data: procesos } = useQuery({ queryKey: ['procesos-lista'], queryFn: () => procesosApi.listar({ pagina: 1 }) })
  const { data: arbol } = useQuery({ queryKey: ['organizacion'], queryFn: organizacionApi.arbol, enabled: puede('organizacion.ver') })
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-auditoria'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: puede('usuarios.ver'),
  })

  const guardar = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      const payload = {
        tipo: v.tipo as TipoAuditoria,
        procesoId: (v.procesoId as string) || undefined,
        areaId: (v.areaId as string) || undefined,
        objetivo: v.objetivo as string,
        alcance: v.alcance as string,
        criterios: v.criterios as string,
        auditorLiderId: (v.auditorLiderId as string) || undefined,
        equipoIds: (v.equipoIds as string[]) || [],
      }
      return edicion
        ? auditoriasApi.editar(auditoria!.id, payload)
        : auditoriasApi.crear({
            ...payload,
            codigo: v.codigo as string,
            programaId,
            fechaPlanificada: (v.fechaPlanificada as dayjs.Dayjs).toISOString(),
          })
    },
    onSuccess: (det) => {
      message.success(edicion ? 'Auditoría actualizada' : 'Auditoría creada')
      onGuardado(det.auditoria.id)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const opcionesUsuario = usuarios?.datos.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })) ?? []

  return (
    <Modal
      open
      width={620}
      title={edicion ? `Editar ${auditoria!.codigo}` : 'Nueva auditoría'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          auditoria
            ? {
                tipo: auditoria.tipo,
                procesoId: auditoria.proceso?.id,
                areaId: auditoria.area?.id,
                objetivo: auditoria.objetivo,
                alcance: auditoria.alcance,
                criterios: auditoria.criterios,
                auditorLiderId: auditoria.auditorLider?.id,
                equipoIds: auditoria.equipo.map((e) => e.id),
              }
            : { tipo: 'INTERNA', codigo: `AUD-${anio}-`, fechaPlanificada: dayjs().year(anio) }
        }
        onFinish={(v) => guardar.mutate(v)}
      >
        {!edicion && (
          <Form.Item name="codigo" label="Código" rules={[{ required: true, message: 'Ingresa un código' }]}>
            <Input placeholder={`AUD-${anio}-01`} />
          </Form.Item>
        )}
        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'INTERNA', label: 'Interna' },
              { value: 'EXTERNA', label: 'Externa' },
              { value: 'SEGUIMIENTO', label: 'De seguimiento' },
            ]}
          />
        </Form.Item>
        <Form.Item name="procesoId" label="Proceso a auditar">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={(procesos?.datos ?? []).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))}
          />
        </Form.Item>
        {puede('organizacion.ver') && (
          <Form.Item name="areaId" label="Área">
            <Select allowClear showSearch optionFilterProp="label" options={arbol ? aplanar(arbol) : []} />
          </Form.Item>
        )}
        <Form.Item name="objetivo" label="Objetivo" rules={[{ required: true, min: 3 }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="alcance" label="Alcance" rules={[{ required: true, min: 3 }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="criterios" label="Criterios" rules={[{ required: true, min: 3 }]}>
          <Input.TextArea rows={2} placeholder="Normas, cláusulas, procedimientos de referencia" />
        </Form.Item>
        {!edicion && (
          <Form.Item name="fechaPlanificada" label="Fecha planificada" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        )}
        {puede('usuarios.ver') && (
          <>
            <Form.Item name="auditorLiderId" label="Auditor líder">
              <Select allowClear showSearch optionFilterProp="label" options={opcionesUsuario} />
            </Form.Item>
            <Form.Item name="equipoIds" label="Equipo auditor">
              <Select mode="multiple" allowClear showSearch optionFilterProp="label" options={opcionesUsuario} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}
