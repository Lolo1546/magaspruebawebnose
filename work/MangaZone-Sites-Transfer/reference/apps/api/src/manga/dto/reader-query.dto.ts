import { IsOptional, IsUUID } from 'class-validator';

export class ReaderQueryDto {
  @IsOptional()
  @IsUUID('7')
  release?: string;
}
