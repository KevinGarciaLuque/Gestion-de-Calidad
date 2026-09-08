import { App, Button, Empty, List, Space, Typography, Upload } from 'antd'
import { DeleteOutlined, DownloadOutlined, InboxOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { mensajeDeError } from '@/lib/api'
import { tamanoLegible } from '@/features/documentos/documentosApi'

const { Text } = Typography

interface EvidenciaItem {
  id: string
  nombreOriginal: string
  tamanoBytes: number
  subidoAt: string
  subidoPor: { nombre: string } | null
}

export function GenericoEvidenciasPanel({
  listar,
  subir,
  quitar,
  descargar,
  puedeEditar,
  queryKey,
}: {
  listar: () => Promise<EvidenciaItem[]>
  subir: (f: File) => Promise<unknown>
  quitar: (evidenciaId: string) => Promise<unknown>
  descargar: (evidenciaId: string, nombre: string) => Promise<unknown>
  puedeEditar: boolean
  queryKey: unknown[]
}) {
  const { message } = App.useApp()
  const { data, isFetching, refetch } = useQuery({ queryKey, queryFn: listar })

  const mSubir = useMutation({
    mutationFn: (f: File) => subir(f),
    onSuccess: () => {
      message.success('Evidencia subida')
      void refetch()
    },
    onError: (e) => message.error(mensajeDeError(e)),
  })
  const mQuitar = useMutation({
    mutationFn: (evId: string) => quitar(evId),
    onSuccess: () => void refetch(),
    onError: (e) => message.error(mensajeDeError(e)),
  })

  return (
    <>
      {puedeEditar && (
        <Upload.Dragger
          multiple={false}
          showUploadList={false}
          beforeUpload={(file) => {
            mSubir.mutate(file as File)
            return false
          }}
          style={{ marginBottom: 16 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Arrastra una evidencia o haz clic</p>
          <p className="ant-upload-hint">PDF, Word, Excel, imagen o texto. Máx. 25 MB.</p>
        </Upload.Dragger>
      )}
      <List
        loading={isFetching}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin evidencias" /> }}
        dataSource={data}
        renderItem={(ev) => (
          <List.Item
            actions={[
              <Button
                key="d"
                type="text"
                icon={<DownloadOutlined />}
                onClick={async () => {
                  try {
                    await descargar(ev.id, ev.nombreOriginal)
                  } catch {
                    message.error('No se pudo descargar')
                  }
                }}
              />,
              ...(puedeEditar ? [<Button key="x" type="text" danger icon={<DeleteOutlined />} onClick={() => mQuitar.mutate(ev.id)} />] : []),
            ]}
          >
            <List.Item.Meta
              title={ev.nombreOriginal}
              description={
                <Space size={8} wrap>
                  <Text type="secondary">{tamanoLegible(ev.tamanoBytes)}</Text>
                  <Text type="secondary">·</Text>
                  <Text type="secondary">{ev.subidoPor?.nombre ?? '—'}</Text>
                  <Text type="secondary">{dayjs(ev.subidoAt).format('DD/MM/YYYY')}</Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </>
  )
}
