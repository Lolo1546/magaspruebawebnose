import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

const usernamePattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-])*[a-zA-Z0-9]$/;
function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AdminMutationReasonDto {
  @Transform(trimString)
  @IsString()
  @Length(1, 2000)
  reason!: string;
}

export class AdminUserMutationParamsDto {
  @Transform(trimString)
  @IsString()
  @Matches(usernamePattern)
  username!: string;
}

export class AdminRoleMutationParamsDto extends AdminUserMutationParamsDto {
  @IsString()
  role!: string;
}

export class AdminPermissionMutationParamsDto extends AdminUserMutationParamsDto {
  @IsString()
  permission!: string;
}
