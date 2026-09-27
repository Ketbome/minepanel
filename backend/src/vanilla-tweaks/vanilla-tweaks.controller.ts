import { BadRequestException, Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { VANILLA_TWEAKS_CODE, VanillaTweaksService } from './vanilla-tweaks.service';

@Controller('vanilla-tweaks')
export class VanillaTweaksController {
  constructor(private readonly vanillaTweaks: VanillaTweaksService) {}

  @Get(':code')
  async lookup(@Param('code') code: string) {
    if (!VANILLA_TWEAKS_CODE.test(code)) throw new BadRequestException('Invalid Vanilla Tweaks share code');
    const share = await this.vanillaTweaks.lookup(code);
    if (!share) throw new NotFoundException(`Vanilla Tweaks share code ${code} was not found`);
    return share;
  }
}
