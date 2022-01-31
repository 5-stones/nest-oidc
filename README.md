# NestJS OIDC

A configurable OIDC library for NestJS and GraphQL or REST.

- [Install](#install)
- [Basic Setup & Usage](#basic-setup--usage)
- [Guards](#guards)
  - [REST](#rest-guard)
  - [GraphQL](#graphql-guard)
- [Current User](#current-user)
  - [REST](#rest-user)
  - [GraphQL](#graphql-user)
- [Roles](#roles)
- [Role Evaluators](#role-evaluators)
- [JWT Mapping](#jwt-mapping)
- [Release](#release)

## Install

Install `nest-oidc`:

```sh
npm i @5stones/nest-oidc
```

Install it's peer dependencies:

```sh
npm i @nestjs/jwt @nestjs/passport passport passport-jwt
```

:warning: Note: If you're using this package for GraphQL you'll need the
corresponding GQL libraries installed.
[Please follow the NestJS documentation first.](https://docs.nestjs.com/graphql/quick-start)

## Basic Setup & Usage

You'll need to import and configure the `AuthModule` in your application. This
package contains a JWT authentication strategy which will validate a JWT against
the issuer's public key. You must pass configure a value for the `oidcAuthority`.

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '@5stones/nest-oidc';

@Module({
  imports: [
    ...
    AuthModule.forRoot({
      oidcAuthority: 'http://iam.app.com/auth/realms/app',
    }),
  ],
})
export class AppModule {}
```

This will add the JWT validation strategy, and will verify any incoming JWT's
against the OIDC authorities public keys.

Finally, you should decorate your endpoints with the provided guards.

## Guards

This package exports two basic guards:

- `JwtAuthGuard` - for use in REST contexts.
- `JwtAuthGuardGraphQL` - for use in GQL contexts.

#### REST Guard

Applying the guard will require a valid JWT to be passed in order to access any
of the controller endpoints:

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles, JwtAuthGuard } from '@5stones/nest-oidc';

@UseGuards(JwtAuthGuard)
@Controller('cats')
export class CatsController {
  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
```

You can also use it on specific endpoints:

```ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles, JwtAuthGuard } from '@5stones/nest-oidc';

@Controller('cats')
export class CatsController {
  @UseGuards(JwtAuthGuard)
  @Post()
  create(): string {
    return 'This action adds a new cat';
  }

  @Get()
  findAll(): string {
    return 'This action returns all cats';
  }
}
```

#### GraphQL Guard

Applying the guard will require a valid JWT to be passed in order to access any
of the controller endpoints:

```ts
import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { JwtAuthGuardGraphQL } from '@5stones/nest-oidc';

@UseGuards(JwtAuthGuardGraphQL)
@Resolver(() => Cat)
export class CatResolver {
  ...
}
```

You can also use it on specific endpoints:

```ts
import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation } from '@nestjs/graphql';
import { JwtAuthGuardGraphQL } from '@5stones/nest-oidc';

@Resolver(() => Cat)
export class CatResolver {

  @Query(() => [Cat], { name: 'allCats' })
  async findAll() {
    ...
  }

  @UseGuards(JwtAuthGuardGraphQL)
  @Mutation(() => Cat, { name: 'createCat' })
  async create() {
    ...
  }
}
```

## Current User

This package exports two basic user decorators:

- `CurrentUser` - for use in REST contexts.
- `CurrentUserGraphQL` - for use in GQL contexts.

#### REST User

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles, JwtAuthGuard, CurrentUser } from '@5stones/nest-oidc';

@UseGuards(JwtAuthGuard)
@Controller('cats')
export class CatsController {
  @Get()
  findAll(@CurrentUser() user: any): string {
    return 'This action returns all cats';
  }
}
```


#### GraphQL User


```ts
import { UseGuards } from '@nestjs/common';
import { Resolver, Query } from '@nestjs/graphql';
import { JwtAuthGuardGraphQL, CurrentUserGraphQL } from '@5stones/nest-oidc';

@UseGuards(JwtAuthGuardGraphQL)
@Resolver(() => Cat)
export class CatResolver {

  @Query(() => [Cat], { name: 'allCats' })
  async findAll(@CurrentUserGraphQL() user: any) {
    ...
  }
}
```

## Roles

If you want to permission different endpoints based on properties of the JWT you
can do so using the `Roles` decorator in conjunction with the Auth Guards (both
REST & GQL). The `Roles` decorator will accept a list of `string`s and will
check if the user object accessing that endpoint has any of those strings in the
`user.roles` property. It expects the `user.roles` property to be a flat array
of strings.

#### Example

```ts
import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { JwtAuthGuardGraphQL, Roles } from '@5stones/nest-oidc';

@UseGuards(JwtAuthGuardGraphQL)
@Resolver(() => Cat)
export class CatResolver {

  @Query(() => [Cat], { name: 'allCats' })
  async findAll(): Promise<Cat[]> {
    ...
  }

  @Roles()
  @Query(() => Cat, { name: 'Cat' })
  async findOne(@Args('id', { type: () => ID }) id: number): Promise<Cat> {
    ...
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Mutation(() => Cat, { name: 'createCat' })
  async create(): Promise<Cat> {
    ...
  }
}
```

In this scenario, the mutation can only be executed by an `ADMIN` or `SUPER_ADMIN`
but the query can be executed by any user with a valid JWT.

:warning: Note: if you do not pass _any_ roles parameters to the `Roles`
decorator (i.e. `@Roles()`) it is the same as not adding the decorator at all.
That is to say, any scenario above the `findAll` and the `findOne` queries
behave identically.

## Role Evaluators

If your JWT doesn't natively have a `.roles` property of strings on it, you can
use evaluators to map properties of the JWT to a role. You can do so by
configuring `roleEvaluators`. `roleEvaluators` are an array of
`RoleEvaluator` objects which consist of an `expression`, and the access `role`
that that particular expression grants upon evaluating to `true`.

An `expression` can be any valid [`jexl`](https://www.npmjs.com/package/jexl)
expression.

#### Example

Suppose you have a JWT with the following structure:

```ts
{
  roles: [
     { name: "SUPER_USER", id: 1 },
     ...
     { name: "PREMIUM", id: 2 },
  ],
}
```

You could then configure an evaluator like the following, which would map a
user that has a `role` of with the name of `SUPER_USER` to the `ADMIN`
role in your application.

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '@5stones/nest-oidc';

@Module({
  imports: [
    ...
    AuthModule.forRoot({
      oidcAuthority: 'http://iam.app.com/auth/realms/app',
      roleEvaluators: [
        {
          expression: 'jwt.roles[.name == "SUPER_USER"]|length > 0',
          role: 'ADMIN',
        },
      ],
    }),
  ],
})
export class AppModule {}
```

The user object within your application will now have the following:

```ts
{
  ...
  roles: [
    "ADMIN",
  ],
}
```

Then you would simply decorate your endpoint with the `@Roles('ADMIN')`
annotation in order to lock it down to users of that role.

## JWT Mapper

By default, the JWT payload is passed as the user into the application. However,
if you need to map the JWT payload to different structure you can pass the
`jwtMapper` option:

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '@5stones/nest-oidc';

@Module({
  imports: [
    ...
    AuthModule.forRoot({
      oidcAuthority: 'http://iam.app.com/auth/realms/app',
      jwtMapper: async (payload: any) => ({
        id: payload.sub,
        email: payload.email,
        ...
      }),
    }),
  ],
})
export class AppModule {}
```

## Release

The standard release command for this project is:
```
npm version [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease | from-git]
```

This command will:

1. Generate/update the Changelog
1. Bump the package version
1. Tag & pushing the commit


e.g.

```
npm version 1.2.17
npm version patch // 1.2.17 -> 1.2.18
```
