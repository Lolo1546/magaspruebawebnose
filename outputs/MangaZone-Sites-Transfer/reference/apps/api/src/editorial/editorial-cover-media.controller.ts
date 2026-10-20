import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard.js';
import type { OptionalAuthenticatedRequest } from '../auth/types/optional-authenticated-request.js';
import { EditorialCoverMediaService } from './editorial-cover-media.service.js';

@Controller('media/mangas')
@UseGuards(OptionalSessionGuard)
export class EditorialCoverMediaController {
  constructor(private readonly media: EditorialCoverMediaService) {}

  @Get(':id/cover')
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  @Redirect('', 302)
  async cover(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: OptionalAuthenticatedRequest,
  ) {
    return { url: await this.media.resolve(id, request.auth?.userId) };
  }
}
