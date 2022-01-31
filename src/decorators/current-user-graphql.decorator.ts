import { createParamDecorator, ExecutionContext } from '@nestjs/common';

let graphql;
try {
  graphql = require('@nestjs/graphql');
} catch (e) {}

export const CurrentUserGraphQL = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = graphql.GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
