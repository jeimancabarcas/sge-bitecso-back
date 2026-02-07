
import { Injectable, Logger, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { Voter } from './entities/voter.entity';
import { VerificationLog } from './entities/verification-log.entity';
import { ScraperService } from '../scraper/scraper.service';
import { User } from '../users/entities/user.entity';

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

    async create(createVoterDto: CreateVoterDto, user: User) {
        try {
            const voter = this.voterRepository.create({
                ...createVoterDto,
                created_by: { id: user.id } as User,
            });
            // If leader_id is passed, TypeORM maps it to the column.

            const savedVoter = await this.voterRepository.save(voter);
            return savedVoter;
        } catch (error) {
            if (error.code === '23505') { // Postgres unique violation code
                throw new ConflictException(`Voter with cedula ${createVoterDto.cedula} already exists`);
            }
            this.logger.error(`Error creating voter: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to create voter');
        }
    }

    async verifyVoter(id: string) {
        const voter = await this.voterRepository.findOneBy({ id });
        if (!voter) throw new Error('Voter not found');

        this.logger.log(`Verifying voter ${voter.cedula}...`);

        let result;
        try {
            result = await this.scraperService.extractVoterData(voter.cedula);
        } catch (error) {
            // ERROR: Technical failure (Captcha, Connection, Timeout)
            voter.verification_status = 'ERROR';
            await this.voterRepository.save(voter);

            await this.logRepository.save({
                voter,
                status: 'ERROR',
                message: error.message || 'Technical error during verification',
            });
            this.logger.error(`Verification ERROR for ${voter.cedula}: ${error.message}`);
            throw error;
        }

        if (result.success) {
            // SUCCESS: Voter found and data extracted
            voter.verification_status = 'SUCCESS';
            voter.registraduria_data = result.data;
            await this.voterRepository.save(voter);

            await this.logRepository.save({
                voter,
                status: 'SUCCESS',
                message: 'Data verified successfully',
            });

            this.logger.log(`Voter ${voter.cedula} verified successfully.`);
            return result.data;
        } else {
            // FAILED: Voter not found or other business logic rejection (e.g. not in census)
            voter.verification_status = 'FAILED';
            await this.voterRepository.save(voter);

            await this.logRepository.save({
                voter,
                status: 'FAILED',
                message: result.error || 'Voter not found or logic error',
            });
            this.logger.warn(`Verification FAILED for ${voter.cedula}: ${result.error}`);
            // We throw here so the controller returns an error response, but we've correctly marked it as FAILED in DB
            throw new Error(result.error);
        }
    }

    findAll() {
        return this.voterRepository.find({ order: { created_at: 'DESC' } });
    }

    async findAllByUser(userId: string, page: number = 1, limit: number = 10) {
        const [items, total] = await this.voterRepository.findAndCount({
            where: { created_by: { id: userId } },
            order: { created_at: 'DESC' },
            take: limit,
            skip: (page - 1) * limit,
            relations: ['leader']
        });

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
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
