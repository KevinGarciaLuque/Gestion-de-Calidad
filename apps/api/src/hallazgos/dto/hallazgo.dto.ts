import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ClasificacionHallazgo,
  EstadoHallazgo,
  OrigenHallazgo,
  PrioridadHallazgo,
} from '@prisma/client';
import { PaginacionQuery } from '../../common/dto/paginacion';

export class ListarHallazgosQuery extends PaginacionQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(OrigenHallazgo) origen?: OrigenHallazgo;
  @IsOptional() @IsEnum(ClasificacionHallazgo) clasificacion?: ClasificacionHallazgo;
  @IsOptional() @IsEnum(EstadoHallazgo) estado?: EstadoHallazgo;
  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @IsString() auditoriaId?: string;
  @IsOptional() @Type(() => Boolean) abiertos?: boolean;
}

export class CrearHallazgoDto {
  @IsOptional() @IsString() @MaxLength(30) codigo?: string;
  @IsEnum(OrigenHallazgo) origen!: OrigenHallazgo;
  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @IsString() areaId?: string;
  @IsString() @MinLength(5) @MaxLength(2000) descripcion!: string;
  @IsEnum(ClasificacionHallazgo) clasificacion!: ClasificacionHallazgo;
  @IsOptional() @IsString() @MaxLength(200) requisito?: string;
  @IsOptional() @IsString() @MaxLength(2000) evidencia?: string;
  @IsOptional() @IsString() responsableId?: string;
  @IsOptional() @IsISO8601() fechaCompromiso?: string;
  @IsOptional() @IsEnum(PrioridadHallazgo) prioridad?: PrioridadHallazgo;
}

export class EditarHallazgoDto {
  @IsOptional() @IsString() @MinLength(5) @MaxLength(2000) descripcion?: string;
  @IsOptional() @IsEnum(ClasificacionHallazgo) clasificacion?: ClasificacionHallazgo;
  @IsOptional() @IsString() @MaxLength(200) requisito?: string | null;
  @IsOptional() @IsEnum(PrioridadHallazgo) prioridad?: PrioridadHallazgo;
  @IsOptional() @IsString() responsableId?: string | null;
  @IsOptional() @IsISO8601() fechaCompromiso?: string | null;
  @IsOptional() @IsEnum(EstadoHallazgo) estado?: EstadoHallazgo;
}
