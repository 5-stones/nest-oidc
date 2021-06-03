import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';

import { JwtUser } from '../dto';

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

    const levels = this.reflector.get<string[]>('accessLevels', context.getHandler());
    if (!levels) {
      return true;
    }

    const request = this.getRequest(context);
    const user: JwtUser = request.user;
    return user && user.accessLevels
      && user.accessLevels.some((level) => levels.includes(level));
  }
}
