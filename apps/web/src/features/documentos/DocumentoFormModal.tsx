import { App, Form, Input, Modal, Select, Switch } from 'antd'
import { useMutation, useQuery } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { aplanar, organizacionApi } from '@/features/organizacion/organizacionApi'
import { procesosApi } from '@/features/procesos/procesosApi'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import {
  documentosApi,
  ETIQUETA_TIPO_DOC,
  type DocumentoDetalle,
  type TipoDocumento,
} from './documentosApi'

export function DocumentoFormModal({
  documento,
  procesoIdFijo,
  onClose,
  onGuardado,
}: {
  documento?: DocumentoDetalle['documento']
  procesoIdFijo?: string
  onClose: () => void
  onGuardado: (id: string) => void
}) {
  const { message } = App.useApp()
  const { puede } = useAuth()
  const [form] = Form.useForm()
  const edicion = !!documento

  const { data: procesos } = useQuery({
    queryKey: ['procesos-lista'],
    queryFn: () => procesosApi.listar({ pagina: 1 }),
    enabled: !procesoIdFijo,
  })
  const { data: arbol } = useQuery({
    queryKey: ['organizacion'],
    queryFn: organizacionApi.arbol,
    enabled: puede('organizacion.ver'),
  })
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-doc'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: puede('usuarios.ver'),
  })

  const guardar = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      const payload = {
        nombre: v.nombre as string,
        tipo: v.tipo as TipoDocumento,
        procesoId: (procesoIdFijo ?? (v.procesoId as string)) || null,
        areaId: (v.areaId as string) || null,
        propietarioId: (v.propietarioId as string) || null,
        palabrasClave: (v.palabrasClave as string) || null,
        restringido: !!v.restringido,
      }
      return edicion
        ? documentosApi.editar(documento!.id, payload)
        : documentosApi.crear({
            codigo: v.codigo as string,
            nombre: payload.nombre,
            tipo: payload.tipo,
            procesoId: payload.procesoId ?? undefined,
            areaId: payload.areaId ?? undefined,
            propietarioId: payload.propietarioId ?? undefined,
            palabrasClave: payload.palabrasClave ?? undefined,
          })
    },
    onSuccess: (det) => {
      message.success(edicion ? 'Documento actualizado' : 'Documento creado')
      onGuardado(det.documento.id)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const opcionesUsuario = usuarios?.datos.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })) ?? []

  return (
    <Modal
      open
      width={600}
      title={edicion ? `Editar ${documento!.codigo}` : 'Nuevo documento'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Guardar"
      confirmLoading={guardar.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          documento
            ? {
                nombre: documento.nombre,
                tipo: documento.tipo,
                procesoId: documento.proceso?.id,
                areaId: documento.area?.id,
                propietarioId: documento.propietario?.id,
                palabrasClave: documento.palabrasClave ?? '',
                restringido: documento.restringido,
              }
            : { tipo: 'PROCEDIMIENTO' }
        }
        onFinish={(v) => guardar.mutate(v)}
      >
        {!edicion && (
          <Form.Item
            name="codigo"
            label="Código"
            rules={[
              { required: true, message: 'Ingresa un código' },
              { pattern: /^[A-Za-z0-9][A-Za-z0-9-./]{1,39}$/, message: 'Código no válido' },
            ]}
          >
            <Input placeholder="PR-CAL-01" />
          </Form.Item>
        )}
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true, min: 3 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select
            options={(Object.keys(ETIQUETA_TIPO_DOC) as TipoDocumento[]).map((t) => ({
              value: t,
              label: ETIQUETA_TIPO_DOC[t],
            }))}
          />
        </Form.Item>
        {!procesoIdFijo && (
          <Form.Item name="procesoId" label="Proceso relacionado" tooltip="Déjalo vacío si es un documento institucional">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={(procesos?.datos ?? []).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))}
            />
          </Form.Item>
        )}
        {puede('organizacion.ver') && (
          <Form.Item name="areaId" label="Área">
            <Select allowClear showSearch optionFilterProp="label" options={arbol ? aplanar(arbol) : []} />
          </Form.Item>
        )}
        {puede('usuarios.ver') && (
          <Form.Item name="propietarioId" label="Propietario del documento">
            <Select allowClear showSearch optionFilterProp="label" options={opcionesUsuario} />
          </Form.Item>
        )}
        <Form.Item name="palabrasClave" label="Palabras clave (búsqueda)">
          <Input placeholder="separadas por comas" />
        </Form.Item>
        {edicion && (
          <Form.Item name="restringido" label="Acceso restringido" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}
