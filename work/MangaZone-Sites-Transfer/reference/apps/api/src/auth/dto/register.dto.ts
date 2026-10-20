import { IsEmail, IsString, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9](?:[a-zA-Z0-9._-])*[a-zA-Z0-9]$/, {
    message: 'Formato de nombre de usuario inválido.',
  })
  username!: string;

  @IsEmail({}, { message: 'Formato de correo electrónico inválido.' })
  email!: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
  password!: string;
}
