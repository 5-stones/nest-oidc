import { Injectable, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

let graphql;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  graphql = require('@nestjs/graphql');
} catch (e) {}

@Injectable()
export class JwtAuthGuardGraphQL extends JwtAuthGuard {
  getRequest(context: ExecutionContext) {
    const ctx = graphql.GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
