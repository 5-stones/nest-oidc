import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_AUTHENTICATION_OPTIONAL_TOKEN, ROLES_TOKEN } from 'src/decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(protected readonly reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    return context.switchToHttp().getRequest();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthOptional = this.reflector.get<boolean>(IS_AUTHENTICATION_OPTIONAL_TOKEN, context.getHandler());

    try {
      await super.canActivate(context)
    } catch (err) {
      const isUnauthorized = err instanceof UnauthorizedException;
      if (!isUnauthorized || isUnauthorized && !isAuthOptional) {
        throw err;
      }
    }

    const roles = this.reflector.get<string[]>(ROLES_TOKEN, context.getHandler());
    if (!roles) {
      return true;
    }

    const request = this.getRequest(context);
    const user = request.user;

    if (!user) {
      return true;
    } else {
      return (
        user &&
        user.roles &&
        user.roles.some((role: string) => roles.includes(role))
      );
    }
  }
}
