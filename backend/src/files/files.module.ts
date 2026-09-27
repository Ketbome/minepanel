import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import * as path from 'path';
import { FilesController } from './files.controller';
import { FilesService, UPLOADS_DIR } from './files.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
    // Uploads stream to disk instead of memory, so size is bounded by the disk and not
    // the backend's RAM. The staging folder sits next to the servers so the final move
    // is a rename; multer deletes a partial file when the request is aborted.
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({ dest: path.join(configService.get('serversDir'), UPLOADS_DIR) }),
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
