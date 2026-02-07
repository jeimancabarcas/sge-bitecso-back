
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { VotersService } from './voters.service';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('voters')
@Controller('voters')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VotersController {
    constructor(private readonly votersService: VotersService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    create(@Body() createVoterDto: CreateVoterDto) {
        return this.votersService.create(createVoterDto);
    }

    @Post(':id/verify')
    verify(@Param('id') id: string) {
        return this.votersService.verifyVoter(id);
    }

    @Get()
    findAll() {
        return this.votersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.votersService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateVoterDto: UpdateVoterDto) {
        return this.votersService.update(+id, updateVoterDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.votersService.remove(+id);
    }
}
