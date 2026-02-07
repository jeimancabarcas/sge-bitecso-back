
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVoterDto {
    @ApiProperty({ description: 'The unique ID/Cedula of the voter' })
    @IsNotEmpty()
    @IsString()
    cedula: string;

    @ApiPropertyOptional({ description: 'Full name of the voter' })
    @IsOptional()
    @IsString()
    nombre?: string;

    @ApiPropertyOptional({ description: 'Phone number of the voter' })
    @IsOptional()
    @IsString()
    telefono?: string;

    @ApiPropertyOptional({ description: 'Name of the leader in charge' })
    @IsOptional()
    @IsString()
    nombre_lider?: string;
}
