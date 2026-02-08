
import { PartialType } from '@nestjs/swagger';
import { CreateChiefDto } from './create-chief.dto';

export class UpdateChiefDto extends PartialType(CreateChiefDto) { }
