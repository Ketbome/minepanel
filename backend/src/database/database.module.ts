import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabasePersistenceService } from './database-persistence.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { path } = configService.get('database');
        return {
          type: 'sqljs',
          location: path,
          autoSave: false,
          synchronize: true,
          autoLoadEntities: true,
          entities: ['dist/**/*.entity{.ts,.js}'],
        };
      },
    }),
  ],
  providers: [DatabasePersistenceService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
