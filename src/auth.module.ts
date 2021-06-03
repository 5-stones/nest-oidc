import { Module, HttpModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './services';
import { JwtStrategy } from './strategies';

@Module({
  imports: [
    HttpModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
  ],
})
export class AuthModule {}
