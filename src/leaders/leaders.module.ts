
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadersService } from './leaders.service';
import { LeadersController } from './leaders.controller';
import { Leader } from './entities/leader.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Leader])],
    controllers: [LeadersController],
    providers: [LeadersService],
    exports: [LeadersService],
})
export class LeadersModule { }
