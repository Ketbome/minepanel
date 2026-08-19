import { IsEnum, IsOptional } from 'class-validator';

export class ModCategoriesQueryDto {
  @IsOptional()
  @IsEnum(['mod', 'datapack'])
  projectType?: 'mod' | 'datapack';
}
