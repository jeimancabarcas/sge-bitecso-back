import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VotersModule } from './voters/voters.module';
import { ScraperModule } from './scraper/scraper.module';
import { LeadersModule } from './leaders/leaders.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgres://avnadmin:AVNS_2ka5WyZnY42PnThUJm2@tranquility-db-tranquility.h.aivencloud.com:10093/defaultdb',
      schema: 'sge-bitecto',
      ssl: { rejectUnauthorized: false }, // Keeping this as Aiven usually requires it.
      autoLoadEntities: true,
      synchronize: true, // DEV ONLY
    }),
    VotersModule,
    ScraperModule,
    LeadersModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
