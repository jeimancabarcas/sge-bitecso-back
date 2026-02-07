
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaderDto {
    @ApiProperty({ description: 'Full name of the leader' })
    @IsNotEmpty()
    @IsString()
    nombre: string;

    @ApiProperty({ description: 'ID number (Cedula) of the leader' })
    @IsNotEmpty()
    @IsString()
    cedula: string;

    @ApiPropertyOptional({ description: 'Phone number of the leader' })
    @IsOptional()
    @IsString()
    telefono?: string;

    @ApiPropertyOptional({ description: 'The boss of the leader' })
    @IsOptional()
    @IsString()
    jefe?: string;
}
