import PDFDocument from 'pdfkit';
import type { DashboardService } from '../dashboard/dashboard.service';

type ResumenDashboard = Awaited<ReturnType<DashboardService['resumen']>>;

const AZUL = '#00629b';
const AZUL_OSCURO = '#012a44';
const GRIS = '#595959';
const GRIS_CLARO = '#d9d9d9';

const NIVEL_COLOR: Record<string, string> = { URGENTE: '#cf1322', AVISO: '#d48806', INFO: '#1677ff' };

type Ejecutivo = ResumenDashboard & { organizacion: string };

/** Genera el informe ejecutivo de calidad en PDF, con membrete institucional. */
export function generarInformePdf(data: Ejecutivo): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, info: { Title: 'Informe ejecutivo de calidad', Author: 'Calidad 360 Hospitalaria' } });
  const anchoUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  membrete(doc, data, anchoUtil);

  seccion(doc, '1. Indicadores de desempeño (KPI)', anchoUtil, [
    ['Indicadores activos', data.indicadores.total],
    ['Con medición registrada', data.indicadores.conMedicion],
    ['Cumplimiento general', data.indicadores.cumplimientoPct == null ? '—' : `${data.indicadores.cumplimientoPct}%`],
    ['Dentro de meta', data.indicadores.dentroDeMeta],
    ['En alerta (amarillo)', data.indicadores.semaforo.amarillo],
    ['Fuera de meta (rojo)', data.indicadores.semaforo.rojo],
    ['Con captura pendiente', data.indicadores.capturaPendiente],
  ]);

  seccion(doc, '2. Riesgos y oportunidades', anchoUtil, [
    ['Riesgos registrados', data.riesgos.total],
    ['Nivel alto / crítico (abiertos)', data.riesgos.criticos],
    ['Críticos sin tratamiento definido', data.riesgos.criticosSinTratamiento],
    ['Con revisión vencida', data.riesgos.revisionVencida],
    ['Bajo', data.riesgos.porCategoria.BAJO],
    ['Medio', data.riesgos.porCategoria.MEDIO],
    ['Alto', data.riesgos.porCategoria.ALTO],
    ['Crítico', data.riesgos.porCategoria.CRITICO],
  ]);

  seccion(doc, '3. Auditorías', anchoUtil, [
    ['Auditorías del ejercicio', data.auditorias.delAnio],
    ['Planificadas (pendientes)', data.auditorias.planificadas],
    ['En curso', data.auditorias.enCurso],
    ['Ejecutadas', data.auditorias.ejecutadas],
    ['Cerradas', data.auditorias.cerradas],
    ['Cumplimiento del programa', data.auditorias.cumplimientoPrograma == null ? '—' : `${data.auditorias.cumplimientoPrograma}%`],
  ]);

  seccion(doc, '4. Hallazgos y no conformidades', anchoUtil, [
    ['Hallazgos abiertos', data.hallazgos.abiertos],
    ['No conformidades abiertas', data.hallazgos.noConformidadesAbiertas],
    ['Con compromiso vencido', data.hallazgos.vencidos],
    ['Cerrados en el ejercicio', data.hallazgos.cerradosPeriodo],
  ]);

  seccion(doc, '5. Planes de mejora y acciones', anchoUtil, [
    ['Acciones abiertas', data.acciones.abiertas],
    ['Vencidas', data.acciones.vencidas],
    ['Por vencer (7 días)', data.acciones.porVencer],
    ['Completadas por verificar', data.acciones.esperaVerificacion],
    ['Mejora continua en ejecución', data.mcc.enEjecucion],
  ]);

  seccion(doc, '6. Control documental', anchoUtil, [
    ['Documentos vigentes', data.documentos.vigentes],
    ['Con revisión vencida', data.documentos.vencidos],
    ['Por revisar en 30 días', data.documentos.porRevisar30d],
  ]);

  seccionRadar(doc, data.radar, anchoUtil);

  firmas(doc, anchoUtil);
  piePagina(doc);

  doc.end();
  return doc;
}

