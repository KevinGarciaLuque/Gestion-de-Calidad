import { useState } from 'react'
import { Alert, App, Button, Collapse, Descriptions, Flex, List, Modal, Steps, Table, Tag, Typography, Upload } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { ETIQUETA_ESTATUS, ETIQUETA_TIPO, lempiras, mccApi, TAG_ESTATUS, type ResultadoImportacion } from './mccApi'

const { Text, Paragraph } = Typography

export function MccImportarModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<ResultadoImportacion | null>(null)
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)

  const reiniciar = () => {
    setArchivo(null)
    setVistaPrevia(null)
    setResultado(null)
  }
  const cerrar = () => {
    reiniciar()
    onCerrar()
  }

  const simular = useMutation({
    mutationFn: (f: File) => mccApi.importar(f, true),
    onSuccess: setVistaPrevia,
    onError: (e) => message.error(mensajeDeError(e)),
  })
  const importar = useMutation({
    mutationFn: () => mccApi.importar(archivo!, false),
    onSuccess: (r) => {
      setResultado(r)
      message.success(`Importación lista: ${r.nuevos} nuevos, ${r.actualizados} actualizados`)
      void qc.invalidateQueries({ queryKey: ['mcc'] })
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })

  const paso = resultado ? 2 : vistaPrevia ? 1 : 0
  const r = resultado ?? vistaPrevia

  return (
    <Modal
      title="Importar histórico del Control MCC (CSV)"
      open={abierto}
      onCancel={cerrar}
      width={900}
      destroyOnClose
      footer={
        resultado ? (
          <Button type="primary" onClick={cerrar}>Listo</Button>
        ) : vistaPrevia ? (
          <Flex justify="space-between">
            <Button onClick={reiniciar}>Elegir otro archivo</Button>
            <Button type="primary" loading={importar.isPending} disabled={vistaPrevia.validas === 0} onClick={() => importar.mutate()}>
              Importar {vistaPrevia.validas} registros
            </Button>
          </Flex>
        ) : null
      }
    >
      <Steps size="small" current={paso} style={{ marginBottom: 16 }} items={[{ title: 'Archivo' }, { title: 'Revisar' }, { title: 'Importado' }]} />

      {paso === 0 && (
        <>
          <Paragraph type="secondary">
            En la hoja de Google Sheets del Control MCC ve a <Text strong>Archivo › Descargar › Valores separados por comas (.csv)</Text> y
            sube ese archivo aquí. Las columnas se reconocen por su nombre (Tipo de Registro, Código, Descripción del Hallazgo,
            Macroproceso, Área Responsable, Estatus de Cierre, Costo (L), Fecha Límite, etc.).
          </Paragraph>
          <Paragraph type="secondary">
            Si un registro ya existe (mismo ID, p. ej. <Text code>MCC-00304</Text>), se <Text strong>actualiza</Text> en lugar de duplicarse,
            así que puedes volver a importar la hoja cuantas veces necesites. Primero verás una vista previa; nada se guarda hasta que confirmes.
          </Paragraph>
          <Upload.Dragger
            accept=".csv,.txt"
            maxCount={1}
            showUploadList={false}
            disabled={simular.isPending}
            beforeUpload={(f) => {
              setArchivo(f)
              simular.mutate(f)
              return false
            }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">{simular.isPending ? 'Analizando…' : 'Haz clic o arrastra el archivo CSV aquí'}</p>
          </Upload.Dragger>
        </>
      )}

      {r && (
        <>
          {resultado && <Alert type="success" showIcon style={{ marginBottom: 12 }} message="Importación completada" description="Ya puedes ver los registros en el tablero y en Control ACyP." />}
          <Descriptions size="small" bordered column={{ xs: 1, sm: 3 }} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="Archivo">{archivo?.name}</Descriptions.Item>
            <Descriptions.Item label="Filas leídas">{r.filasLeidas}</Descriptions.Item>
            <Descriptions.Item label="Válidas">{r.validas}</Descriptions.Item>
            <Descriptions.Item label={resultado ? 'Creados' : 'Se crearán'}><Text strong style={{ color: '#389e0d' }}>{r.nuevos}</Text></Descriptions.Item>
            <Descriptions.Item label={resultado ? 'Actualizados' : 'Se actualizarán'}><Text strong style={{ color: '#0958d9' }}>{r.actualizados}</Text></Descriptions.Item>
            <Descriptions.Item label="Con error (se omiten)"><Text strong style={{ color: r.errores.length ? '#cf1322' : undefined }}>{r.errores.length}</Text></Descriptions.Item>
          </Descriptions>

          {r.columnasIgnoradas.length > 0 && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={`${r.columnasReconocidas.length} columnas reconocidas · ${r.columnasIgnoradas.length} ignoradas`}
              description={<Flex gap={4} wrap>{r.columnasIgnoradas.map((c) => <Tag key={c}>{c}</Tag>)}</Flex>}
            />
          )}

          {!resultado && (
            <Table
              size="small"
              rowKey="fila"
              pagination={false}
              scroll={{ x: 800 }}
              title={() => <Text strong>Vista previa (primeras filas)</Text>}
              dataSource={r.muestra}
              columns={[
                { title: 'Fila', dataIndex: 'fila', width: 50 },
                { title: 'ID', dataIndex: 'codigo', width: 110, render: (v) => v ?? <Text type="secondary">nuevo</Text> },
                { title: 'Código', dataIndex: 'codigoTipo', width: 110, render: (v) => v ?? 'S/C' },
                { title: 'Tipo', dataIndex: 'tipoRegistro', width: 130, render: (t) => (t ? ETIQUETA_TIPO[t as keyof typeof ETIQUETA_TIPO] : '—') },
                { title: 'Fecha', dataIndex: 'fechaRecepcion', width: 95, render: (f) => (f ? dayjs(f).format('DD/MM/YYYY') : '—') },
                { title: 'Área', dataIndex: 'areaResponsable', width: 150, render: (v) => v ?? '—' },
                { title: 'Estatus', dataIndex: 'estatus', width: 120, render: (e) => <Tag color={TAG_ESTATUS[e as keyof typeof TAG_ESTATUS]}>{ETIQUETA_ESTATUS[e as keyof typeof ETIQUETA_ESTATUS]}</Tag> },
                { title: 'Costo', dataIndex: 'costoCalidad', width: 100, render: (c) => (c ? lempiras(c) : '—') },
                { title: 'Problema', dataIndex: 'titulo', ellipsis: true },
              ]}
            />
          )}

          {(r.errores.length > 0 || r.totalAdvertencias > 0) && (
            <Collapse
              style={{ marginTop: 12 }}
              items={[
                ...(r.errores.length
                  ? [{
                      key: 'e', label: <Text type="danger">{r.errores.length} filas con error (no se importan)</Text>,
                      children: <List size="small" dataSource={r.errores} renderItem={(e) => <List.Item>Fila {e.fila}: {e.mensaje}</List.Item>} />,
                    }]
                  : []),
                ...(r.totalAdvertencias
                  ? [{
                      key: 'a', label: <Text type="warning">{r.totalAdvertencias} advertencias (se importan con el dato vacío)</Text>,
                      children: <List size="small" dataSource={r.advertencias} renderItem={(e) => <List.Item>Fila {e.fila}: {e.mensaje}</List.Item>} />,
                    }]
                  : []),
              ]}
            />
          )}
        </>
      )}
    </Modal>
  )
}
