const transport = { handleRequest: jest.fn().mockResolvedValue(undefined), close: jest.fn().mockResolvedValue(undefined) };
jest.mock('@modelcontextprotocol/node', () => ({ NodeStreamableHTTPServerTransport: jest.fn(() => transport) }));

import { EventEmitter } from 'node:events';
import { MethodNotAllowedException } from '@nestjs/common';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpController } from './mcp.controller';

describe('McpController', () => {
  const scope = { id: 1, admin: false, readOnly: true, permissions: {} as any, serverAccess: [] };
  const server = { connect: jest.fn().mockResolvedValue(undefined), close: jest.fn().mockResolvedValue(undefined) };
  const mcp = { createServer: jest.fn(() => server) };
  const controller = new McpController(mcp as any);

  it('serves each request with a stateless server bound to the caller token', async () => {
    const req = { headers: { authorization: 'Bearer mp_abc' }, user: { userId: 2, apiToken: scope }, body: { jsonrpc: '2.0' } } as any;
    const res = new EventEmitter() as any;

    await controller.handle(req, res);

    expect(mcp.createServer).toHaveBeenCalledWith('mp_abc', scope);
    expect(NodeStreamableHTTPServerTransport).toHaveBeenCalledWith({ sessionIdGenerator: undefined, enableJsonResponse: true });
    expect(server.connect).toHaveBeenCalledWith(transport);
    expect(transport.handleRequest).toHaveBeenCalledWith(req, res, req.body);

    res.emit('close');
    expect(transport.close).toHaveBeenCalled();
    expect(server.close).toHaveBeenCalled();
  });

  it('rejects GET and DELETE', () => {
    expect(() => controller.openStream()).toThrow(MethodNotAllowedException);
    expect(() => controller.endSession()).toThrow(MethodNotAllowedException);
  });
});
