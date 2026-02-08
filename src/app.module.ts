import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VotersModule } from './voters/voters.module';
import { ScraperModule } from './scraper/scraper.module';
import { LeadersModule } from './leaders/leaders.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChiefsModule } from './chiefs/chiefs.module';

import { ScheduleModule } from '@nestjs/schedule';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA || 'public',
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      autoLoadEntities: true,
      synchronize: true, // DEV ONLY
    }),
    VotersModule,
    ScraperModule,
    LeadersModule,
    AuthModule,
    UsersModule,
    ChiefsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

