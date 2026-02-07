
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VotersService } from './voters.service';
import { VotersController } from './voters.controller';
import { Voter } from './entities/voter.entity';
import { VerificationLog } from './entities/verification-log.entity';
import { ScraperModule } from '../scraper/scraper.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Voter, VerificationLog]),
        ScraperModule,
    ],
    controllers: [VotersController],
    providers: [VotersService],
})
export class VotersModule { }
