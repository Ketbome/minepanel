import { ExecutionContext, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SESSION_ONLY_KEY } from '../decorators/session-only.decorator';
import { TOKEN_ONLY_KEY } from '../decorators/token-only.decorator';
import { API_TOKEN_PREFIX, ApiTokensService } from '../api-tokens.service';
import { PayloadToken } from '../models/token.model';

const READ_METHODS = new Set(['GET', 'HEAD']);

const unauthorized = () =>
  new HttpException(
    {
      status: HttpStatus.UNAUTHORIZED,
      error: 'Unauthorized',
    },
    HttpStatus.UNAUTHORIZED,
  );

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    // Resolved lazily: this guard is also instantiated by `@UseGuards` in modules that do not import AuthModule.
    private readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);

    if (isPublic) return true;

    const tokenOnly = this.reflector.getAllAndOverride<boolean>(TOKEN_ONLY_KEY, targets);
    const req = context.switchToHttp().getRequest<Request & { user?: PayloadToken }>();
    const [scheme, credential] = req.headers?.authorization?.split(' ') ?? [];
    if (scheme === 'Bearer' && credential?.startsWith(API_TOKEN_PREFIX)) {
      if (!req.user?.apiToken) {
        req.user = await this.moduleRef.get(ApiTokensService, { strict: false }).authenticate(credential);
      }
      if (this.reflector.getAllAndOverride<boolean>(SESSION_ONLY_KEY, targets)) {
        throw new ForbiddenException('API tokens cannot use this endpoint');
      }
      // Token-only routes (MCP) are POST by protocol; the calls they make re-enter this guard.
      if (req.user.apiToken.readOnly && !tokenOnly && !READ_METHODS.has(req.method)) {
        throw new ForbiddenException('This API token is read-only');
      }
      return true;
    }

    if (tokenOnly) {
      throw unauthorized();
    }

    return (await super.canActivate(context)) as boolean;
  }

  handleRequest(err, user, _info) {
    if (err || !user) {
      throw unauthorized();
    }

    return user;
  }
}
