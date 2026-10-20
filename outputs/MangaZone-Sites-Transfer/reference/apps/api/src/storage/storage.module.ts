import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ObjectStorage } from './object-storage.port.js';
import { S3ObjectStorage } from './s3-object-storage.js';

@Module({
  imports: [ConfigModule],
  providers: [{ provide: ObjectStorage, useClass: S3ObjectStorage }],
  exports: [ObjectStorage],
})
export class StorageModule {}
