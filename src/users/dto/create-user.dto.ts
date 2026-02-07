
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty()
    @IsNotEmpty({ message: 'El nombre de usuario es requerido' })
    @IsString()
    username: string;

    @ApiProperty()
    @IsNotEmpty({ message: 'La contraseña es requerida' })
    @IsString()
    password: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    fullName?: string;
}
