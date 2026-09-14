import { gzipSync } from 'node:zlib';
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Readable } from 'node:stream';
import { PrismaService } from '../prisma/prisma.service';
import { BitacoraService } from '../common/bitacora/bitacora.service';

export interface RespaldoInfo {
  nombre: string;
  tamanoBytes: number;
  creadoAt: string;
}

const PREFIJO = 'calidad360-backup-';

@Injectable()
export class RespaldosService {
  private readonly logger = new Logger(RespaldosService.name);
  private readonly dir: string;
  private readonly retener: number;
  private ejecutando = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    config: ConfigService,
  ) {
    this.dir = config.get<string>('backupsDir')!;
    this.retener = config.get<number>('backupsRetener')!;
  }

  /** Nombres de todos los modelos de Prisma disponibles en el cliente generado. */
  private modelos(): string[] {
    const cliente = this.prisma as unknown as Record<string, { findMany?: unknown }>;
    return Object.keys(cliente).filter((k) => {
      if (k.startsWith('_') || k.startsWith('$') || k === 'constructor') return false;
      return typeof cliente[k]?.findMany === 'function';
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'respaldo-diario' })
  async respaldoDiario(): Promise<void> {
    try {
      await this.crear(false);
    } catch (e) {
      this.logger.error(`Respaldo diario falló: ${(e as Error).message}`);
    }
  }

  /** Exporta todas las tablas a un único archivo JSON comprimido. */
  async crear(manual: boolean, actor?: { id: string; email: string }): Promise<RespaldoInfo> {
    if (this.ejecutando) throw new BadRequestException('Ya hay un respaldo en curso; intenta en un momento.');
    this.ejecutando = true;
    const inicio = Date.now();

    try {
      await mkdir(this.dir, { recursive: true });

      const modelos = this.modelos();
      const datos: Record<string, unknown> = {
        generadoAt: new Date().toISOString(),
        version: 1,
        tablas: {} as Record<string, unknown[]>,
      };
      const tablas = datos.tablas as Record<string, unknown[]>;

      for (const modelo of modelos) {
        const cliente = this.prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>;
        tablas[modelo] = await cliente[modelo].findMany();
      }

      const json = JSON.stringify(datos);
      const comprimido = gzipSync(Buffer.from(json, 'utf-8'));

      const marca = new Date().toISOString().replace(/[:.]/g, '-');
      const nombre = `${PREFIJO}${marca}.json.gz`;
      const ruta = join(this.dir, nombre);
      await writeFile(ruta, comprimido);

      await this.limpiarAntiguos();

      const info: RespaldoInfo = { nombre, tamanoBytes: comprimido.length, creadoAt: new Date().toISOString() };
      this.logger.log(
        `Respaldo generado: ${nombre} (${(comprimido.length / 1024 / 1024).toFixed(2)} MB, ${modelos.length} tablas, ${Date.now() - inicio} ms)`,
      );
      await this.bitacora.registrar({
        accion: manual ? 'respaldo.crear_manual' : 'respaldo.crear_automatico',
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        entidad: 'Respaldo',
        entidadId: nombre,
        valorNuevo: { tamanoBytes: info.tamanoBytes, tablas: modelos.length },
      });
      return info;
    } finally {
      this.ejecutando = false;
    }
  }

  async listar(): Promise<RespaldoInfo[]> {
    await mkdir(this.dir, { recursive: true });
    const archivos = (await readdir(this.dir)).filter((f) => f.startsWith(PREFIJO));
    const info = await Promise.all(
      archivos.map(async (nombre) => {
        const s = await stat(join(this.dir, nombre));
        return { nombre, tamanoBytes: s.size, creadoAt: s.mtime.toISOString() };
      }),
    );
    return info.sort((a, b) => b.creadoAt.localeCompare(a.creadoAt));
  }

  async archivoParaDescarga(nombre: string): Promise<{ stream: Readable; tamano: number }> {
    if (!nombre.startsWith(PREFIJO) || nombre.includes('..') || nombre.includes('/') || nombre.includes('\\')) {
      throw new BadRequestException('Nombre de respaldo no válido');
    }
    const ruta = join(this.dir, nombre);
    try {
      const s = await stat(ruta);
      return { stream: createReadStream(ruta), tamano: s.size };
    } catch {
      throw new NotFoundException('Respaldo no encontrado');
    }
  }

  private async limpiarAntiguos(): Promise<void> {
    const existentes = await this.listar();
    const sobrantes = existentes.slice(this.retener);
    for (const r of sobrantes) {
      await unlink(join(this.dir, r.nombre)).catch(() => {});
    }
  }
}
