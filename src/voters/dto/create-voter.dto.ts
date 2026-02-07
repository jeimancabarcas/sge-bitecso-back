
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVoterDto {
    @ApiProperty({ description: 'The unique ID/Cedula of the voter' })
    @IsNotEmpty()
    @IsString()
    @Matches(/^[0-9]+$/, { message: 'cedula must contain only numbers' })
    cedula: string;

    @ApiPropertyOptional({ description: 'Full name of the voter' })
    @IsOptional()
    @IsString()
    nombre?: string;

    @ApiPropertyOptional({ description: 'Phone number of the voter' })
    @IsOptional()
    @IsString()
    @Matches(/^[0-9]{10}$/, { message: 'telefono must be exactly 10 numbers' })
    telefono?: string;

    @ApiPropertyOptional({ description: 'ID of the leader in charge (UUID)' })
    @IsOptional()
    @IsString()
    leader_id?: string;
}
