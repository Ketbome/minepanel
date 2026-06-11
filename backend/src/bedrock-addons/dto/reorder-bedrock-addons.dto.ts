import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderBedrockAddonsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  addonIds: string[];
}
