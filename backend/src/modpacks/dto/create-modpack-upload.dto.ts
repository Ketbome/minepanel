import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { MAX_MODPACK_SIZE } from '../modpacks.service';

export class CreateModpackUploadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  @Max(MAX_MODPACK_SIZE)
  size: number;
}
