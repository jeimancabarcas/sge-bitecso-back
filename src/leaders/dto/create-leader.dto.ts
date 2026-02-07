
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaderDto {
    @ApiProperty({ description: 'Full name of the leader' })
    @IsNotEmpty({ message: 'El nombre es requerido' })
    @IsString()
    nombre: string;

    @ApiProperty({ description: 'ID number (Cedula) of the leader' })
    @IsNotEmpty({ message: 'La cédula es requerida' })
    @IsString()
    @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
    cedula: string;

    @ApiPropertyOptional({ description: 'Phone number of the leader' })
    @IsOptional()
    @IsString()
    @Matches(/^[0-9]{10}$/, { message: 'El teléfono debe tener exactamente 10 números' })
    telefono?: string;

    @ApiPropertyOptional({ description: 'The boss of the leader' })
    @IsOptional()
    @IsString()
    jefe?: string;
}
