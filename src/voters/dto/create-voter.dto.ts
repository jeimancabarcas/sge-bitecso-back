
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVoterDto {
    @ApiProperty({ description: 'The unique ID/Cedula of the voter' })
    @IsNotEmpty({ message: 'La cédula es requerida' })
    @IsString()
    @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
    cedula: string;

    @ApiPropertyOptional({ description: 'Full name of the voter' })
    @IsOptional()
    @IsString()
    nombre?: string;

    @ApiPropertyOptional({ description: 'Phone number of the voter' })
    @IsOptional()
    @IsString()
    @Matches(/^[0-9]*$/, { message: 'El teléfono debe contener solo números' })
    telefono?: string;

    @ApiPropertyOptional({ description: 'ID of the leader in charge (UUID)' })
    @IsOptional()
    @IsString()
    leader_id?: string;
}
