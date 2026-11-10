import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginacionQuery } from '../../common/dto/paginacion';

export class ResponderEncuestaDto {
  @IsInt() @Min(1) @Max(5) calificacionGeneral!: number;
  @IsInt() @Min(1) @Max(5) atencionPersonal!: number;
  @IsInt() @Min(1) @Max(5) tiempoEspera!: number;
  @IsInt() @Min(1) @Max(5) limpieza!: number;
  @IsOptional() @IsBoolean() recomendaria?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) comentario?: string;
}

export class ListarEncuestasQuery extends PaginacionQuery {
  @IsOptional() @IsString() procesoId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) calificacionMax?: number;
}
