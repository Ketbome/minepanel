import { Controller, Delete, Get, MethodNotAllowedException, Post, Req, Res } from '@nestjs/common';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { Request, Response } from 'express';
import { TokenOnly } from 'src/auth/decorators/token-only.decorator';
import { PayloadToken } from 'src/auth/models/token.model';
import { McpService } from './mcp.service';

@Controller('mcp')
@TokenOnly()
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Post()
  async handle(@Req() req: Request & { user: PayloadToken }, @Res() res: Response) {
    const token = req.headers.authorization.slice('Bearer '.length);
    const server = this.mcp.createServer(token, req.user.apiToken);
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  // Stateless server: no SSE stream to open and no session to end.
  @Get()
  openStream() {
    throw new MethodNotAllowedException('This MCP server is stateless; use POST');
  }

  @Delete()
  endSession() {
    throw new MethodNotAllowedException('This MCP server is stateless; use POST');
  }
}
