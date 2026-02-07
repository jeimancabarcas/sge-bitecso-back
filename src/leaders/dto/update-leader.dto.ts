
import { PartialType } from '@nestjs/swagger';
import { CreateLeaderDto } from './create-leader.dto';

export class UpdateLeaderDto extends PartialType(CreateLeaderDto) { }
