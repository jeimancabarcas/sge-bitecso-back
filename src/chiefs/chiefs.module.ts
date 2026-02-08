
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChiefsService } from './chiefs.service';
import { ChiefsController } from './chiefs.controller';
import { Chief } from './entities/chief.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Chief])],
    controllers: [ChiefsController],
    providers: [ChiefsService],
    exports: [ChiefsService],
})
export class ChiefsModule { }
