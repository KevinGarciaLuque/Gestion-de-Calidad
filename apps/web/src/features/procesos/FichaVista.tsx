import { Alert, Descriptions, Empty, Table, Typography } from 'antd'
import { ETIQUETA_TIPO_RECURSO, type VersionFicha } from './procesosApi'

const { Paragraph, Text } = Typography

export function FichaVista({ version }: { version: VersionFicha }) {
  return (
    <>
      {version.estado === 'EN_REVISION' && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Esta versión está en revisión"
          description="No se puede editar hasta que Calidad la apruebe o la devuelva."
        />
      )}
      {version.comentarioRevision && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Comentario de la última revisión"
          description={version.comentarioRevision}
        />
      )}

      <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Alcance">
          {version.alcance ? (
            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{version.alcance}</Paragraph>
          ) : (
            <Text type="secondary">Sin definir</Text>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Seccion titulo="Entradas">
        <Table
          size="small"
          pagination={false}
          rowKey={(_, i) => String(i)}
          dataSource={version.entradas}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin entradas" /> }}
          columns={[
            { title: 'Proveedor', dataIndex: 'proveedor' },
            { title: 'Insumo / entrada', dataIndex: 'insumo' },
            { title: 'Requisitos', dataIndex: 'requisitos' },
          ]}
        />
      </Seccion>

      <Seccion titulo="Actividades">
        <Table
          size="small"
          pagination={false}
          rowKey={(_, i) => String(i)}
          dataSource={[...version.actividades].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin actividades" /> }}
          columns={[
            { title: '#', dataIndex: 'orden', width: 50 },
            { title: 'Actividad', dataIndex: 'actividad' },
            { title: 'Responsable', dataIndex: 'responsable' },
            { title: 'Punto de control', dataIndex: 'puntoControl' },
          ]}
        />
      </Seccion>

      <Seccion titulo="Salidas">
        <Table
          size="small"
          pagination={false}
          rowKey={(_, i) => String(i)}
          dataSource={version.salidas}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin salidas" /> }}
          columns={[
            { title: 'Salida', dataIndex: 'salida' },
            { title: 'Registro', dataIndex: 'registro' },
            { title: 'Cliente', dataIndex: 'cliente' },
          ]}
        />
      </Seccion>

      <Seccion titulo="Recursos">
        <Table
          size="small"
          pagination={false}
          rowKey={(_, i) => String(i)}
          dataSource={version.recursos}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin recursos" /> }}
          columns={[
            {
              title: 'Tipo',
              dataIndex: 'tipo',
              width: 160,
              render: (t: keyof typeof ETIQUETA_TIPO_RECURSO) => ETIQUETA_TIPO_RECURSO[t] ?? t,
            },
            { title: 'Detalle', dataIndex: 'detalle' },
          ]}
        />
      </Seccion>

      {version.notas && (
        <Seccion titulo="Notas">
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{version.notas}</Paragraph>
        </Seccion>
      )}
    </>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Text strong style={{ display: 'block', marginBottom: 6 }}>
        {titulo}
      </Text>
      {children}
    </div>
  )
}
