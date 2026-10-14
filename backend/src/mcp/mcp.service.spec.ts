import { InMemoryTransport, LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/server';
import { McpService } from './mcp.service';
import { MCP_TOOLS } from './mcp-tools';
import { MAX_RESPONSE_CHARS, PanelApi, PanelApiError } from './panel-api';

describe('McpService', () => {
  const scope = { id: 1, admin: false, readOnly: false, permissions: {} as any, serverAccess: [] };
  const entries = [
    { method: 'GET', path: '/proxy/status', controller: 'Proxy' },
    { method: 'POST', path: '/servers/:id/start', controller: 'ServerManagement' },
  ];
  let catalog: { list: jest.Mock; find: jest.Mock };
  let request: jest.SpyInstance;
  let service: McpService;

  // A bare JSON-RPC client over the SDK's in-memory transport.
  const connect = async (readOnly = false) => {
    const server = service.createServer('mp_token', { ...scope, readOnly });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const pending = new Map<number, (message: any) => void>();
    clientTransport.onmessage = (message: any) => pending.get(message.id)?.(message);
    await clientTransport.start();
    let nextId = 0;
    const call = (method: string, params: unknown) =>
      new Promise<any>((resolve) => {
        const id = ++nextId;
        pending.set(id, (message) => resolve(message.result ?? message.error));
        void clientTransport.send({ jsonrpc: '2.0', id, method, params } as any);
      });
    await call('initialize', { protocolVersion: LATEST_PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'test', version: '1' } });
    await clientTransport.send({ jsonrpc: '2.0', method: 'notifications/initialized' } as any);
    return {
      listTools: (): Promise<{ tools: any[] }> => call('tools/list', {}),
      callTool: (params: { name: string; arguments: Record<string, unknown> }) => call('tools/call', params),
    };
  };
  const textOf = (result: any) => result.content[0].text;

  beforeEach(() => {
    catalog = { list: jest.fn((readOnly: boolean) => (readOnly ? entries.slice(0, 1) : entries)), find: jest.fn((method, path) => entries.find((entry) => entry.method === method && path.startsWith(entry.path.split('/:')[0]))) };
    const config = { get: jest.fn((key: string) => ({ backendPort: '8091', basePath: '/panel' })[key]) };
    service = new McpService(config as any, catalog as any);
    request = jest.spyOn(PanelApi.prototype, 'request').mockResolvedValue({ ok: true });
  });

  afterEach(() => request.mockRestore());

  it('offers every curated tool plus the generic ones, with annotations', async () => {
    const { tools } = await (await connect()).listTools();

    expect(tools.map((tool) => tool.name)).toEqual([...MCP_TOOLS.map((tool) => tool.name), 'list_endpoints', 'call_endpoint']);
    expect(tools.find((tool) => tool.name === 'get_logs').annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    expect(tools.find((tool) => tool.name === 'delete_server').annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
  });

  it('offers read-only tokens only GET tools and GET calls', async () => {
    const client = await connect(true);
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).not.toContain('start_server');
    expect(tools.map((tool) => tool.name)).toContain('get_logs');
    expect((tools.find((tool) => tool.name === 'call_endpoint').inputSchema.properties.method as any).enum).toEqual(['GET']);
    expect(JSON.parse(textOf(await client.callTool({ name: 'list_endpoints', arguments: {} })))).toEqual(entries.slice(0, 1));
  });

  it('runs curated tools through the panel API with the caller token', async () => {
    const client = await connect();
    const result = await client.callTool({ name: 'start_server', arguments: { serverId: 'lobby' } });

    expect(JSON.parse(textOf(result))).toEqual({ ok: true });
    expect(request).toHaveBeenCalledWith({ method: 'POST', path: '/servers/lobby/start' });
  });

  it('reports API errors as tool errors', async () => {
    request.mockRejectedValue(new PanelApiError(403, '403: You do not have access to this server'));
    const result = await (await connect()).callTool({ name: 'get_server', arguments: { serverId: 'b' } });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe('403: You do not have access to this server');

    request.mockRejectedValue('boom');
    expect(textOf(await (await connect()).callTool({ name: 'list_servers', arguments: {} }))).toBe('boom');
  });

  it('truncates long output', async () => {
    request.mockResolvedValue('x'.repeat(MAX_RESPONSE_CHARS + 5));
    const output = textOf(await (await connect()).callTool({ name: 'get_logs', arguments: { serverId: 'a' } }));

    expect(output).toContain(`[truncated: ${MAX_RESPONSE_CHARS + 5} characters in total]`);
    expect(request).toHaveBeenCalledWith({ method: 'GET', path: '/servers/a/logs', query: { lines: 200 } });
  });

  it('filters the endpoint list', async () => {
    const client = await connect();
    expect(JSON.parse(textOf(await client.callTool({ name: 'list_endpoints', arguments: { filter: 'PROXY' } })))).toEqual(entries.slice(0, 1));
  });

  it('only calls catalog endpoints with clean paths', async () => {
    const client = await connect();

    expect(JSON.parse(textOf(await client.callTool({ name: 'call_endpoint', arguments: { method: 'POST', path: '/servers/a/start', body: { x: 1 } } })))).toEqual({ ok: true });
    expect(request).toHaveBeenCalledWith({ method: 'POST', path: '/servers/a/start', query: undefined, body: { x: 1 } });

    for (const path of ['/auth/me', '/servers/../auth/me', '/proxy//status', '/proxy/status?x=1']) {
      const result = await client.callTool({ name: 'call_endpoint', arguments: { method: 'GET', path } });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('use list_endpoints');
    }
    expect(request).toHaveBeenCalledTimes(1);
  });
});
