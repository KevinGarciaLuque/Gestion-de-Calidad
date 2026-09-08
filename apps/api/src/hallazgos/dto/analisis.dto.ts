import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { MetodologiaCausa } from '@prisma/client';

export class GuardarAnalisisDto {
  @IsEnum(MetodologiaCausa)
  metodologia!: MetodologiaCausa;

  /** Contenido estructurado según la metodología (validado en el servicio). */
  @IsObject()
  contenido!: Record<string, unknown>;

  @IsOptional() @IsString() @MaxLength(2000) causaInmediata?: string;
  @IsOptional() @IsString() @MaxLength(2000) causaContribuyente?: string;
  @IsOptional() @IsString() @MaxLength(2000) causaRaiz?: string;
  @IsOptional() @IsString() @MaxLength(3000) comentariosEquipo?: string;
}

export class ValidarHallazgoDto {
  @IsOptional() @IsString() @MaxLength(2000) correccionInmediata?: string;
  @IsOptional() @IsString() @MaxLength(1000) comentario?: string;
}

export class AprobarPlanDto {
  @IsOptional() @IsString() @MaxLength(1000) comentario?: string;
}

export class PlanAccionDto {
  @IsString() @MaxLength(4000) planAccion!: string;
}

export class CompletarAccionesDto {
  @IsOptional() @IsString() @MaxLength(1000) comentario?: string;
}

export class VerificarEficaciaDto {
  @IsBoolean()
  eficaciaConfirmada!: boolean;

  @IsString() @MaxLength(3000) verificacionEficacia!: string;
}

export class ReabrirDto {
  @IsString() @MaxLength(2000) motivo!: string;
}

export class ComentarioDto {
  @IsString() @MaxLength(3000) texto!: string;
}
