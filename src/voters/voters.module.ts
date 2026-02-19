
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
import { BullModule } from '@nestjs/bullmq';
import { VotersProcessor } from './processors/voters.processor';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
    imports: [
        TypeOrmModule.forFeature([Voter, VerificationLog, VoterDetail]),
        ScraperModule,
        UsersModule,
        LeadersModule,
        BullModule.registerQueue({
            name: 'voter-verification',
        }),
        BullBoardModule.forFeature({
            name: 'voter-verification',
            adapter: BullMQAdapter,
        }),
    ],
    controllers: [VotersController],
    providers: [VotersService, VotersProcessor],
})
export class VotersModule { }
