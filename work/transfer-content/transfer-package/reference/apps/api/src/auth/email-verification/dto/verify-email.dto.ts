import {
  IsString,
  IsNotEmpty,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isNotWhitespaceOnly', async: false })
class IsNotWhitespaceOnlyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return value.trim().length > 0;
  }

  defaultMessage() {
    return 'token no puede estar vacío ni contener solo espacios en blanco';
  }
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Validate(IsNotWhitespaceOnlyConstraint)
  token: string;
}
