import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { HytaleServersService } from './hytale-servers.service';
import {
  CreateHytaleServerDto,
  UpdateHytaleConfigDto,
  HytaleConfig,
  HytaleServerListItem,
} from './dto/hytale-config.model';

@Controller('hytale-servers')
@UseGuards(JwtAuthGuard)
export class HytaleServersController {
  constructor(private readonly hytaleService: HytaleServersService) {}

  /**
   * GET /hytale-servers
   * Get all Hytale servers
   */
  @Get()
  async getAllServers(): Promise<HytaleServerListItem[]> {
    return this.hytaleService.getAllServers();
  }

  /**
   * GET /hytale-servers/status
   * Get status of all Hytale servers
   */
  @Get('status')
  async getAllServersStatus(): Promise<Record<string, string>> {
    return this.hytaleService.getAllServersStatus();
  }

  /**
   * POST /hytale-servers
   * Create a new Hytale server
   */
  @Post()
  async createServer(@Body() dto: CreateHytaleServerDto): Promise<HytaleConfig> {
    return this.hytaleService.createServer(dto);
  }

  /**
   * GET /hytale-servers/:id
   * Get server configuration
   */
  @Get(':id')
  async getServerConfig(@Param('id') id: string): Promise<HytaleConfig | null> {
    return this.hytaleService.getServerConfig(id);
  }

  /**
   * PUT /hytale-servers/:id
   * Update server configuration
   */
  @Put(':id')
  async updateServerConfig(
    @Param('id') id: string,
    @Body() dto: UpdateHytaleConfigDto,
  ): Promise<HytaleConfig> {
    return this.hytaleService.updateServerConfig(id, dto);
  }

  /**
   * DELETE /hytale-servers/:id
   * Delete a server
   */
  @Delete(':id')
  async deleteServer(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.hytaleService.deleteServer(id);
    return { success };
  }

  /**
   * GET /hytale-servers/:id/status
   * Get server status
   */
  @Get(':id/status')
  async getServerStatus(@Param('id') id: string): Promise<{ status: string }> {
    const status = await this.hytaleService.getServerStatus(id);
    return { status };
  }

  /**
   * GET /hytale-servers/:id/info
   * Get detailed server info
   */
  @Get(':id/info')
  async getServerInfo(@Param('id') id: string) {
    return this.hytaleService.getServerInfo(id);
  }

  /**
   * POST /hytale-servers/:id/start
   * Start the server
   */
  @Post(':id/start')
  async startServer(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.hytaleService.startServer(id);
    return { success };
  }

  /**
   * POST /hytale-servers/:id/stop
   * Stop the server
   */
  @Post(':id/stop')
  async stopServer(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.hytaleService.stopServer(id);
    return { success };
  }

  /**
   * POST /hytale-servers/:id/restart
   * Restart the server
   */
  @Post(':id/restart')
  async restartServer(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.hytaleService.restartServer(id);
    return { success };
  }

  /**
   * GET /hytale-servers/:id/logs
   * Get server logs
   */
  @Get(':id/logs')
  async getServerLogs(
    @Param('id') id: string,
    @Query('lines') lines?: string,
  ) {
    const numLines = lines ? parseInt(lines, 10) : 100;
    return this.hytaleService.getServerLogs(id, numLines);
  }
}
