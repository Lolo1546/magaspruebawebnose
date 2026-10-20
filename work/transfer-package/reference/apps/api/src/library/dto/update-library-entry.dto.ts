import { IsBoolean, IsDefined, IsEnum } from 'class-validator';
import { LibraryStatus } from '../../../generated/prisma/client.js';

export class UpdateLibraryEntryDto {
  @IsEnum(LibraryStatus)
  status!: LibraryStatus;

  @IsDefined()
  @IsBoolean()
  isFavorite!: boolean;
}
