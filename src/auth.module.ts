import { Module, HttpModule, DynamicModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { ACCESS_EVALUATORS, OIDC_AUTHORITY } from './consts';
import { AccessLevelEvaluator } from './interfaces';
import { AuthService } from './services';
import { JwtStrategy } from './strategies';

export interface AuthModuleRegistrationOptions {
  oidcAuthority: string;
  accessLevelEvaluators?: AccessLevelEvaluator[];
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
          provide: ACCESS_EVALUATORS,
          useValue: options.accessLevelEvaluators || [],
        },
      ],
    };
  }
}
