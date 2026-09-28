import { IsNumber, IsOptional } from 'class-validator';

// Partial update: an omitted axis is left as-is, `null` clears it back to the built-in default.
export class UpdateSpawnPointDto {
  @IsNumber()
  @IsOptional()
  x?: number | null;

  @IsNumber()
  @IsOptional()
  y?: number | null;

  @IsNumber()
  @IsOptional()
  z?: number | null;
}
