import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduledTaskDto } from './create-scheduled-task.dto';

export class UpdateScheduledTaskDto extends PartialType(CreateScheduledTaskDto) {}
