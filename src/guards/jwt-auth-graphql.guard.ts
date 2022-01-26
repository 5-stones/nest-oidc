import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuardGraphQL extends AuthGuard('jwt') {
  constructor(protected readonly reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!await super.canActivate(context)) {
      return false;
    }

    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }

    const request = this.getRequest(context);
    const user = request.user;
    return user && user.roles
      && user.roles.some((role: string) => roles.includes(role));
  }
}
