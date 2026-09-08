import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginacionQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  porPagina = 20;

  get skip(): number {
    return (this.pagina - 1) * this.porPagina;
  }
}

export interface Paginado<T> {
  datos: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export function paginar<T>(datos: T[], total: number, q: PaginacionQuery): Paginado<T> {
  return { datos, total, pagina: q.pagina, porPagina: q.porPagina };
}
