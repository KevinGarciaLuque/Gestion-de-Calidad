import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  EstadoAccion,
  OrigenAccion,
  PrioridadHallazgo,
  TipoAccion,
} from '@prisma/client';
import { PaginacionQuery } from '../../common/dto/paginacion';

export class ListarAccionesQuery extends PaginacionQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(TipoAccion) tipo?: TipoAccion;
  @IsOptional() @IsEnum(EstadoAccion) estado?: EstadoAccion;
  @IsOptional() @IsEnum(OrigenAccion) origen?: OrigenAccion;
  @IsOptional() @IsString() hallazgoId?: string;
  @IsOptional() @IsString() riesgoId?: string;
  @IsOptional() @IsString() mccId?: string;
  @IsOptional() @Type(() => Boolean) mias?: boolean;
  @IsOptional() @Type(() => Boolean) abiertas?: boolean;
  @IsOptional() @Type(() => Boolean) vencidas?: boolean;
}

export class CrearAccionDto {
  @IsEnum(TipoAccion) tipo!: TipoAccion;

  @IsString() @MinLength(5) @MaxLength(2000) descripcion!: string;

  @IsOptional() @IsString() @MaxLength(1000) resultadoEsperado?: string;

  @IsEnum(OrigenAccion) origen!: OrigenAccion;
  @IsOptional() @IsString() @MaxLength(300) origenLibre?: string;
  @IsOptional() @IsString() hallazgoId?: string;
  @IsOptional() @IsString() riesgoId?: string;
  @IsOptional() @IsString() medicionId?: string;
  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @IsString() mccId?: string;

  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsISO8601() fechaInicio?: string;
  @IsOptional() @IsISO8601() fechaCompromiso?: string;
  @IsOptional() @IsEnum(PrioridadHallazgo) prioridad?: PrioridadHallazgo;
  @IsOptional() @IsString() @MaxLength(1000) evidenciaRequerida?: string;

  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) colaboradoresIds?: string[];
}

export class EditarAccionDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsString() @MaxLength(1000) resultadoEsperado?: string | null;
  @IsOptional() @IsString() responsableId?: string | null;
  @IsOptional() @IsISO8601() fechaInicio?: string | null;
  @IsOptional() @IsISO8601() fechaCompromiso?: string | null;
  @IsOptional() @IsEnum(PrioridadHallazgo) prioridad?: PrioridadHallazgo;
  @IsOptional() @IsString() @MaxLength(1000) evidenciaRequerida?: string | null;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) colaboradoresIds?: string[];
}

export class AvanceDto {
  @IsInt() @Min(0) @Max(100) avance!: number;
  @IsOptional() @IsString() @MaxLength(2000) comentario?: string;
}

export class VerificarAccionDto {
  @IsBoolean() eficaz!: boolean;
  @IsString() @MinLength(3) @MaxLength(3000) verificacionEficacia!: string;
}

export class CancelarAccionDto {
  @IsString() @MinLength(3) @MaxLength(1000) motivo!: string;
}
