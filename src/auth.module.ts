import { Module, HttpModule, DynamicModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JWT_MAPPER, OIDC_AUTHORITY, ROLE_EVALUATORS } from './consts';
import { RoleEvaluator } from './interfaces';
import { AuthService } from './services';
import { JwtStrategy } from './strategies';

export interface AuthModuleRegistrationOptions {
  oidcAuthority: string;
  roleEvaluators?: RoleEvaluator[];
  jwtMapper?: (payload: any) => any;
}

@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleRegistrationOptions): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        HttpModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      providers: [
        AuthService,
        JwtStrategy,
        {
          provide: OIDC_AUTHORITY,
          useValue: options.oidcAuthority,
        },
        {
          provide: ROLE_EVALUATORS,
          useValue: options.roleEvaluators || [],
        },
        {
          provide: JWT_MAPPER,
          useValue: options.jwtMapper ? options.jwtMapper : (payload) => payload,
        },
      ],
    };
  }
}
