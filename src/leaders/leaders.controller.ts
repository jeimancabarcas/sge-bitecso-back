
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LeadersService } from './leaders.service';
import { CreateLeaderDto } from './dto/create-leader.dto';
import { UpdateLeaderDto } from './dto/update-leader.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UseGuards } from '@nestjs/common';

@ApiTags('leaders')
@ApiBearerAuth()
@Controller('leaders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.DIGITADOR)
export class LeadersController {
    constructor(private readonly leadersService: LeadersService) { }

    @Post()
    create(@Body() createLeaderDto: CreateLeaderDto) {
        return this.leadersService.create(createLeaderDto);
    }

    @Get()
    findAll() {
        return this.leadersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.leadersService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateLeaderDto: UpdateLeaderDto) {
        return this.leadersService.update(id, updateLeaderDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.leadersService.remove(id);
    }
}
