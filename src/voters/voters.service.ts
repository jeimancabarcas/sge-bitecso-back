
import { Injectable, Logger, ConflictException, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { Voter } from './entities/voter.entity';
import { VerificationLog } from './entities/verification-log.entity';
import { ScraperService } from '../scraper/scraper.service';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LeadersService } from '../leaders/leaders.service';
import * as ExcelJS from 'exceljs';
import type { Response } from 'express';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class VotersService {
    private readonly logger = new Logger(VotersService.name);

    async handleCron() {
        return this.triggerManualVerification();
    }

    async triggerManualVerification() {
        this.logger.debug('Iniciando procesamiento de votantes pendientes/error...');

        // Primero buscamos los PENDING
        let voter = await this.voterRepository.findOne({
            where: { verification_status: 'PENDING' },
            order: { created_at: 'ASC' },
        });

        // Si no hay PENDING, buscamos en estado ERROR para reintentar
        if (!voter) {
            this.logger.debug('No hay votantes pendientes. Buscando votantes en ERROR para reintentar...');
            voter = await this.voterRepository.findOne({
                where: { verification_status: 'ERROR' },
                order: { created_at: 'ASC' },
            });
        }

        if (voter) {
            const statusLabel = voter.verification_status === 'PENDING' ? 'pendiente' : 'en error (reintento)';
            this.logger.log(`Iniciando verificación manual/cron para votante ${voter.cedula} (${statusLabel}).`);
            try {
                const result = await this.verifyVoter(voter.id);
                return {
                    message: `Procesamiento completado para cédula ${voter.cedula}`,
                    voter: voter.cedula,
                    status: 'SUCCESS',
                    data: result
                };
            } catch (error) {
                this.logger.error(`Falló la verificación para ${voter.cedula}`, error.stack);
                return {
                    message: `Error al procesar cédula ${voter.cedula}: ${error.message}`,
                    voter: voter.cedula,
                    status: 'FAILED'
                };
            }
        } else {
            this.logger.debug('No hay votantes para procesar.');
            return { message: 'No hay votantes pendientes o en error para procesar' };
        }
    }

    constructor(
        @InjectRepository(Voter)
        private readonly voterRepository: Repository<Voter>,
        @InjectRepository(VerificationLog)
        private readonly logRepository: Repository<VerificationLog>,
        private readonly scraperService: ScraperService,
        private readonly usersService: UsersService,
        private readonly leadersService: LeadersService,
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
                const existingVoter = await this.voterRepository.findOne({
                    where: { cedula: createVoterDto.cedula },
                    relations: ['leader']
                });

                if (existingVoter?.leader) {
                    throw new ConflictException(`El votante con cédula ${createVoterDto.cedula} ya existe y pertenece al líder ${existingVoter.leader.nombre}`);
                }
                throw new ConflictException(`El votante con cédula ${createVoterDto.cedula} ya existe`);
            }
            this.logger.error(`Error creating voter: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Error al crear el votante');
        }
    }

    async verifyVoter(id: string) {
        const voter = await this.voterRepository.findOneBy({ id });
        if (!voter) throw new Error('Votante no encontrado');

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
                message: error.message || 'Error técnico durante la verificación',
            });
            this.logger.error(`Verification ERROR for ${voter.cedula}: ${error.message}`);
            throw error;
        }

        if (result.success) {
            // SUCCESS: Voter found and data extracted
            voter.verification_status = 'SUCCESS';

            // Create detail object (TypeORM cascade will save it)
            voter.detail = {
                department: result.data.department,
                municipality: result.data.municipality,
                polling_station: result.data.pollingStation,
                table: result.data.table,
                address: result.data.address
            } as any; // Cast to any to avoid partial checks if strict, or better:
            // actually 'as VoterDetail' is better but I need to import it.
            // Let's just use object and rely on TypeORM.
            // But wait, 'Voter' entity has 'detail: VoterDetail'.
            // I should import VoterDetail to be safe/clean in service? Only if I instantiate it.
            // With cascade, standard object works.
            await this.voterRepository.save(voter);

            await this.logRepository.save({
                voter,
                status: 'SUCCESS',
                message: 'Datos verificados con éxito',
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
                message: result.error || 'Votante no encontrado o error de lógica',
            });
            this.logger.warn(`Verification FAILED for ${voter.cedula}: ${result.error}`);
            // We throw here so the controller returns an error response, but we've correctly marked it as FAILED in DB
            throw new Error(result.error);
        }
    }

    async findAll(page: number = 1, limit: number = 10, search?: string, status?: string) {
        const queryBuilder = this.voterRepository.createQueryBuilder('voter')
            .leftJoinAndSelect('voter.leader', 'leader')
            .leftJoinAndSelect('voter.detail', 'detail')
            .leftJoinAndSelect('voter.verification_logs', 'logs')
            .leftJoin('voter.created_by', 'created_by')
            .addSelect(['created_by.id', 'created_by.username', 'created_by.role'])
            .orderBy('voter.created_at', 'DESC')
            .addOrderBy('logs.attempted_at', 'DESC');

        if (search) {
            queryBuilder.andWhere('(voter.cedula LIKE :search OR voter.nombre ILIKE :search)', { search: `%${search}%` });
        }

        if (status) {
            queryBuilder.andWhere('voter.verification_status = :status', { status });
        }

        const [items, total] = await queryBuilder
            .take(limit)
            .skip((page - 1) * limit)
            .getManyAndCount();

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findAllByUser(userId: string, page: number = 1, limit: number = 10, search?: string, status?: string) {
        const queryBuilder = this.voterRepository.createQueryBuilder('voter')
            .leftJoinAndSelect('voter.leader', 'leader')
            .leftJoinAndSelect('voter.detail', 'detail')
            .leftJoinAndSelect('voter.verification_logs', 'logs')
            .where('voter.created_by = :userId', { userId })
            .orderBy('voter.created_at', 'DESC')
            .addOrderBy('logs.attempted_at', 'DESC');

        if (search) {
            queryBuilder.andWhere('(voter.cedula LIKE :search OR voter.nombre ILIKE :search)', { search: `%${search}%` });
        }

        if (status) {
            queryBuilder.andWhere('voter.verification_status = :status', { status });
        }

        const [items, total] = await queryBuilder
            .take(limit)
            .skip((page - 1) * limit)
            .getManyAndCount();

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
            relations: ['verification_logs', 'detail', 'leader']
        });
    }

    async update(id: string, updateVoterDto: UpdateVoterDto, user: User) {
        const voter = await this.voterRepository.findOne({
            where: { id },
            relations: ['created_by']
        });

        if (!voter) {
            throw new NotFoundException('Votante no encontrado');
        }

        // Check ownership/permissions (Digitadores only their own)
        if (user.role === UserRole.DIGITADOR && voter.created_by?.id !== user.id) {
            throw new ForbiddenException('No tienes permiso para editar este registro');
        }

        // If cedula is being updated, check if it already exists
        if (updateVoterDto.cedula && updateVoterDto.cedula !== voter.cedula) {
            const existing = await this.voterRepository.findOne({ where: { cedula: updateVoterDto.cedula } });
            if (existing) {
                throw new ConflictException(`La cédula ${updateVoterDto.cedula} ya está registrada`);
            }
        }

        // Reset status to PENDING on every update as requested
        voter.verification_status = 'PENDING';

        Object.assign(voter, updateVoterDto);
        return this.voterRepository.save(voter);
    }

    async getDashboardStats() {
        const stats = await this.voterRepository.createQueryBuilder('voter')
            .select('voter.verification_status', 'status')
            .addSelect('COUNT(voter.id)', 'count')
            .groupBy('voter.verification_status')
            .getRawMany();

        const result = {
            total: 0,
            success: 0,
            failed: 0,
            error: 0,
            pending: 0
        };

        stats.forEach(s => {
            const count = parseInt(s.count, 10);
            result.total += count;
            const statusKey = s.status.toLowerCase();
            if (result.hasOwnProperty(statusKey)) {
                result[statusKey] = count;
            }
        });

        return result;
    }

    async getDigitatorsStats() {
        const digitators = await this.usersService.findAllByRole(UserRole.DIGITADOR);

        const rawStats = await this.voterRepository.createQueryBuilder('voter')
            .select('voter.created_by', 'userId')
            .addSelect('voter.verification_status', 'status')
            .addSelect('COUNT(voter.id)', 'count')
            .groupBy('voter.created_by')
            .addGroupBy('voter.verification_status')
            .getRawMany();

        return digitators.map(digitator => {
            const userStats = {
                id: digitator.id,
                username: digitator.username,
                total: 0,
                success: 0,
                failed: 0,
                error: 0,
                pending: 0
            };

            const userRows = rawStats.filter(row => row.userId === digitator.id);
            userRows.forEach(row => {
                const count = parseInt(row.count, 10);
                userStats.total += count;
                const statusKey = row.status.toLowerCase();
                if (userStats.hasOwnProperty(statusKey)) {
                    userStats[statusKey] = count;
                }
            });

            return userStats;
        });
    }

    async getLeadersStats() {
        const leaders = await this.leadersService.findAll();

        const rawStats = await this.voterRepository.createQueryBuilder('voter')
            .select('voter.leader_id', 'leaderId')
            .addSelect('voter.verification_status', 'status')
            .addSelect('COUNT(voter.id)', 'count')
            .where('voter.leader_id IS NOT NULL')
            .groupBy('voter.leader_id')
            .addGroupBy('voter.verification_status')
            .getRawMany();

        return leaders.map(leader => {
            const leaderStats = {
                id: leader.id,
                name: leader.nombre,
                total: 0,
                success: 0,
                failed: 0,
                error: 0,
                pending: 0
            };

            const userRows = rawStats.filter(row => row.leaderId === leader.id);
            userRows.forEach(row => {
                const count = parseInt(row.count, 10);
                leaderStats.total += count;
                const statusKey = row.status.toLowerCase();
                if (leaderStats.hasOwnProperty(statusKey)) {
                    leaderStats[statusKey] = count;
                }
            });

            return leaderStats;
        });
    }

    async generateReport(res: Response) {
        const voters = await this.voterRepository.find({
            where: [
                { verification_status: 'SUCCESS' },
                { verification_status: 'FAILED' }
            ],
            relations: ['detail', 'leader', 'leader.chief', 'created_by', 'verification_logs'],
            order: {
                created_at: 'DESC'
            }
        });

        this.logger.debug(`Generando reporte. Total votantes encontrados: ${voters.length}`);
        const statusCounts = voters.reduce((acc, v) => {
            acc[v.verification_status] = (acc[v.verification_status] || 0) + 1;
            return acc;
        }, {});
        this.logger.debug(`Breakdown de estados: ${JSON.stringify(statusCounts)}`);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte de Votantes');

        worksheet.columns = [
            { header: 'Cédula', key: 'cedula', width: 15 },
            { header: 'Nombre', key: 'nombre', width: 30 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Departamento', key: 'department', width: 20 },
            { header: 'Municipio', key: 'municipality', width: 20 },
            { header: 'Puesto', key: 'polling_station', width: 30 },
            { header: 'Mesa', key: 'table', width: 10 },
            { header: 'Dirección', key: 'address', width: 30 },
            { header: 'Líder', key: 'leader', width: 30 },
            { header: 'Jefe', key: 'jefe', width: 30 },
            { header: 'Digitador', key: 'digitador', width: 20 },
            { header: 'Fecha Registro', key: 'created_at', width: 20 },
            { header: 'Observación', key: 'observation', width: 40 },
        ];

        voters.forEach(voter => {
            const row = worksheet.addRow({
                cedula: voter.cedula,
                nombre: voter.nombre,
                telefono: voter.telefono,
                department: voter.detail?.department || '',
                municipality: voter.detail?.municipality || '',
                polling_station: voter.detail?.polling_station || '',
                table: voter.detail?.table || '',
                address: voter.detail?.address || '',
                leader: voter.leader?.nombre || 'Sin Asignar',
                jefe: voter.leader?.chief?.nombre || 'Sin Asignar',
                digitador: voter.created_by?.username || 'Desconocido',
                created_at: voter.created_at.toLocaleString(),
                observation: (() => {
                    if (!voter.verification_logs || voter.verification_logs.length === 0) {
                        return voter.verification_status === 'SUCCESS' ? 'Verificado' : '';
                    }
                    // Sort in memory to be sure it's the latest
                    const sortedLogs = [...voter.verification_logs].sort((a, b) =>
                        new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime()
                    );
                    return sortedLogs[0].message;
                })()
            });

            if (voter.verification_status === 'FAILED') {
                row.eachCell((cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFE0E0' } // Light red
                    };
                });
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_votantes.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    }

    async generateReportByLeader(res: Response, leaderId?: string) {
        const queryOptions: any = {
            relations: ['detail', 'leader', 'leader.chief', 'verification_logs'],
            order: {
                leader: { nombre: 'ASC' },
                nombre: 'ASC'
            }
        };

        if (leaderId) {
            queryOptions.where = [
                { leader_id: leaderId, verification_status: 'SUCCESS' },
                { leader_id: leaderId, verification_status: 'FAILED' }
            ];
        } else {
            queryOptions.where = [
                { verification_status: 'SUCCESS' },
                { verification_status: 'FAILED' }
            ];
        }

        const voters = await this.voterRepository.find(queryOptions);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Votantes por Líder');

        // Agrupar por líder
        const groupedByLeader: { [key: string]: { leader: any, voters: any[] } } = {};
        voters.forEach(voter => {
            const leaderId = voter.leader?.id || 'no-leader';
            if (!groupedByLeader[leaderId]) {
                groupedByLeader[leaderId] = {
                    leader: voter.leader || { nombre: 'SIN LÍDER ASIGNADO', cedula: 'N/A', telefono: 'N/A', chief: null },
                    voters: []
                };
            }
            groupedByLeader[leaderId].voters.push(voter);
        });

        let currentRow = 1;

        Object.values(groupedByLeader).forEach(group => {
            // 1. Dos primeras filas combinadas con info del líder (A hasta G - 7 columnas)
            const leaderCellRange = `A${currentRow}:G${currentRow + 1}`;
            worksheet.mergeCells(leaderCellRange);
            const leaderRow = worksheet.getRow(currentRow);
            leaderRow.height = 30;
            const mergedCell = worksheet.getCell(`A${currentRow}`);
            const jefeNombre = group.leader.chief?.nombre || 'N/A';
            mergedCell.value = `LÍDER: ${group.leader.nombre} - JEFE: ${jefeNombre} - CÉDULA: ${group.leader.cedula} - TELÉFONO: ${group.leader.telefono}`;
            mergedCell.alignment = { vertical: 'middle', horizontal: 'center' };
            mergedCell.font = { bold: true, size: 12 };
            mergedCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            currentRow += 2;

            // 2. Encabezados del votante
            const headerRow = worksheet.getRow(currentRow);
            headerRow.values = ['Cédula', 'Nombre', 'Celular', 'Municipio', 'Puesto de votación', 'Mesa', 'Observación'];
            headerRow.font = { bold: true };
            worksheet.columns.forEach((col, i) => {
                if (i < 7) worksheet.getColumn(i + 1).width = 25;
            });
            currentRow++;

            // 3. Votantes
            group.voters.forEach(voter => {
                const row = worksheet.addRow([
                    voter.cedula,
                    voter.nombre,
                    voter.telefono,
                    voter.detail?.municipality || '',
                    voter.detail?.polling_station || '',
                    voter.detail?.table || '',
                    (() => {
                        if (!voter.verification_logs || voter.verification_logs.length === 0) return '';
                        const sortedLogs = [...voter.verification_logs].sort((a, b) =>
                            new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime()
                        );
                        return sortedLogs[0].message;
                    })()
                ]);

                if (voter.verification_status === 'FAILED') {
                    row.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFE0E0' } // Light red
                        };
                    });
                }
                currentRow++;
            });

            // Espacio entre líderes
            currentRow++;
            worksheet.addRow([]);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_validado_por_lider.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    }

    async generateReportByChief(res: Response, chiefId?: string) {
        const queryOptions: any = {
            relations: ['detail', 'leader', 'leader.chief', 'verification_logs'],
            order: {
                leader: {
                    chief: { nombre: 'ASC' },
                    nombre: 'ASC'
                },
                nombre: 'ASC'
            }
        };

        if (chiefId) {
            queryOptions.where = [
                { leader: { chief_id: chiefId }, verification_status: 'SUCCESS' },
                { leader: { chief_id: chiefId }, verification_status: 'FAILED' }
            ];
        } else {
            queryOptions.where = [
                { verification_status: 'SUCCESS' },
                { verification_status: 'FAILED' }
            ];
        }

        const voters = await this.voterRepository.find(queryOptions);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Votantes por Jefe');

        // Agrupar por jefe
        const groupedByChief: { [key: string]: { chief: any, voters: any[] } } = {};
        voters.forEach(voter => {
            const chiefId = voter.leader?.chief?.id || 'no-chief';
            if (!groupedByChief[chiefId]) {
                groupedByChief[chiefId] = {
                    chief: voter.leader?.chief || { nombre: 'SIN JEFE ASIGNADO', cedula: 'N/A', telefono: 'N/A' },
                    voters: []
                };
            }
            groupedByChief[chiefId].voters.push(voter);
        });

        let currentRow = 1;

        Object.values(groupedByChief).forEach(group => {
            // 1. Header del Jefe (8 columnas: A hasta H)
            const chiefCellRange = `A${currentRow}:H${currentRow + 1}`;
            worksheet.mergeCells(chiefCellRange);
            const chiefRow = worksheet.getRow(currentRow);
            chiefRow.height = 30;
            const mergedCell = worksheet.getCell(`A${currentRow}`);
            mergedCell.value = `JEFE: ${group.chief.nombre} - CÉDULA: ${group.chief.cedula} - TELÉFONO: ${group.chief.telefono}`;
            mergedCell.alignment = { vertical: 'middle', horizontal: 'center' };
            mergedCell.font = { bold: true, size: 12 };
            mergedCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0F0' } // Light blue/purple for Chief
            };

            currentRow += 2;

            // 2. Encabezados
            const headerRow = worksheet.getRow(currentRow);
            headerRow.values = ['Cédula', 'Nombre', 'Líder', 'Celular', 'Municipio', 'Puesto de votación', 'Mesa', 'Observación'];
            headerRow.font = { bold: true };
            worksheet.columns.forEach((col, i) => {
                if (i < 8) worksheet.getColumn(i + 1).width = 25;
            });
            currentRow++;

            // 3. Votantes
            group.voters.forEach(voter => {
                const row = worksheet.addRow([
                    voter.cedula,
                    voter.nombre,
                    voter.leader?.nombre || 'N/A',
                    voter.telefono,
                    voter.detail?.municipality || '',
                    voter.detail?.polling_station || '',
                    voter.detail?.table || '',
                    (() => {
                        if (!voter.verification_logs || voter.verification_logs.length === 0) return '';
                        const sortedLogs = [...voter.verification_logs].sort((a, b) =>
                            new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime()
                        );
                        return sortedLogs[0].message;
                    })()
                ]);

                if (voter.verification_status === 'FAILED') {
                    row.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFFE0E0' }
                        };
                    });
                }
                currentRow++;
            });

            currentRow++;
            worksheet.addRow([]);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_validado_por_jefe.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    }
}
