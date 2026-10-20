import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: 'Formato de token inválido.',
  })
  token!: string;

  @IsString()
  @IsNotEmpty()
  @Length(15, 128)
  newPassword!: string;
}
