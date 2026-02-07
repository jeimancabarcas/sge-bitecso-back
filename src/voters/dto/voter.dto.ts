
import { IsString, IsNotEmpty, IsNumberString, IsMobilePhone, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoterDto {
    @ApiProperty({ description: 'Cédula of the voter (numeric string)', example: '1234567890' })
    @IsNumberString({}, { message: 'Cédula must be a numeric string' })
    @IsNotEmpty()
    cedula: string;

    @ApiProperty({ description: 'Full name of the voter', example: 'Juan Perez' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ description: 'Phone number of the voter', example: '3001234567' })
    @IsMobilePhone()
    @IsNotEmpty()
    phone: string;

    @ApiProperty({ description: 'Polling station name', required: false, example: 'Colegio San Jose' })
    @IsOptional()
    @IsString()
    pollingStation?: string;

    @ApiProperty({ description: 'Table number', required: false, example: '1' })
    @IsOptional()
    @IsString()
    table?: string;

    @ApiProperty({ description: 'ID of the leader registering the voter', example: 'leader-123' })
    @IsString()
    @IsNotEmpty()
    leaderId: string;
}
