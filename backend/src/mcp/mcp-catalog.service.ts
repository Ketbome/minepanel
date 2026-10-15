import { Injectable, OnApplicationBootstrap, RequestMethod } from '@nestjs/common';
import { INTERCEPTORS_METADATA, METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/auth/decorators/public.decorator';
import { SESSION_ONLY_KEY } from 'src/auth/decorators/session-only.decorator';
import { TOKEN_ONLY_KEY } from 'src/auth/decorators/token-only.decorator';
import { HttpMethod } from './panel-api';

export interface CatalogEntry {
  method: HttpMethod;
  path: string;
  controller: string;
}

const METHODS: Partial<Record<RequestMethod, HttpMethod>> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.PATCH]: 'PATCH',
  [RequestMethod.DELETE]: 'DELETE',
};

// Raw response/stream handlers can't be expressed as a JSON call.
const RAW_PARAMS = new Set([RouteParamtypes.RESPONSE, RouteParamtypes.NEXT, RouteParamtypes.FILE, RouteParamtypes.FILES]);
// Routes that read the request stream themselves, which metadata does not reveal.
const STREAMING_PATHS = [/\/logs\/stream$/, /\/uploads(\/|$)/];

const joinPath = (...parts: Array<string | string[] | undefined>) =>
  '/' +
  parts
    .map((part) => (Array.isArray(part) ? part[0] : part) ?? '')
    .join('/')
    .split('/')
    .filter(Boolean)
    .join('/');

// Every REST route an API token may call, read from Nest's own route metadata so the MCP
// catalog cannot drift from the controllers.
@Injectable()
export class McpCatalogService implements OnApplicationBootstrap {
  private entries: CatalogEntry[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onApplicationBootstrap() {
    this.entries = this.discovery.getControllers().flatMap(({ metatype, instance }) => {
      if (!metatype || !instance) return [];
      const prototype = Object.getPrototypeOf(instance);
      const base = Reflect.getMetadata(PATH_METADATA, metatype);

      return this.scanner.getAllMethodNames(prototype).flatMap((name) => {
        const handler = prototype[name];
        const method = METHODS[Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod];
        const route = Reflect.getMetadata(PATH_METADATA, handler);
        if (!method || route === undefined) return [];

        const path = joinPath(base, route);
        const flags = [IS_PUBLIC_KEY, SESSION_ONLY_KEY, TOKEN_ONLY_KEY].some((key) => this.reflector.getAllAndOverride<boolean>(key, [handler, metatype]));
        const params = Object.keys(Reflect.getMetadata(ROUTE_ARGS_METADATA, metatype, name) ?? {}).map((key) => Number(key.split(':')[0]));
        const interceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, handler)?.length;
        if (flags || interceptors || params.some((type) => RAW_PARAMS.has(type)) || STREAMING_PATHS.some((pattern) => pattern.test(path))) {
          return [];
        }

        return [{ method, path, controller: metatype.name.replace(/Controller$/, '') }];
      });
    });
  }

  list(readOnly: boolean): CatalogEntry[] {
    return readOnly ? this.entries.filter((entry) => entry.method === 'GET') : this.entries;
  }

  // Matches a concrete path ("/servers/lobby/start") against the catalog's patterns.
  find(method: string, path: string): CatalogEntry | undefined {
    const segments = path.split('?')[0].split('/').filter(Boolean);
    return this.entries.find((entry) => {
      if (entry.method !== method) return false;
      const pattern = entry.path.split('/').filter(Boolean);
      return pattern.length === segments.length && pattern.every((part, index) => part.startsWith(':') || part === segments[index]);
    });
  }
}
