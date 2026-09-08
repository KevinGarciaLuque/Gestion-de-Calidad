import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ClasificacionHallazgo,
  EstadoAuditoria,
  PrioridadHallazgo,
  ResultadoItem,
  TipoAuditoria,
} from '@prisma/client';
import { PaginacionQuery } from '../../common/dto/paginacion';

export class ListarAuditoriasQuery extends PaginacionQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Type(() => Number) @IsInt() anio?: number;
  @IsOptional() @IsEnum(EstadoAuditoria) estado?: EstadoAuditoria;
  @IsOptional() @IsString() procesoId?: string;
}

export class CrearProgramaDto {
  @IsInt() @Min(2000) @Max(2100)
  anio!: number;

  @IsString() @MinLength(3) @MaxLength(160)
  nombre!: string;

  @IsOptional() @IsString() @MaxLength(2000)
  objetivo?: string;
}

export class EditarProgramaDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) nombre?: string;
  @IsOptional() @IsString() @MaxLength(2000) objetivo?: string;
}

export class CrearAuditoriaDto {
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-/]{1,29}$/, { message: 'Código no válido (ej. AUD-2026-01)' })
  codigo!: string;

  @IsOptional() @IsString() programaId?: string;
  @IsEnum(TipoAuditoria) tipo!: TipoAuditoria;
  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @IsString() areaId?: string;

  @IsString() @MinLength(3) @MaxLength(1000) objetivo!: string;
  @IsString() @MinLength(3) @MaxLength(1000) alcance!: string;
  @IsString() @MinLength(3) @MaxLength(1000) criterios!: string;

  @IsOptional() @IsString() auditorLiderId?: string;

  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true })
  equipoIds?: string[];

  @IsISO8601() fechaPlanificada!: string;
}

export class EditarAuditoriaDto {
  @IsOptional() @IsEnum(TipoAuditoria) tipo?: TipoAuditoria;
  @IsOptional() @IsString() procesoId?: string | null;
  @IsOptional() @IsString() areaId?: string | null;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(1000) objetivo?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(1000) alcance?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(1000) criterios?: string;
  @IsOptional() @IsString() auditorLiderId?: string | null;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) equipoIds?: string[];
}

export class ReprogramarDto {
  @IsISO8601() fechaNueva!: string;
  @IsString() @MinLength(3) @MaxLength(500) motivo!: string;
}

export class CancelarDto {
  @IsString() @MinLength(3) @MaxLength(500) motivo!: string;
}

export class ItemChecklistDto {
  @IsString() @MinLength(3) @MaxLength(1000) criterio!: string;
  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @IsInt() orden?: number;
}

export class ResultadoItemDto {
  @IsEnum(ResultadoItem) resultado!: ResultadoItem;
  @IsOptional() @IsString() @MaxLength(3000) notas?: string;
}

export class GenerarHallazgoDto {
  @IsEnum(ClasificacionHallazgo) clasificacion!: ClasificacionHallazgo;
  @IsOptional() @IsString() @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsString() @MaxLength(200) requisito?: string;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsISO8601() fechaCompromiso?: string;
  @IsOptional() @IsEnum(PrioridadHallazgo) prioridad?: PrioridadHallazgo;
}

export class InformeDto {
  @IsOptional() @IsString() @MaxLength(6000) resumen?: string;
  @IsOptional() @IsString() @MaxLength(6000) conclusiones?: string;
}
