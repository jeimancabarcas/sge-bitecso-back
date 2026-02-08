
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { VotersService } from './voters.service';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('voters')
@ApiBearerAuth()
@Controller('voters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VotersController {
    constructor(private readonly votersService: VotersService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    create(@Body() createVoterDto: CreateVoterDto, @Request() req) {
        return this.votersService.create(createVoterDto, req.user);
    }

    @Post(':id/verify')
    verify(@Param('id') id: string) {
        return this.votersService.verifyVoter(id);
    }

    @Get('report')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    async downloadReport(@Res() res: Response) {
        return this.votersService.generateReport(res);
    }

    @Get('dashboard-stats')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    getDashboardStats() {
        return this.votersService.getDashboardStats();
    }

    @Get('digitators-stats')
    @Roles(UserRole.ADMIN)
    getDigitatorsStats() {
        return this.votersService.getDigitatorsStats();
    }

    @Get('leaders-stats')
    @Roles(UserRole.ADMIN)
    getLeadersStats() {
        return this.votersService.getLeadersStats();
    }

    @Get('my-records')
    @Roles(UserRole.DIGITADOR, UserRole.ADMIN)
    getMyRecords(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
        return this.votersService.findAllByUser(req.user.id, +page, +limit);
    }

    @Get()
    findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
        return this.votersService.findAll(+page, +limit);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.votersService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateVoterDto: UpdateVoterDto) {
        return this.votersService.update(+id, updateVoterDto);
    }

}
