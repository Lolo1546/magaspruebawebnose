import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Formato de correo electrónico inválido.' })
  email!: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  password!: string;
}
