
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChiefDto {
    @ApiProperty({ description: 'Full name of the chief' })
    @IsNotEmpty({ message: 'El nombre es requerido' })
    @IsString()
    nombre: string;

    @ApiProperty({ description: 'ID number (Cedula) of the chief' })
    @IsNotEmpty({ message: 'La cédula es requerida' })
    @IsString()
    @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
    cedula: string;

    @ApiPropertyOptional({ description: 'Phone number of the chief' })
    @IsOptional()
    @IsString()
    @Matches(/^[0-9]{10}$/, { message: 'El teléfono debe tener exactamente 10 números' })
    telefono?: string;
}
