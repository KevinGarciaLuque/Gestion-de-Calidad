import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { paginar, type Paginado } from '../common/dto/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import { ROL } from '../auth/rbac/permisos.catalog';
import type { ListarEncuestasQuery, ResponderEncuestaDto } from './dto/encuestas.dto';

const PROCESO_PUBLICO_SELECT = { id: true, codigo: true, nombre: true, archivadoAt: true } satisfies Prisma.ProcesoSelect;

@Injectable()
export class EncuestasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly noti: NotificacionesService,
  ) {}

  /** Datos mínimos del proceso para mostrar el título antes de llenar la encuesta pública. */
  async procesoPublico(procesoId: string) {
    const proceso = await this.prisma.proceso.findUnique({
      where: { id: procesoId },
      select: PROCESO_PUBLICO_SELECT,
    });
    if (!proceso || proceso.archivadoAt) {
      throw new NotFoundException('Esta encuesta ya no está disponible');
    }
    return { id: proceso.id, nombre: proceso.nombre };
  }

  /** Registra la respuesta pública y notifica a Calidad y al responsable del proceso. */
  async responder(procesoId: string, dto: ResponderEncuestaDto) {
    const proceso = await this.prisma.proceso.findUnique({
      where: { id: procesoId },
      select: { id: true, nombre: true, archivadoAt: true, responsableId: true },
    });
    if (!proceso || proceso.archivadoAt) {
      throw new BadRequestException('Esta encuesta ya no está disponible');
    }

    const encuesta = await this.prisma.encuestaSatisfaccion.create({
      data: {
        procesoId,
        calificacionGeneral: dto.calificacionGeneral,
        atencionPersonal: dto.atencionPersonal,
        tiempoEspera: dto.tiempoEspera,
        limpieza: dto.limpieza,
        recomendaria: dto.recomendaria ?? null,
        comentario: dto.comentario?.trim() || null,
      },
    });

    const destinatarios = [...(await this.usuariosCalidad()), ...(proceso.responsableId ? [proceso.responsableId] : [])];
    const baja = dto.calificacionGeneral <= 2;
    await this.noti.notificarVarios(destinatarios, {
      titulo: baja ? 'Encuesta con calificación baja' : 'Nueva encuesta de satisfacción',
      mensaje: `Se recibió una encuesta de satisfacción de "${proceso.nombre}" con calificación general ${dto.calificacionGeneral}/5.`,
      entidad: 'EncuestaSatisfaccion',
      entidadId: encuesta.id,
      ruta: '/encuestas',
      nivel: baja ? 'URGENTE' : 'INFO',
    });

    return { id: encuesta.id };
  }

  async listar(q: ListarEncuestasQuery): Promise<Paginado<unknown>> {
    const where: Prisma.EncuestaSatisfaccionWhereInput = {
      ...(q.procesoId ? { procesoId: q.procesoId } : {}),
      ...(q.calificacionMax ? { calificacionGeneral: { lte: q.calificacionMax } } : {}),
    };
    const [filas, total] = await this.prisma.$transaction([
      this.prisma.encuestaSatisfaccion.findMany({
        where,
        include: { proceso: { select: { id: true, codigo: true, nombre: true } } },
        orderBy: { creadoAt: 'desc' },
        skip: q.skip,
        take: q.porPagina,
      }),
      this.prisma.encuestaSatisfaccion.count({ where }),
    ]);
    return paginar(filas, total, q);
  }

  /** Resumen agregado por proceso: promedio de cada dimensión, total y última respuesta. */
  async resumen() {
    const grupos = await this.prisma.encuestaSatisfaccion.groupBy({
      by: ['procesoId'],
      _avg: { calificacionGeneral: true, atencionPersonal: true, tiempoEspera: true, limpieza: true },
      _count: { _all: true },
      _max: { creadoAt: true },
      orderBy: { _count: { procesoId: 'desc' } },
    });
    if (grupos.length === 0) return { total: 0, promedioGeneral: null, porProceso: [] };

    const procesos = await this.prisma.proceso.findMany({
      where: { id: { in: grupos.map((g) => g.procesoId) } },
      select: { id: true, codigo: true, nombre: true },
    });
    const procesoPorId = new Map(procesos.map((p) => [p.id, p]));

    const total = grupos.reduce((acc, g) => acc + g._count._all, 0);
    const sumaGeneral = grupos.reduce((acc, g) => acc + (g._avg.calificacionGeneral ?? 0) * g._count._all, 0);

    return {
      total,
      promedioGeneral: total > 0 ? Math.round((sumaGeneral / total) * 10) / 10 : null,
      porProceso: grupos.map((g) => ({
        proceso: procesoPorId.get(g.procesoId) ?? null,
        total: g._count._all,
        promedioGeneral: redondear(g._avg.calificacionGeneral),
        promedioAtencion: redondear(g._avg.atencionPersonal),
        promedioEspera: redondear(g._avg.tiempoEspera),
        promedioLimpieza: redondear(g._avg.limpieza),
        ultimaRespuestaAt: g._max.creadoAt,
      })),
    };
  }

  private async usuariosCalidad(): Promise<string[]> {
    const roles = await this.prisma.usuarioRol.findMany({
      where: {
        rolCodigo: { in: [ROL.GESTOR_CALIDAD, ROL.SUPER_ADMIN] },
        OR: [{ expiraAt: null }, { expiraAt: { gt: new Date() } }],
      },
      select: { usuarioId: true },
    });
    return [...new Set(roles.map((r) => r.usuarioId))];
  }
}

function redondear(n: number | null): number | null {
  return n == null ? null : Math.round(n * 10) / 10;
}
