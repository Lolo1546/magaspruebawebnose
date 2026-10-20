import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddListItemDto {
  @IsUUID('7')
  @IsNotEmpty()
  mangaId!: string;
}
