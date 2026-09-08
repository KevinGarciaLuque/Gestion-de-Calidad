import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Tree,
  Typography,
} from 'antd'
import type { DataNode } from 'antd/es/tree'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { ETIQUETA_TIPO_UNIDAD, type TipoUnidad } from '@/lib/tipos'
import { usuariosApi } from '@/features/usuarios/usuariosApi'
import { aplanar, organizacionApi, type NodoUnidad } from './organizacionApi'

const { Title, Text } = Typography

const TIPOS: TipoUnidad[] = [
  'HOSPITAL',
  'DIRECCION',
  'SUBDIRECCION',
  'DEPARTAMENTO',
  'SERVICIO',
  'AREA',
]

interface FormUnidad {
  codigo: string
  nombre: string
  tipo: TipoUnidad
  padreId?: string
  responsableId?: string
  orden?: number
}

function aNodos(unidades: NodoUnidad[]): DataNode[] {
  return unidades.map((u) => ({
    key: u.id,
    title: (
      <Space>
        <span style={{ opacity: u.activo ? 1 : 0.45 }}>{u.nombre}</span>
        <Tag>{ETIQUETA_TIPO_UNIDAD[u.tipo]}</Tag>
        {!u.activo && <Tag color="red">inactiva</Tag>}
        {u.responsable && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {u.responsable.nombre}
          </Text>
        )}
      </Space>
    ),
    children: u.hijos.length ? aNodos(u.hijos) : undefined,
  }))
}

function buscar(unidades: NodoUnidad[], id: string): NodoUnidad | null {
  for (const u of unidades) {
    if (u.id === id) return u
    const enHijo = buscar(u.hijos, id)
    if (enHijo) return enHijo
  }
  return null
}

export function OrganizacionPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { puede } = useAuth()
  const [form] = Form.useForm<FormUnidad>()
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [modo, setModo] = useState<'crear' | 'editar'>('crear')

  const { data: arbol, isFetching } = useQuery({
    queryKey: ['organizacion'],
    queryFn: organizacionApi.arbol,
  })
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios', 'para-responsable'],
    queryFn: () => usuariosApi.listar({ activo: true, porPagina: 100 }),
    enabled: puede('usuarios.ver'),
  })

  const seleccionada = useMemo(
    () => (seleccion && arbol ? buscar(arbol, seleccion) : null),
    [seleccion, arbol],
  )

  const invalidar = () => qc.invalidateQueries({ queryKey: ['organizacion'] })

  const guardar = useMutation({
    mutationFn: (v: FormUnidad) =>
      modo === 'crear'
        ? organizacionApi.crear(v)
        : organizacionApi.editar(seleccion!, {
            nombre: v.nombre,
            tipo: v.tipo,
            padreId: v.padreId,
            responsableId: v.responsableId,
            orden: v.orden,
          }),
    onSuccess: () => {
      message.success(modo === 'crear' ? 'Unidad creada' : 'Cambios guardados')
      form.resetFields()
      setModo('crear')
      setSeleccion(null)
      invalidar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const cambiarEstado = useMutation({
    mutationFn: (u: NodoUnidad) =>
      u.activo ? organizacionApi.desactivar(u.id) : organizacionApi.activar(u.id),
    onSuccess: () => {
      message.success('Estado actualizado')
      invalidar()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const opcionesPadre = arbol ? aplanar(arbol) : []
  const opcionesResponsable =
    usuarios?.datos.map((u) => ({ value: u.id, label: `${u.nombre} (${u.email})` })) ?? []

  const editar = (u: NodoUnidad) => {
    setModo('editar')
    setSeleccion(u.id)
    form.setFieldsValue({
      codigo: u.codigo,
      nombre: u.nombre,
      tipo: u.tipo,
      responsableId: u.responsable?.id,
      orden: u.orden,
    })
  }

  const nuevo = () => {
    setModo('crear')
    setSeleccion(null)
    form.resetFields()
  }

  const puedeEditar = puede('organizacion.crear') || puede('organizacion.editar')

  return (
    <>
      <Title level={3} style={{ marginTop: 0 }}>
        Estructura organizacional
      </Title>
      <Text type="secondary">
        Hospital → direcciones → departamentos y servicios → áreas. Los procesos se añaden en la Fase 2.
      </Text>

      <Flex gap={16} wrap align="flex-start" style={{ marginTop: 16 }}>
        <Card
          title="Organización"
          style={{ flex: '1 1 380px' }}
          loading={isFetching}
          extra={
            puede('organizacion.crear') && (
              <Button size="small" icon={<PlusOutlined />} onClick={nuevo}>
                Nueva unidad
              </Button>
            )
          }
        >
          {arbol && arbol.length > 0 ? (
            <Tree
              treeData={aNodos(arbol)}
              defaultExpandAll
              selectedKeys={seleccion ? [seleccion] : []}
              onSelect={(keys) => {
                const id = keys[0] as string | undefined
                if (!id || !arbol) return
                const u = buscar(arbol, id)
                if (!u) return
                if (puedeEditar) editar(u)
                else setSeleccion(u.id)
              }}
            />
          ) : (
            <Empty description="Sin unidades" />
          )}
        </Card>

        {puedeEditar && (
          <Card
            title={modo === 'crear' ? 'Nueva unidad' : `Editar: ${seleccionada?.nombre ?? ''}`}
            style={{ flex: '1 1 320px' }}
            extra={
              modo === 'editar' &&
              seleccionada &&
              puede('organizacion.activar') && (
                <Button
                  size="small"
                  danger={seleccionada.activo}
                  onClick={() => cambiarEstado.mutate(seleccionada)}
                >
                  {seleccionada.activo ? 'Desactivar' : 'Activar'}
                </Button>
              )
            }
          >
            <Form<FormUnidad>
              form={form}
              layout="vertical"
              initialValues={{ tipo: 'AREA' }}
              onFinish={(v) => guardar.mutate(v)}
            >
              <Form.Item
                name="codigo"
                label="Código"
                rules={[{ required: true, message: 'Ingresa un código' }]}
              >
                <Input placeholder="DIR-01" disabled={modo === 'editar'} />
              </Form.Item>
              <Form.Item name="nombre" label="Nombre" rules={[{ required: true, min: 2 }]}>
                <Input />
              </Form.Item>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select
                  options={TIPOS.map((t) => ({ value: t, label: ETIQUETA_TIPO_UNIDAD[t] }))}
                />
              </Form.Item>
              <Form.Item
                name="padreId"
                label="Depende de"
                tooltip={modo === 'editar' ? 'Cámbialo para mover la unidad' : undefined}
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="(unidad raíz)"
                  options={opcionesPadre.filter((o) => o.value !== seleccion)}
                />
              </Form.Item>
              {puede('usuarios.ver') && (
                <Form.Item name="responsableId" label="Responsable">
                  <Select allowClear showSearch optionFilterProp="label" options={opcionesResponsable} />
                </Form.Item>
              )}
              <Form.Item name="orden" label="Orden">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={guardar.isPending}>
                  {modo === 'crear' ? 'Crear' : 'Guardar'}
                </Button>
                {modo === 'editar' && <Button onClick={nuevo}>Cancelar</Button>}
              </Space>
            </Form>
          </Card>
        )}
      </Flex>
    </>
  )
}
