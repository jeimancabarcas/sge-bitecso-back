
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaderDto {
    @ApiProperty({ description: 'Full name of the leader' })
    @IsNotEmpty()
    @IsString()
    nombre: string;

    @ApiPropertyOptional({ description: 'Phone number of the leader' })
    @IsOptional()
    @IsString()
    telefono?: string;
}
