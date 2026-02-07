
import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
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

    async create(createLeaderDto: CreateLeaderDto) {
        try {
            const leader = this.leaderRepository.create(createLeaderDto);
            return await this.leaderRepository.save(leader);
        } catch (error) {
            if (error.code === '23505') {
                throw new ConflictException(`El líder con cédula ${createLeaderDto.cedula} ya existe`);
            }
            throw new InternalServerErrorException('Error al crear el líder');
        }
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
