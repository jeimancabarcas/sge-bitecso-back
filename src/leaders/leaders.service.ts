
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLeaderDto } from './dto/create-leader.dto';
import { UpdateLeaderDto } from './dto/update-leader.dto';
import { Leader } from './entities/leader.entity';

@Injectable()
export class LeadersService {
    constructor(
        @InjectRepository(Leader)
        private readonly leaderRepository: Repository<Leader>,
    ) { }

    create(createLeaderDto: CreateLeaderDto) {
        const leader = this.leaderRepository.create(createLeaderDto);
        return this.leaderRepository.save(leader);
    }

    findAll() {
        return this.leaderRepository.find({ order: { created_at: 'DESC' } });
    }

    findOne(id: string) {
        return this.leaderRepository.findOneBy({ id });
    }

    async update(id: string, updateLeaderDto: UpdateLeaderDto) {
        await this.leaderRepository.update(id, updateLeaderDto);
        return this.findOne(id);
    }

    remove(id: string) {
        return this.leaderRepository.delete(id);
    }
}
