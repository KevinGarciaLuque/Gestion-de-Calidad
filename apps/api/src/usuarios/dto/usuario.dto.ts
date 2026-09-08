import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TipoAlcance } from '@prisma/client';
import { PaginacionQuery } from '../../common/dto/paginacion';

export class ListarUsuariosQuery extends PaginacionQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  activo?: boolean;
}

export class CrearUsuarioDto {
  @IsEmail({}, { message: 'Correo no válido' })
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre!: string;

  /** Si se omite, se genera una contraseña temporal y se fuerza el cambio. */
  @IsOptional()
  @IsString()
  @MinLength(10)
  password?: string;
}

export class EditarUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nombre?: string;
}

export class AsignarRolDto {
  @IsString()
  rolCodigo!: string;

  @IsEnum(TipoAlcance)
  tipoAlcance!: TipoAlcance;

  @IsOptional()
  @IsString()
  unidadId?: string;

  @IsOptional()
  @IsISO8601()
  expiraAt?: string;
}
