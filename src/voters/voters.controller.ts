
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

    @Post('process-pending')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    processPending(@Query('limit') limit?: string) {
        return this.votersService.triggerManualVerification(limit ? +limit : undefined);
    }

    @Post(':id/verify')
    verify(@Param('id') id: string) {
        return this.votersService.queueVerification(id);
    }

    @Get('report')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    async downloadReport(@Res() res: Response) {
        return this.votersService.generateReport(res);
    }

    @Get('report-by-leader')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    async downloadReportByLeader(@Res() res: Response, @Query('leaderId') leaderId?: string) {
        return this.votersService.generateReportByLeader(res, leaderId);
    }

    @Get('report-by-chief')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    async downloadReportByChief(@Res() res: Response, @Query('chiefId') chiefId?: string) {
        return this.votersService.generateReportByChief(res, chiefId);
    }

    @Get('dashboard-stats')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR, UserRole.VIEWER)
    getDashboardStats() {
        return this.votersService.getDashboardStats();
    }

    @Get('digitators-stats')
    @Roles(UserRole.ADMIN, UserRole.VIEWER)
    getDigitatorsStats() {
        return this.votersService.getDigitatorsStats();
    }

    @Get('leaders-stats')
    @Roles(UserRole.ADMIN, UserRole.VIEWER)
    getLeadersStats() {
        return this.votersService.getLeadersStats();
    }

    @Get('my-records')
    @Roles(UserRole.DIGITADOR, UserRole.ADMIN)
    getMyRecords(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 10, @Query('search') search?: string) {
        return this.votersService.findAllByUser(req.user.id, +page, +limit, search);
    }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR, UserRole.VIEWER)
    findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10, @Query('search') search?: string) {
        return this.votersService.findAll(+page, +limit, search);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.votersService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    update(@Param('id') id: string, @Body() updateVoterDto: UpdateVoterDto, @Request() req) {
        return this.votersService.update(id, updateVoterDto, req.user);
    }

}
