import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { McpCatalogService } from './mcp-catalog.service';

@Module({
  imports: [DiscoveryModule],
  controllers: [McpController],
  providers: [McpService, McpCatalogService],
})
export class McpModule {}
