
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { Voter } from './entities/voter.entity';
import { VerificationLog } from './entities/verification-log.entity';
import { ScraperService } from '../scraper/scraper.service';

@Injectable()
export class VotersService {
    private readonly logger = new Logger(VotersService.name);

    constructor(
        @InjectRepository(Voter)
        private readonly voterRepository: Repository<Voter>,
        @InjectRepository(VerificationLog)
        private readonly logRepository: Repository<VerificationLog>,
        private readonly scraperService: ScraperService,
    ) { }

    async create(createVoterDto: CreateVoterDto) {
        const voter = this.voterRepository.create(createVoterDto);
        // If leader_id is passed, TypeORM maps it to the column.

        const savedVoter = await this.voterRepository.save(voter);

        return savedVoter;
    }

    async verifyVoter(id: string) {
        const voter = await this.voterRepository.findOneBy({ id });
        if (!voter) throw new Error('Voter not found');

        this.logger.log(`Verifying voter ${voter.cedula}...`);

        try {
            const data = await this.scraperService.extractVoterData(voter.cedula);

            // Success
            voter.verification_status = 'SUCCESS';
            voter.registraduria_data = data;
            await this.voterRepository.save(voter);

            await this.logRepository.save({
                voter,
                status: 'SUCCESS',
                message: 'Data verified successfully',
            });

            this.logger.log(`Voter ${voter.cedula} verified successfully.`);
            return data;
        } catch (error) {
            // Failed
            voter.verification_status = 'FAILED';
            await this.voterRepository.save(voter);

            await this.logRepository.save({
                voter,
                status: 'FAILED',
                message: error.message || 'Unknown scraping error',
            });
            this.logger.error(`Verification failed for ${voter.cedula}: ${error.message}`);
            throw error;
        }
    }

    findAll() {
        return this.voterRepository.find({ order: { created_at: 'DESC' } });
    }

    findOne(id: string) {
        return this.voterRepository.findOne({
            where: { id },
            relations: ['verification_logs']
        });
    }

    update(id: number, updateVoterDto: UpdateVoterDto) {
        return `This action updates a #${id} voter`;
    }

    remove(id: number) {
        return `This action removes a #${id} voter`;
    }
}
