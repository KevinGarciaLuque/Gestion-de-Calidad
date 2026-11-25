import { useEffect, useState } from 'react'
import { App, AutoComplete, Button, Col, DatePicker, Divider, Form, Input, InputNumber, Modal, Row, Select, Typography, Upload } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'
import {
  ETIQUETA_ESTATUS,
  ETIQUETA_PHVA,
  ETIQUETA_TIPO,
  mccApi,
  type EstatusControl,
  type FasePHVA,
  type MccDetalle,
  type TipoRegistroMCC,
} from './mccApi'

const { Text } = Typography

const TIPOS: TipoRegistroMCC[] = ['NO_CONFORMIDAD', 'SALIDA_NO_CONFORME', 'ENTRADA_NO_CONFORME', 'QUEJA', 'FELICITACION', 'SUGERENCIA', 'OTRO']
const ESTATUS: EstatusControl[] = ['ABIERTO', 'EN_SEGUIMIENTO', 'CERRADO', 'DESESTIMADO']
const FECHAS = ['fechaRecepcion', 'fechaNotificacion', 'fechaCompromisoRespuesta', 'fechaLimite', 'fechaCierre'] as const
const MAX_MB = 25

/** Sugerencias base; se completan con los valores ya usados en el sistema. */
const BASE = {
  impactos: ['LEVE', 'MODERADO', 'GRAVE', 'CRÍTICO'],
  dondeImpacto: ['PACIENTE', 'COLABORADOR', 'INSTITUCIÓN', 'PROCESO', 'NO APLICA'],
  turnos: ['A', 'B', 'C', 'NO APLICA'],
  validacion: ['PENDIENTE', 'VALIDADO', 'NO VALIDADO'],
}
const unir = (a: string[], b?: string[]) => [...new Set([...a, ...(b ?? [])])].map((value) => ({ value }))

interface Props {
  abierto: boolean
  onCerrar: () => void
  /** Si viene, el formulario edita ese registro; si no, crea uno nuevo. */
  registro?: MccDetalle['registro']
  onGuardado?: (id: string) => void
}

