import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VotersModule } from './voters/voters.module';
import { ScraperModule } from './scraper/scraper.module';

@Module({
  imports: [VotersModule, ScraperModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
