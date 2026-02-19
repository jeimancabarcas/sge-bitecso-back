
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('scraper')
@ApiBearerAuth()
@Controller('scraper')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScraperController {
    constructor(private readonly scraperService: ScraperService) { }

    @Get('test-capsolver')
    @Roles(UserRole.ADMIN)
    async testCapSolver() {
        const token = await this.scraperService.solveWithCapSolver();
        return {
            message: 'Captcha resuelto con CapSolver',
            token
        };
    }

    @Get('check-ip')
    @Roles(UserRole.ADMIN)
    async checkIp() {
        const ip = await this.scraperService.getProxyIp();
        return {
            message: 'IP detectada por el servicio externo (vía Proxy)',
            ip
        };
    }
}
