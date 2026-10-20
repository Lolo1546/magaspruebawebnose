import { Module } from '@nestjs/common';
import { ClientIpService } from './client-ip.service.js';

@Module({
  providers: [ClientIpService],
  exports: [ClientIpService],
})
export class ClientIpModule {}
