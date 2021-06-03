# NestJS OIDC

- [Install](#install)
- [Basic Setup & Usage](#basic-setup--usage)
- [Access Levels](#access-levels)
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


Finally, you should decorate your endpoints with the provided guards:


## Access Levels

If you want to permission different endpoints based on properties of the JWT you
can configure `accessLevelEvaluators`. `accessLevelEvaluators` are an array of
`AccessLevelEvaluator` objects which consist of an `expression`, and the access `level`
that that particular expression grants upon evaluating to `true`.

An `expression` can be any valid [`jexl`](https://www.npmjs.com/package/jexl) expression.

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
user that has a `role` of with the name of `SUPER_USER` to the `ADMIN` access
level in your application.

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '@5stones/nest-oidc';

@Module({
  imports: [
    ...
    AuthModule.forRoot({
      oidcAuthority: 'http://iam.app.com/auth/realms/app',
      accessLevelEvaluators: [
        {
          expression: 'jwt.roles[.name == "SUPER_USER"]|length > 0',
          level: 'ADMIN',
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
  accessLevels: [
    "ADMIN",
  ],
}
```

Now we can protect certain endpoints by adding the `AccessLevel` guard.

```ts
import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { AccessLevel, JwtAuthGuardGraphQL } from '@5stones/nest-oidc';

@UseGuards(JwtAuthGuardGraphQL)
@Resolver(() => Foo)
export class FooResolver {
  ...

  @Query(() => [Foo], { name: 'allFoos' })
  async find(@Args() query: PaginationArgs) {
    return this.service.findAllWithPaginationArgs(query);
  }

  @AccessLevel('ADMIN')
  @Mutation(() => Foo, { name: 'deleteFoo' })
  async remove(@Args('id', { type: () => ID }) id: number) {
    return this.service.remove(id);
  }
}
```

In this scenario, the mutation can only be executed by an `ADMIN` but the query
can be executed by any user with a valid JWT.


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
