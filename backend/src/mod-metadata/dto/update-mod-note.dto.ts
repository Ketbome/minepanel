import { IsString, MaxLength } from 'class-validator';

export class UpdateModNoteDto {
  @IsString()
  @MaxLength(2000)
  note: string;
}
