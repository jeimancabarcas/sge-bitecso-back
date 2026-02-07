
import { Controller, Request, Post, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService
    ) { }

    @UseGuards(AuthGuard('local'))
    @Post('login')
    @ApiBody({ schema: { type: 'object', properties: { username: { type: 'string' }, password: { type: 'string' } } } })
    async login(@Request() req) {
        return this.authService.login(req.user);
    }

    // Temporary endpoint to create initial users
    @Post('register')
    @ApiBody({ schema: { type: 'object', properties: { username: { type: 'string' }, password: { type: 'string' }, fullName: { type: 'string' } } } })
    async register(@Body() body) {
        return this.usersService.create(body.username, body.password, body.fullName);
    }
}
