import {
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PublishedPageMediaService } from './published-page-media.service.js';

@Controller('media/releases')
export class PublishedPageMediaController {
  constructor(private readonly media: PublishedPageMediaService) {}

  @Get(':releaseId/pages/:pageId')
  @HttpCode(302)
  @Header('Cache-Control', 'private, no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Header('X-Content-Type-Options', 'nosniff')
  async page(
    @Param('releaseId', new ParseUUIDPipe()) releaseId: string,
    @Param('pageId', new ParseUUIDPipe()) pageId: string,
    @Res({ passthrough: true }) response: Pick<Response, 'setHeader'>,
  ) {
    response.setHeader('Location', await this.media.resolve(releaseId, pageId));
  }
}
