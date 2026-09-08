import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EstadoProceso, TipoProceso, TipoRelacionProceso } from '@prisma/client';
import { PaginacionQuery } from '../../common/dto/paginacion';

export class ListarProcesosQuery extends PaginacionQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(TipoProceso) tipo?: TipoProceso;
  @IsOptional() @IsEnum(EstadoProceso) estado?: EstadoProceso;
  @IsOptional() @IsString() areaId?: string;
}

export class CrearProcesoDto {
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/, { message: 'Código no válido (ej. PR-CAL-001)' })
  codigo!: string;

  @IsString() @MinLength(3) @MaxLength(160)
  nombre!: string;

  @IsEnum(TipoProceso)
  tipo!: TipoProceso;

  @IsString() @MinLength(3) @MaxLength(1000)
  objetivo!: string;

  @IsOptional() @IsString() areaId?: string;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsString() suplenteId?: string;
}

export class EditarProcesoDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160) nombre?: string;
  @IsOptional() @IsEnum(TipoProceso) tipo?: TipoProceso;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(1000) objetivo?: string;
  @IsOptional() @IsString() areaId?: string | null;
  @IsOptional() @IsString() responsableId?: string | null;
  @IsOptional() @IsString() suplenteId?: string | null;
}

export class RevisionDto {
  @IsOptional() @IsString() @MaxLength(1000) comentario?: string;
}

export class AprobarDto {
  @IsOptional() @IsString() @MaxLength(1000) comentario?: string;
  @IsOptional() @IsInt() @Min(1) mesesProximaRevision?: number;
}

export class CrearRelacionDto {
  @IsString() destinoId!: string;
  @IsEnum(TipoRelacionProceso) tipo!: TipoRelacionProceso;
  @IsOptional() @IsString() @MaxLength(500) descripcion?: string;
}
