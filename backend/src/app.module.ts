import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { TeamsModule } from './modules/teams/teams.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SkillsModule } from './modules/skills/skills.module';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ReferencesModule } from './modules/references/references.module';
import { FrameworksModule } from './modules/frameworks/frameworks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    TeamsModule,
    CustomersModule,
    SkillsModule,
    InteractionsModule,
    DocumentsModule,
    ReferencesModule,
    FrameworksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
