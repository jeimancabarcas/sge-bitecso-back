
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ChiefsService } from './chiefs.service';
import { CreateChiefDto } from './dto/create-chief.dto';
import { UpdateChiefDto } from './dto/update-chief.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('chiefs')
@ApiBearerAuth()
@Controller('chiefs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChiefsController {
    constructor(private readonly chiefsService: ChiefsService) { }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createChiefDto: CreateChiefDto) {
        return this.chiefsService.create(createChiefDto);
    }

    @Get()
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR, UserRole.VIEWER)
    findAll() {
        return this.chiefsService.findAll();
    }

    @Get('stats')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR, UserRole.VIEWER)
    getStats() {
        return this.chiefsService.getChiefsStats();
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    findOne(@Param('id') id: string) {
        return this.chiefsService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updateChiefDto: UpdateChiefDto) {
        return this.chiefsService.update(id, updateChiefDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.DIGITADOR)
    remove(@Param('id') id: string) {
        return this.chiefsService.remove(id);
    }
}
