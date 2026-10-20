import { IsUUID } from 'class-validator';

export class RemoveEditorialProjectGroupDto {}

export class CreateEditorialProjectDto {
  @IsUUID('7')
  mangaId!: string;

  @IsUUID('7')
  initialGroupId!: string;
}

export class AddEditorialProjectGroupDto {
  @IsUUID('7')
  groupId!: string;
}

export class EditorialProjectParamsDto {
  @IsUUID('7')
  id!: string;
}

export class EditorialProjectGroupParamsDto extends EditorialProjectParamsDto {
  @IsUUID('7')
  groupId!: string;
}
