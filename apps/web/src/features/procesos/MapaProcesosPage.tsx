import { Fragment, useState } from 'react'
import {
  App,
  Button,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import type { FormInstance } from 'antd'
import {
  ArrowRightOutlined,
  DeleteOutlined,
  PlusOutlined,
  PrinterOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import { SemaforoDot } from '@/components/Semaforo'
import {
  ETIQUETA_TIPO_PROCESO,
  procesosApi,
  type MapaConfig,
  type ProcesoResumen,
  type TipoProceso,
} from './procesosApi'

const { Title, Text, Paragraph } = Typography

const COLOR_NIVEL: Record<TipoProceso, string> = {
  ESTRATEGICO: '#d99a2b',
  MISIONAL: '#d5713b',
  APOYO: '#6fa843',
}
const FONDO_NIVEL: Record<TipoProceso, string> = {
  ESTRATEGICO: '#fbf5e8',
  MISIONAL: '#fbefe8',
  APOYO: '#f0f6e8',
}

const CICLO_MEJORA: { texto: string; ruta: string; permiso?: string }[] = [
  { texto: 'Seguimiento y medición de los procesos', ruta: '/indicadores', permiso: 'indicadores.ver' },
  { texto: 'Control de salidas no conformes', ruta: '/hallazgos', permiso: 'hallazgos.ver' },
  { texto: 'Auditorías internas', ruta: '/auditorias', permiso: 'auditorias.ver' },
  { texto: 'Revisión por la dirección', ruta: '/reportes/ejecutivo', permiso: 'reportes.ver' },
  { texto: 'Acción correctiva', ruta: '/acciones', permiso: 'acciones.ver' },
  { texto: 'Mejora continua', ruta: '/mcc', permiso: 'mcc.ver' },
]

const CSS = `
.mapa-diagrama { border: 1px solid #e8e8e8; border-radius: 10px; padding: 18px; background: #fff; }
.mapa-franja-sup { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 14px; }
.mapa-chip-sup { background: #eef4f8; border: 1px solid #d6e4ee; color: #012a44; font-weight: 600;
  font-size: 12.5px; padding: 6px 14px; border-radius: 6px; }
.mapa-cuerpo { display: flex; gap: 12px; align-items: stretch; }
.mapa-banda { flex: 0 0 190px; background: linear-gradient(160deg, #007ac1, #012a44); color: #fff;
  border-radius: 8px; padding: 16px 14px; display: flex; flex-direction: column; gap: 10px; }
.mapa-banda h4 { color: #fff; font-size: 12px; letter-spacing: 1.5px; margin: 0 0 4px; opacity: .85; }
.mapa-banda-item { font-size: 12.5px; line-height: 1.35; display: flex; gap: 8px; align-items: flex-start; }
.mapa-banda-item .dot { flex: 0 0 auto; margin-top: 5px; width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,.7); }
.mapa-centro { flex: 1 1 auto; min-width: 0; display: flex; }
.mapa-marco { flex: 1; border: 2px dashed #9aa7b1; border-radius: 8px; padding: 12px; display: flex;
  flex-direction: column; gap: 12px; background: #fcfcfd; }
.mapa-nivel { display: flex; gap: 10px; align-items: stretch; }
.mapa-nivel-tab { flex: 0 0 116px; border-radius: 6px; color: #fff; font-weight: 700; font-size: 11px;
  letter-spacing: .5px; text-transform: uppercase; display: flex; align-items: center; justify-content: center;
  text-align: center; padding: 8px 6px; clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%); }
.mapa-nivel-cards { flex: 1 1 auto; min-width: 0; display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start;
  padding: 8px; border-radius: 6px; }
.mapa-card { background: #fff; border: 1px solid #e3e3e3; border-left: 3px solid var(--acc); border-radius: 6px;
  padding: 8px 10px; cursor: pointer; min-width: 150px; max-width: 220px; transition: box-shadow .15s, transform .15s; }
.mapa-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.1); transform: translateY(-1px); }
.mapa-card .nom { font-weight: 600; font-size: 12.5px; display: block; }
.mapa-card .cod { color: #8c8c8c; font-size: 11px; }
.mapa-ciclo { display: flex; flex-wrap: wrap; gap: 6px; align-items: stretch; margin-top: 14px; }
.mapa-ciclo-box { flex: 1 1 150px; background: #f4f6f8; border: 1px solid #dde3e8; border-radius: 6px;
  padding: 8px 10px; font-size: 11.5px; font-weight: 600; color: #333; text-align: center;
  display: flex; align-items: center; justify-content: center; text-decoration: none; }
a.mapa-ciclo-box:hover { background: #e9eef2; color: #00629b; }
.mapa-ciclo-flecha { display: flex; align-items: center; color: #bfbfbf; }

@media (max-width: 991px) {
  .mapa-cuerpo { flex-direction: column; }
  .mapa-banda { flex: none; }
  .mapa-banda .mapa-banda-items { display: flex; flex-wrap: wrap; gap: 10px; }
  .mapa-nivel { flex-direction: column; }
  .mapa-nivel-tab { flex: none; width: 100%; clip-path: none; }
  .mapa-ciclo-flecha { display: none; }
}
@media print {
  .ant-layout-sider, .ant-layout-header, .mapa-no-print { display: none !important; }
  .ant-layout, .ant-layout-content, .ant-layout-content > div { margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
  .mapa-diagrama { border: none; padding: 0; }
  .mapa-card:hover { box-shadow: none; transform: none; }
}
`

export function MapaProcesosPage() {
  const navigate = useNavigate()
  const { puede } = useAuth()
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [crear, setCrear] = useState(false)
  const [configurar, setConfigurar] = useState(false)
  const [form] = Form.useForm()

  const { data } = useQuery({ queryKey: ['procesos-mapa'], queryFn: procesosApi.mapa })
  const cfg = useQuery({ queryKey: ['procesos-mapa-config'], queryFn: procesosApi.mapaConfig })

  const crearProceso = useMutation({
    mutationFn: procesosApi.crear,
    onSuccess: (detalle) => {
      setCrear(false)
      form.resetFields()
      void qc.invalidateQueries({ queryKey: ['procesos-mapa'] })
      navigate(`/procesos/${detalle.proceso.id}`)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const puedeConfigurar = puede('procesos.aprobar')

  return (
    <>
      <style>{CSS}</style>

      <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }} className="mapa-no-print">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Mapa de procesos
          </Title>
          <Text type="secondary">Marco del SGC bajo el enfoque por procesos de ISO 9001</Text>
        </div>
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Imprimir
          </Button>
          {puedeConfigurar && (
            <Button icon={<SettingOutlined />} onClick={() => setConfigurar(true)}>
              Configurar mapa
            </Button>
          )}
          {puede('procesos.crear') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrear(true)}>
              Nuevo proceso
            </Button>
          )}
        </Space>
      </Flex>

      <div className="mapa-diagrama">
        {/* Franja superior */}
        {(cfg.data?.franjaSuperior?.length ?? 0) > 0 && (
          <div className="mapa-franja-sup">
            {cfg.data!.franjaSuperior.map((t) => (
              <span key={t} className="mapa-chip-sup">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mapa-cuerpo">
          <Banda titulo="Entradas" items={cfg.data?.entradas ?? []} />

          <div className="mapa-centro">
            <div className="mapa-marco">
              {(['ESTRATEGICO', 'MISIONAL', 'APOYO'] as TipoProceso[]).map((tipo) => {
                const col = data?.find((c) => c.tipo === tipo)
                return (
                  <div className="mapa-nivel" key={tipo}>
                    <div className="mapa-nivel-tab" style={{ background: COLOR_NIVEL[tipo] }}>
                      Procesos {ETIQUETA_TIPO_PROCESO[tipo].toLowerCase()}
                    </div>
                    <div className="mapa-nivel-cards" style={{ background: FONDO_NIVEL[tipo] }}>
                      {(col?.procesos.length ?? 0) === 0 ? (
                        <Text type="secondary" style={{ fontSize: 12, padding: 4 }}>
                          Sin procesos en este nivel.
                        </Text>
                      ) : (
                        col!.procesos.map((p) => (
                          <TarjetaProceso
                            key={p.id}
                            proceso={p}
                            color={COLOR_NIVEL[tipo]}
                            onClick={() => navigate(`/procesos/${p.id}`)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <Banda titulo="Salidas" items={cfg.data?.salidas ?? []} />
        </div>

        {/* Ciclo de mejora */}
        <div className="mapa-ciclo">
          {CICLO_MEJORA.map((c, i) => {
            const habilitado = !c.permiso || puede(c.permiso)
            const box = habilitado ? (
              <a
                className="mapa-ciclo-box"
                key={c.texto}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(c.ruta)
                }}
                href={c.ruta}
              >
                {c.texto}
              </a>
            ) : (
              <span className="mapa-ciclo-box" key={c.texto} style={{ opacity: 0.6 }}>
                {c.texto}
              </span>
            )
            return (
              <Fragment key={c.texto}>
                {box}
                {i < CICLO_MEJORA.length - 1 && (
                  <span className="mapa-ciclo-flecha">
                    <ArrowRightOutlined />
                  </span>
                )}
              </Fragment>
            )
          })}
        </div>

        {cfg.data?.notaPie && (
          <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12.5 }}>
            {cfg.data.notaPie}
          </Paragraph>
        )}
      </div>

      <NuevoProcesoModal
        open={crear}
        form={form}
        onCancel={() => setCrear(false)}
        onFinish={(v) => crearProceso.mutate(v)}
        pendiente={crearProceso.isPending}
      />

      <ConfigurarMapaModal
        open={configurar}
        inicial={cfg.data}
        onClose={() => setConfigurar(false)}
        onSaved={() => {
          setConfigurar(false)
          void qc.invalidateQueries({ queryKey: ['procesos-mapa-config'] })
        }}
      />
    </>
  )
}

function Banda({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <div className="mapa-banda">
      <h4>{titulo.toUpperCase()} DEL SGC</h4>
      <div className="mapa-banda-items">
        {items.length === 0 ? (
          <span className="mapa-banda-item" style={{ opacity: 0.6 }}>
            Sin definir
          </span>
        ) : (
          items.map((t) => (
            <span className="mapa-banda-item" key={t}>
              <span className="dot" />
              <span>{t}</span>
            </span>
          ))
        )}
      </div>
    </div>
  )
}

function TarjetaProceso({
  proceso,
  color,
  onClick,
}: {
  proceso: ProcesoResumen
  color: string
  onClick: () => void
}) {
  return (
    <div className="mapa-card" style={{ '--acc': color } as React.CSSProperties} onClick={onClick}>
      <Flex align="center" gap={6} style={{ marginBottom: 2 }}>
        <SemaforoDot estado={proceso.semaforo.estado} motivos={proceso.semaforo.motivos} />
        <span className="nom">{proceso.nombre}</span>
      </Flex>
      <Flex justify="space-between" align="center" gap={6}>
        <span className="cod">{proceso.codigo}</span>
        {proceso.enRevision ? (
          <Tag color="gold" style={{ margin: 0 }}>En revisión</Tag>
        ) : proceso.estado === 'VIGENTE' && proceso.versionVigente != null ? (
          <Tag color="green" style={{ margin: 0 }}>
            v{proceso.versionVigente}
            {proceso.tieneCambiosEnCurso ? ' · cambios' : ''}
          </Tag>
        ) : (
          <Tag color="default" style={{ margin: 0 }}>Borrador</Tag>
        )}
      </Flex>
    </div>
  )
}

function NuevoProcesoModal({
  open,
  form,
  onCancel,
  onFinish,
  pendiente,
}: {
  open: boolean
  form: FormInstance
  onCancel: () => void
  onFinish: (v: { codigo: string; nombre: string; tipo: TipoProceso; objetivo: string }) => void
  pendiente: boolean
}) {
  return (
    <Modal
      title="Nuevo proceso"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Crear"
      confirmLoading={pendiente}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ tipo: 'MISIONAL' }} onFinish={onFinish}>
        <Form.Item
          name="codigo"
          label="Código"
          rules={[
            { required: true, message: 'Ingresa un código' },
            { pattern: /^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/, message: 'Código no válido' },
          ]}
        >
          <Input placeholder="PR-CAL-001" />
        </Form.Item>
        <Form.Item name="nombre" label="Nombre" rules={[{ required: true, min: 3 }]}>
          <Input />
        </Form.Item>
        <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
          <Select
            options={(['ESTRATEGICO', 'MISIONAL', 'APOYO'] as TipoProceso[]).map((t) => ({
              value: t,
              label: `Procesos ${ETIQUETA_TIPO_PROCESO[t].toLowerCase()}`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="objetivo"
          label="Objetivo"
          rules={[{ required: true, min: 3, message: 'Describe el objetivo del proceso' }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function ConfigurarMapaModal({
  open,
  inicial,
  onClose,
  onSaved,
}: {
  open: boolean
  inicial: MapaConfig | undefined
  onClose: () => void
  onSaved: () => void
}) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  const guardar = useMutation({
    mutationFn: procesosApi.guardarMapaConfig,
    onSuccess: () => {
      message.success('Mapa actualizado')
      onSaved()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <Modal
      title="Configurar el marco del mapa"
      open={open}
      onCancel={onClose}
      okText="Guardar"
      confirmLoading={guardar.isPending}
      destroyOnClose
      width={640}
      onOk={() =>
        form.validateFields().then((v) =>
          guardar.mutate({
            entradas: v.entradas ?? [],
            salidas: v.salidas ?? [],
            franjaSuperior: v.franjaSuperior ?? [],
            notaPie: v.notaPie || undefined,
          }),
        )
      }
    >
      <Paragraph type="secondary">
        Los procesos (las tarjetas) se toman de lo registrado en el sistema. Aquí solo se editan las
        bandas del marco ISO. El ciclo de mejora inferior es fijo.
      </Paragraph>
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{
          entradas: inicial?.entradas ?? [],
          salidas: inicial?.salidas ?? [],
          franjaSuperior: inicial?.franjaSuperior ?? [],
          notaPie: inicial?.notaPie ?? '',
        }}
      >
        <ListaCampo nombre="entradas" titulo="Entradas del SGC (banda izquierda)" placeholder="Requisitos del cliente" />
        <ListaCampo nombre="salidas" titulo="Salidas del SGC (banda derecha)" placeholder="Satisfacción del cliente" />
        <ListaCampo nombre="franjaSuperior" titulo="Franja superior" placeholder="Liderazgo" />
        <Form.Item name="notaPie" label="Nota al pie (opcional)">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function ListaCampo({ nombre, titulo, placeholder }: { nombre: string; titulo: string; placeholder: string }) {
  return (
    <Form.Item label={titulo} style={{ marginBottom: 12 }}>
      <Form.List name={nombre}>
        {(campos, { add, remove }) => (
          <Space direction="vertical" style={{ width: '100%' }} size={6}>
            {campos.map(({ key, name }) => (
              <Flex key={key} gap={6}>
                <Form.Item name={name} noStyle rules={[{ required: true, message: 'Escribe un texto o quita la fila' }]}>
                  <Input placeholder={placeholder} />
                </Form.Item>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
              </Flex>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => add('')} disabled={campos.length >= 12} block>
              Agregar
            </Button>
          </Space>
        )}
      </Form.List>
    </Form.Item>
  )
}