export function MccRegistroForm({ abierto, onCerrar: alCerrar, registro, onGuardado }: Props) {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const { puede } = useAuth()
  const gestiona = puede('mcc.gestionar')
  const [form] = Form.useForm()
  const [archivos, setArchivos] = useState<UploadFile[]>([])
  const onCerrar = () => {
    setArchivos([])
    alCerrar()
  }
  const { data: cat } = useQuery({ queryKey: ['mcc', 'catalogos'], queryFn: mccApi.catalogos, enabled: abierto, staleTime: 60_000 })

  useEffect(() => {
    if (!abierto) return
    form.resetFields()
    if (registro) {
      const c = registro.control
      form.setFieldsValue({
        ...c,
        tipoRegistro: registro.tipoRegistro,
        codigoTipo: registro.codigoTipo,
        titulo: registro.titulo,
        descripcion: registro.descripcion,
        macroproceso: registro.macroproceso,
        areaResponsable: registro.area?.nombre?.toUpperCase() ?? registro.areaResponsable,
        impacto: registro.impacto,
        prioridad: registro.prioridad,
        estatus: registro.estatus === 'SIN_ESTADO' ? undefined : registro.estatus,
        requiereAcyp: c.requiereAcyp ? 'SI' : 'NO',
        tieneCostos: c.tieneCostos ? 'SI' : 'NO',
        porques: [0, 1, 2, 3, 4].map((i) => c.porques?.[i] ?? ''),
        fechaRecepcion: registro.fechaRecepcion ? dayjs(registro.fechaRecepcion) : null,
        fechaNotificacion: c.fechaNotificacion ? dayjs(c.fechaNotificacion) : null,
        fechaCompromisoRespuesta: c.fechaCompromisoRespuesta ? dayjs(c.fechaCompromisoRespuesta) : null,
        fechaLimite: c.fechaLimite ? dayjs(c.fechaLimite) : null,
        fechaCierre: registro.fechaCierre ? dayjs(registro.fechaCierre) : null,
      })
    }
  }, [abierto, registro, form])

  const guardar = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const payload: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v)) {
        if (k === 'archivo') continue
        if ((FECHAS as readonly string[]).includes(k)) payload[k] = val ? (val as Dayjs).toISOString() : null
        else if (k === 'requiereAcyp' || k === 'tieneCostos') payload[k] = val === 'SI'
        else if (k === 'porques') payload[k] = (val as string[] | undefined)?.map((p) => p ?? '') ?? null
        else if (typeof val === 'string') payload[k] = val.trim() || null
        else payload[k] = val ?? null
      }
      if (!gestiona) delete payload.estatus
      let id = registro?.id
      if (registro) {
        await mccApi.editar(registro.id, payload)
      } else {
        // En la creación se omiten los vacíos.
        for (const k of Object.keys(payload)) if (payload[k] === null) delete payload[k]
        const det = await mccApi.crear({ ...payload, origen: 'OTRO', origenDetalle: (payload.fuente as string) ?? undefined })
        id = det.registro.id
      }
      for (const f of archivos) if (f.originFileObj) await mccApi.subirEvidencia(id!, f.originFileObj)
      return id!
    },
    onSuccess: (id) => {
      message.success(registro ? 'Registro actualizado' : 'Registro creado y alerta enviada a Calidad')
      void qc.invalidateQueries({ queryKey: ['mcc'] })
      onCerrar()
      onGuardado?.(id)
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const adq = Form.useWatch('compromisosAdquiridos', form) as number | undefined
  const cump = Form.useWatch('compromisosCumplidos', form) as number | undefined
  const estatus = Form.useWatch('estatus', form) as EstatusControl | undefined
  const limite = Form.useWatch('fechaLimite', form) as Dayjs | undefined
  const pct = adq ? Math.min(100, Math.round(((cump ?? 0) / adq) * 100)) : 0

  const indicador = (() => {
    const e = estatus ?? 'ABIERTO'
    if (e === 'CERRADO') return { texto: 'CERRADO', color: '#389e0d', bg: '#f6ffed' }
    if (e === 'DESESTIMADO') return { texto: 'DESESTIMADO', color: '#595959', bg: '#fafafa' }
    if (!limite) return { texto: `${ETIQUETA_ESTATUS[e].toUpperCase()} · SIN FECHA LÍMITE`, color: '#cf1322', bg: '#fff1f0' }
    const d = limite.startOf('day').diff(dayjs().startOf('day'), 'day')
    if (d < 0) return { texto: `VENCIDO (${-d} días)`, color: '#a8071a', bg: '#fff1f0' }
    if (d <= 7) return { texto: `POR VENCER (${d} días)`, color: '#d46b08', bg: '#fff7e6' }
    return { texto: 'EN PLAZO', color: '#0958d9', bg: '#e6f4ff' }
  })()

  const seccion = (n: number, titulo: string) => (
    <Divider orientation="left" orientationMargin={0} style={{ borderColor: '#d4a017' }}>
      <Text strong>{n}. {titulo}</Text>
    </Divider>
  )

  return (
    <Modal
      title={registro ? `Editar ${registro.codigoTipo ?? registro.codigo}` : 'Nuevo registro de Control MCC'}
      open={abierto}
      onCancel={onCerrar}
      width={1000}
      destroyOnClose
      maskClosable={false}
      keyboard={false}
      footer={[
        <Button key="c" onClick={onCerrar}>Cancelar</Button>,
        <Button key="ok" type="primary" loading={guardar.isPending} onClick={() => form.submit()}>
          {registro ? 'Guardar cambios' : 'Registrar hallazgo y enviar alerta'}
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        size="middle"
        initialValues={{
          fechaRecepcion: dayjs(), turno: 'A', impacto: 'MODERADO', dondeImpacto: 'PACIENTE', requiereAcyp: 'NO',
          tieneCostos: 'NO', costoCalidad: 0, compromisosAdquiridos: 0, compromisosCumplidos: 0, phva: 'PLANIFICAR',
          estatus: 'ABIERTO', validacionCalidad: 'PENDIENTE', porques: ['', '', '', '', ''],
        }}
        onFinish={(v) => guardar.mutate(v)}
        style={{ maxHeight: '68vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: 8 }}
      >
        {seccion(1, 'Identificación y recepción del hallazgo')}
        <Row gutter={12}>
          <Col xs={24} md={6}>
            <Form.Item name="tipoRegistro" label="Tipo de registro" rules={[{ required: true, message: 'Selecciona el tipo' }]}>
              <Select placeholder="Seleccionar…" options={TIPOS.map((t) => ({ value: t, label: ETIQUETA_TIPO[t] }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="codigoTipo" label="Código" tooltip="Si lo dejas vacío se asigna automáticamente (NC-001-2026, SNC-…, ENC-…)">
              <Input placeholder="NC-XXX-2026" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="gestorCalidad" label="Gestor de calidad" rules={[{ required: gestiona }]}>
              <AutoComplete options={unir([], cat?.gestores)} filterOption />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="fechaRecepcion" label="Fecha y hora de recepción" rules={[{ required: true }]}>
              <DatePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="usuarioEncuentra" label="Usuario que encuentra" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="areaReporta" label="Área que reporta" rules={[{ required: true }]}>
              <AutoComplete options={unir([], [...(cat?.areasReporta ?? []), ...(cat?.areas ?? [])])} filterOption />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="fuente" label="Fuente" rules={[{ required: true }]}>
              <AutoComplete options={unir([], cat?.fuentes)} filterOption />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="fuenteSecundaria" label="Fuente secundaria">
              <AutoComplete options={unir(['5S DE LA CALIDAD'], cat?.fuentesSecundarias)} filterOption />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="numeroExpediente" label="N° expediente">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name="turno" label="Turno">
              <AutoComplete options={unir(BASE.turnos)} />
            </Form.Item>
          </Col>
          <Col xs={24} md={14}>
            <Form.Item name="titulo" label="¿Cuál es el problema principal?" rules={[{ required: true, min: 3 }]}>
              <Input maxLength={191} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="descripcion" label="Descripción del hallazgo" rules={[{ required: true, min: 5 }]}>
              <Input.TextArea rows={3} maxLength={4000} />
            </Form.Item>
          </Col>
        </Row>

        {seccion(2, 'Macroproceso, área responsable e impacto')}
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="macroproceso" label="Macroproceso / parte interesada" rules={[{ required: true }]}>
              <AutoComplete options={unir([], cat?.macroprocesos)} filterOption placeholder="Seleccionar o escribir…" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="areaResponsable" label="Área o servicio responsable" rules={[{ required: true }]}>
              <AutoComplete options={unir([], cat?.areas)} filterOption placeholder="Seleccionar o escribir…" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="procesoAfectado" label="Proceso afectado"><Input placeholder="NO APLICA" /></Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="subproceso" label="Subproceso"><Input placeholder="NO APLICA" /></Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="procedimiento" label="Procedimiento"><Input placeholder="NO APLICA" /></Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="subrogado" label="Subrogado"><Input placeholder="NO APLICA" /></Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="impacto" label="Impacto" rules={[{ required: true }]}>
              <AutoComplete options={unir(BASE.impactos, cat?.impactos)} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="dondeImpacto" label="¿Dónde impactó?">
              <AutoComplete options={unir(BASE.dondeImpacto, cat?.dondeImpacto)} />
            </Form.Item>
          </Col>
          {gestiona && (
            <Col xs={12} md={6}>
              <Form.Item name="prioridad" label="Prioridad">
                <Select allowClear options={[{ value: 'ALTA', label: 'Alta' }, { value: 'MEDIA', label: 'Media' }, { value: 'BAJA', label: 'Baja' }]} />
              </Form.Item>
            </Col>
          )}
        </Row>

        {gestiona && (
          <>
            {seccion(3, 'Causa raíz, ACyP, costos de calidad y Lean / PHVA')}
            <Form.Item name="causaRaiz" label="Causa raíz"><Input.TextArea rows={2} /></Form.Item>
            <Row gutter={12}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Col xs={24} md={i < 3 ? 8 : 12} key={i}>
                  <Form.Item name={['porques', i]} label={`¿Por qué #${i + 1}?`}><Input /></Form.Item>
                </Col>
              ))}
              <Col xs={12} md={4}>
                <Form.Item name="requiereAcyp" label="¿Requiere ACyP?">
                  <Select options={[{ value: 'SI', label: 'SÍ' }, { value: 'NO', label: 'NO' }]} />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item name="acypCodigo" label="ID ACyP"><Input placeholder="ACYP-001-2026" /></Form.Item>
              </Col>
              <Col xs={8} md={4}>
                <Form.Item name="compromisosAdquiridos" label="Comp. adq."><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
              </Col>
              <Col xs={8} md={4}>
                <Form.Item name="compromisosCumplidos" label="Comp. cump."><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
              </Col>
              <Col xs={8} md={3}>
                <Form.Item label="% cump."><Input value={`${pct}%`} disabled /></Form.Item>
              </Col>
              <Col xs={24} md={5}>
                <Form.Item name="escalamiento" label="Escalamiento">
                  <AutoComplete options={unir(['DERIVADO A OTRA ÁREA', 'GERENCIA', 'DIRECCIÓN MÉDICA', 'NO APLICA'], cat?.escalamientos)} />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item name="tieneCostos" label="¿Costos?">
                  <Select options={[{ value: 'SI', label: 'SÍ' }, { value: 'NO', label: 'NO' }]} />
                </Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item name="costoCalidad" label="Costo (L)"><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item>
              </Col>
              <Col xs={12} md={4}>
                <Form.Item name="phva" label="PHVA">
                  <Select allowClear options={(Object.keys(ETIQUETA_PHVA) as FasePHVA[]).map((p) => ({ value: p, label: ETIQUETA_PHVA[p] }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="logros" label="Logros obtenidos"><Input /></Form.Item>
              </Col>
              {(['leanDefecto', 'leanRetrabajo', 'leanEspera', 'leanMovimiento'] as const).map((k) => (
                <Col xs={12} md={6} key={k}>
                  <Form.Item name={k} label={`LEAN · ${k.replace('lean', '')}`}><Input placeholder="NO APLICA" /></Form.Item>
                </Col>
              ))}
            </Row>

            {seccion(4, 'Seguimiento, estatus de cierre y evidencia')}
            <Row gutter={12}>
              <Col xs={24} md={6}>
                <Form.Item name="responsableNombre" label="Responsable" rules={[{ required: true }]}>
                  <AutoComplete options={unir([], cat?.responsables)} filterOption />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="fechaNotificacion" label="Fecha notificación"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="fechaCompromisoRespuesta" label="Fecha comp. respuesta"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="fechaLimite" label="Fecha límite / cierre máx."><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="fechaCierre" label="Fecha cierre real"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="estatus" label="Estatus de cierre" rules={[{ required: true }]}>
                  <Select options={ESTATUS.map((e) => ({ value: e, label: ETIQUETA_ESTATUS[e] }))} />
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item label="Indicador de criterio">
                  <div style={{ border: `1px solid ${indicador.color}`, background: indicador.bg, color: indicador.color, borderRadius: 6, padding: '4px 8px', fontWeight: 600, textAlign: 'center', fontSize: 12 }}>
                    {indicador.texto}
                  </div>
                </Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="validacionCalidad" label="Validación calidad">
                  <AutoComplete options={unir(BASE.validacion)} />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="notaEvidencia" label="Nota de evidencia"><Input.TextArea rows={2} /></Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label={`Adjuntar imagen o PDF (máx. ${MAX_MB} MB)`}>
              <Upload
                multiple
                accept="image/*,application/pdf"
                fileList={archivos}
                beforeUpload={(f) => {
                  if (f.size > MAX_MB * 1024 * 1024) {
                    message.error(`${f.name} supera ${MAX_MB} MB`)
                    return Upload.LIST_IGNORE
                  }
                  return false
                }}
                onChange={({ fileList }) => setArchivos(fileList)}
              >
                <Button icon={<UploadOutlined />}>Seleccionar archivo</Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
}
