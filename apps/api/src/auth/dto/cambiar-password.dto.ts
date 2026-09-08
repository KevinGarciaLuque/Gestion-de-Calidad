import { IsString, Matches, MinLength } from 'class-validator';

export class CambiarPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Ingresa tu contraseña actual' })
  passwordActual!: string;

  @IsString()
  @MinLength(10, { message: 'La nueva contraseña debe tener al menos 10 caracteres' })
  @Matches(/[a-z]/, { message: 'Debe incluir una letra minúscula' })
  @Matches(/[A-Z]/, { message: 'Debe incluir una letra mayúscula' })
  @Matches(/\d/, { message: 'Debe incluir un número' })
  passwordNueva!: string;
}
