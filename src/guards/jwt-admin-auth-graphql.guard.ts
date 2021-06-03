import { Injectable, ExecutionContext } from '@nestjs/common';

import { JwtAuthGuardGraphQL } from './jwt-auth-graphql.guard';
import { JwtUser } from '../dto';

@Injectable()
export class JwtAdminAuthGuardGraphQL extends JwtAuthGuardGraphQL {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!await super.canActivate(context)) {
      return false;
    }

    const request = this.getRequest(context);
    const user: JwtUser = request.user;
    return user.isAdmin;
  }
}
