import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ambitoDe, type UsuarioActual } from './usuario-actual';

/**
 * Traduce los alcances (global / unidad / proceso) de un usuario a filtros y
 * verificaciones concretas para el módulo de procesos.
 */
@Injectable()
export class AlcanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Expande una lista de unidades a sí mismas + todas sus descendientes. */
  private async conDescendientes(unidadIds: string[]): Promise<Set<string>> {
    const resultado = new Set(unidadIds);
    if (unidadIds.length === 0) return resultado;

    let frontera = unidadIds;
    // La organización de un hospital es poco profunda; iterar por niveles basta.
    for (let i = 0; i < 20 && frontera.length > 0; i++) {
      const hijos = await this.prisma.unidadOrganizativa.findMany({
        where: { padreId: { in: frontera } },
        select: { id: true },
      });
      frontera = hijos.map((h) => h.id).filter((id) => !resultado.has(id));
      for (const id of frontera) resultado.add(id);
    }
    return resultado;
  }

  /**
   * Filtro Prisma para listar los procesos que el usuario puede ver con el
   * permiso indicado. `undefined` = sin restricción (global / super admin).
   */
  async filtroProcesos(
    usuario: UsuarioActual,
    permiso: string,
  ): Promise<{ OR: unknown[] } | undefined> {
    const ambito = ambitoDe(usuario, permiso);
    if (ambito.global) return undefined;

    const unidades = [...(await this.conDescendientes(ambito.unidadIds))];
    const or: unknown[] = [
      { responsableId: usuario.id },
      { suplenteId: usuario.id },
    ];
    if (unidades.length) or.push({ areaId: { in: unidades } });
    if (ambito.procesoIds.length) or.push({ id: { in: ambito.procesoIds } });
    return { OR: or };
  }

  /** ¿El usuario tiene `permiso` sobre este proceso concreto? */
  async puedeSobreProceso(
    usuario: UsuarioActual,
    permiso: string,
    proceso: { id: string; areaId: string | null; responsableId: string | null; suplenteId: string | null },
  ): Promise<boolean> {
    const ambito = ambitoDe(usuario, permiso);
    if (ambito.global) return true;
    if (proceso.responsableId === usuario.id || proceso.suplenteId === usuario.id) {
      // El responsable/suplente necesita además tener el permiso en algún rol.
      return usuario.permisos.includes(permiso);
    }
    if (ambito.procesoIds.includes(proceso.id)) return true;
    if (proceso.areaId) {
      const unidades = await this.conDescendientes(ambito.unidadIds);
      if (unidades.has(proceso.areaId)) return true;
    }
    return false;
  }
}