function membrete(doc: PDFKit.PDFDocument, data: Ejecutivo, ancho: number) {
  doc.rect(doc.page.margins.left, doc.y, ancho, 4).fill(AZUL);
  doc.moveDown(0.8);
  doc
    .fillColor(AZUL)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(data.organizacion.toUpperCase(), { characterSpacing: 1 });
  doc.moveDown(0.2);
  doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(20).text('Informe ejecutivo de calidad');
  doc.moveDown(0.15);
  doc
    .fillColor(GRIS)
    .font('Helvetica')
    .fontSize(10)
    .text(
      `Ejercicio ${data.anio} · generado el ${new Date(data.generadoAt).toLocaleString('es-HN', {
        dateStyle: 'long',
        timeStyle: 'short',
      })}`,
    );
  doc.moveDown(1);
}

function chequearSalto(doc: PDFKit.PDFDocument, alturaNecesaria: number) {
  const limite = doc.page.height - doc.page.margins.bottom;
  if (doc.y + alturaNecesaria > limite) doc.addPage();
}

function seccion(doc: PDFKit.PDFDocument, titulo: string, ancho: number, filas: [string, string | number][]) {
  chequearSalto(doc, 60);
  doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(13).text(titulo, { width: ancho });
  doc.moveDown(0.35);

  const xEtiqueta = doc.page.margins.left;
  const xValor = doc.page.margins.left + ancho * 0.62;
  const anchoValor = ancho * 0.38;

  for (const [campo, valor] of filas) {
    chequearSalto(doc, 22);
    const yFila = doc.y;
    doc.fillColor('#262626').font('Helvetica').fontSize(10.5).text(campo, xEtiqueta, yFila, { width: ancho * 0.6 });
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(String(valor), xValor, yFila, { width: anchoValor, align: 'right' });
    const yFin = doc.y + 5;
    doc
      .moveTo(xEtiqueta, yFin)
      .lineTo(xEtiqueta + ancho, yFin)
      .strokeColor(GRIS_CLARO)
      .lineWidth(0.5)
      .stroke();
    doc.y = yFin + 5;
  }
  doc.moveDown(0.6);
}

function seccionRadar(doc: PDFKit.PDFDocument, radar: Ejecutivo['radar'], ancho: number) {
  chequearSalto(doc, 40 + radar.length * 18);
  doc.fillColor(AZUL_OSCURO).font('Helvetica-Bold').fontSize(13).text('7. Radar de calidad — alertas prioritarias');
  doc.moveDown(0.35);

  if (radar.length === 0) {
    doc.fillColor(GRIS).font('Helvetica').fontSize(10.5).text('No hay alertas prioritarias en este momento.');
  } else {
    for (const a of radar) {
      const y = doc.y;
      doc
        .fillColor(NIVEL_COLOR[a.nivel] ?? GRIS)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`[${a.nivel}]`, doc.page.margins.left, y, { continued: true, width: ancho });
      doc.fillColor('#262626').font('Helvetica').fontSize(10).text(`  ${a.texto}`, { width: ancho });
      doc.moveDown(0.25);
    }
  }
  doc.moveDown(1);
}

function firmas(doc: PDFKit.PDFDocument, ancho: number) {
  chequearSalto(doc, 60);
  doc.moveDown(1.5);
  const y = doc.y;
  const mitad = ancho / 2 - 20;
  doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + mitad, y).strokeColor('#262626').lineWidth(0.7).stroke();
  doc
    .moveTo(doc.page.margins.left + ancho - mitad, y)
    .lineTo(doc.page.margins.left + ancho, y)
    .stroke();
  doc.moveDown(0.3);
  doc
    .fillColor(GRIS)
    .font('Helvetica')
    .fontSize(9.5)
    .text('Elaboró — Gestión de Calidad', doc.page.margins.left, doc.y, { width: mitad })
    .text('Revisó — Dirección', doc.page.margins.left + ancho - mitad, y + 12, { width: mitad });
}

function piePagina(doc: PDFKit.PDFDocument) {
  const paginas = doc.bufferedPageRange();
  const total = paginas.count;
  const margenInferiorOriginal = doc.page.margins.bottom;
  for (let i = 0; i < total; i++) {
    doc.switchToPage(i);
    // Baja el margen inferior a 0 momentáneamente: si no, PDFKit interpreta
    // que el texto del pie no cabe y agrega una página en blanco extra.
    doc.page.margins.bottom = 0;
    doc
      .fillColor('#8c8c8c')
      .font('Helvetica')
      .fontSize(8)
      .text(`Calidad 360 Hospitalaria · Página ${i + 1} de ${total}`, doc.page.margins.left, doc.page.height - 30, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'center',
        lineBreak: false,
      });
    doc.page.margins.bottom = margenInferiorOriginal;
  }
}
