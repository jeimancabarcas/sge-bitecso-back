
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VotersService } from './voters.service';
import { VotersController } from './voters.controller';
import { Voter } from './entities/voter.entity';
import { VerificationLog } from './entities/verification-log.entity';
import { ScraperModule } from '../scraper/scraper.module';

import { VoterDetail } from './entities/voter-detail.entity';
import { UsersModule } from '../users/users.module';
import { LeadersModule } from '../leaders/leaders.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Voter, VerificationLog, VoterDetail]),
        ScraperModule,
        UsersModule,
        LeadersModule,
    ],
    controllers: [VotersController],
    providers: [VotersService],
})
export class VotersModule { }
