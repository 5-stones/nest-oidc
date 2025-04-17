import { createParamDecorator, ExecutionContext } from '@nestjs/common';

let graphql;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  graphql = require('@nestjs/graphql');
} catch (e) {}

export const CurrentUserGraphQL = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = graphql.GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
