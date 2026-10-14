import { Controller, Delete, Get, Post, Res, UseInterceptors } from '@nestjs/common';
import { MetadataScanner, Reflector } from '@nestjs/core';
import { Public } from 'src/auth/decorators/public.decorator';
import { SessionOnly } from 'src/auth/decorators/session-only.decorator';
import { TokenOnly } from 'src/auth/decorators/token-only.decorator';
import { McpCatalogService } from './mcp-catalog.service';

@Controller('servers')
class ServersController {
  @Get()
  list() {}
  @Get(':id')
  get() {}
  @Post(':id/start')
  start() {}
  @Delete(':id')
  remove() {}
  @Get(':id/logs/stream')
  stream() {}
  @Get(':id/download')
  download(@Res() _res: unknown) {}
  @Post(':id/upload')
  @UseInterceptors({ intercept: () => null } as any)
  upload() {}
  @Post(':id/uploads')
  chunked() {}
  @Public()
  @Get('public/info')
  info() {}
  notARoute() {}
}

@Controller('users')
class UsersController {
  @Get()
  list() {}
  @SessionOnly()
  @Post()
  create() {}
}

@Controller('auth')
@SessionOnly()
class AuthController {
  @Get('me')
  me() {}
}

@Controller('mcp')
@TokenOnly()
class McpController {
  @Post()
  handle() {}
}

describe('McpCatalogService', () => {
  let catalog: McpCatalogService;

  beforeEach(() => {
    const controllers = [ServersController, UsersController, AuthController, McpController].map((metatype) => ({ metatype, instance: new metatype() }));
    const discovery = { getControllers: () => [...controllers, { metatype: null, instance: null }] };
    catalog = new McpCatalogService(discovery as any, new MetadataScanner(), new Reflector());
    catalog.onApplicationBootstrap();
  });

  it('lists only routes an API token can call as JSON', () => {
    expect(catalog.list(false)).toEqual([
      { method: 'GET', path: '/servers', controller: 'Servers' },
      { method: 'GET', path: '/servers/:id', controller: 'Servers' },
      { method: 'POST', path: '/servers/:id/start', controller: 'Servers' },
      { method: 'DELETE', path: '/servers/:id', controller: 'Servers' },
      { method: 'GET', path: '/users', controller: 'Users' },
    ]);
  });

  it('keeps read-only tokens to GET routes', () => {
    expect(catalog.list(true).map((entry) => entry.method)).toEqual(['GET', 'GET', 'GET']);
  });

  it('matches concrete paths against route patterns', () => {
    expect(catalog.find('POST', '/servers/lobby/start')).toMatchObject({ path: '/servers/:id/start' });
    expect(catalog.find('GET', '/servers/lobby')).toMatchObject({ path: '/servers/:id' });
    expect(catalog.find('GET', '/servers/lobby/logs/stream')).toBeUndefined();
    expect(catalog.find('POST', '/users')).toBeUndefined();
    expect(catalog.find('GET', '/auth/me')).toBeUndefined();
    expect(catalog.find('POST', '/mcp')).toBeUndefined();
  });
});
