
import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChiefDto } from './dto/create-chief.dto';
import { UpdateChiefDto } from './dto/update-chief.dto';
import { Chief } from './entities/chief.entity';

@Injectable()
export class ChiefsService {
    constructor(
        @InjectRepository(Chief)
        private readonly chiefRepository: Repository<Chief>,
    ) { }

    async create(createChiefDto: CreateChiefDto) {
        try {
            const chief = this.chiefRepository.create(createChiefDto);
            return await this.chiefRepository.save(chief);
        } catch (error) {
            if (error.code === '23505') {
                throw new ConflictException(`El jefe con cédula ${createChiefDto.cedula} ya existe`);
            }
            throw new InternalServerErrorException('Error al crear el jefe');
        }
    }

    findAll() {
        return this.chiefRepository.find({
            order: { created_at: 'DESC' },
            relations: ['leaders']
        });
    }

    findOne(id: string) {
        return this.chiefRepository.findOne({
            where: { id },
            relations: ['leaders']
        });
    }

    async update(id: string, updateChiefDto: UpdateChiefDto) {
        await this.chiefRepository.update(id, updateChiefDto);
        return this.findOne(id);
    }

    async getChiefsStats() {
        const stats = await this.chiefRepository.createQueryBuilder('chief')
            .leftJoin('chief.leaders', 'leader')
            .leftJoin('leader.voters', 'voter')
            .select([
                'chief.id as id',
                'chief.nombre as nombre',
                'chief.cedula as cedula',
                'COUNT(DISTINCT leader.id) as totalLeaders',
                'COUNT(DISTINCT voter.id) as totalVoters'
            ])
            .groupBy('chief.id')
            .getRawMany();

        return stats.map(s => ({
            ...s,
            totalLeaders: parseInt(s.totalleaders || s.totalLeaders || '0'),
            totalVoters: parseInt(s.totalvoters || s.totalVoters || '0')
        }));
    }

    remove(id: string) {
        return this.chiefRepository.delete(id);
    }
}
