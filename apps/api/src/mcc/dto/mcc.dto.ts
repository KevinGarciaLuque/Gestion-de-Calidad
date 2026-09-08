import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OrigenMCC, PrioridadHallazgo } from '@prisma/client';
import { PaginacionQuery } from '../../common/dto/paginacion';

export class ListarMCCQuery extends PaginacionQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(OrigenMCC) origen?: OrigenMCC;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @Type(() => Boolean) mios?: boolean;
}

export class CrearMCCDto {
  @IsString() @MinLength(3) @MaxLength(200) titulo!: string;
  @IsString() @MinLength(5) @MaxLength(4000) descripcion!: string;
  @IsEnum(OrigenMCC) origen!: OrigenMCC;
  @IsOptional() @IsString() @MaxLength(300) origenDetalle?: string;
  @IsOptional() @IsString() areaId?: string;
}

export class EditarMCCDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) titulo?: string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(4000) descripcion?: string;
  @IsOptional() @IsString() areaId?: string | null;
}

export class DecidirMCCDto {
  @IsBoolean() procede!: boolean;
  @IsString() @MinLength(3) @MaxLength(2000) justificacion!: string;
  @IsOptional() @IsString() @MaxLength(60) impacto?: string;
  @IsOptional() @IsEnum(PrioridadHallazgo) prioridad?: PrioridadHallazgo;
}

export class CerrarMCCDto {
  @IsString() @MinLength(3) @MaxLength(3000) evaluacionResultado!: string;
  @IsOptional() @IsString() @MaxLength(3000) aprendizaje?: string;
}

export class ComentarMCCDto {
  @IsString() @MinLength(1) @MaxLength(3000) texto!: string;
}
