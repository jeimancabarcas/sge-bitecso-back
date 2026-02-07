
import { Module } from '@nestjs/common';
import { VotersController } from './voters.controller';
import { ScraperModule } from '../scraper/scraper.module';

@Module({
    imports: [ScraperModule],
    controllers: [VotersController],
})
export class VotersModule { }
