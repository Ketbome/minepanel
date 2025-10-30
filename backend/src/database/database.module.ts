import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

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
          autoSave: true,
          synchronize: true,
          autoLoadEntities: true,
          entities: ['dist/**/*.entity{.ts,.js}'],
        };
      },
    }),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
