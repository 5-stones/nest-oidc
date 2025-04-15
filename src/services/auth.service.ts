import {
  Injectable,
  Inject,
  OnModuleInit,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { SecretOrKeyProvider } from 'passport-jwt';
import { lastValueFrom } from 'rxjs';
import * as jsonwebtoken from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import * as jexl from 'jexl';
import { JWT_MAPPER, OIDC_AUTHORITY, ROLE_EVALUATORS } from '../consts';
import { RoleEvaluator } from '../interfaces';

const length = (elem: any) => (elem ? elem.length : 0);
const mapValue = (obj: any) => (obj ? obj.map((value) => ({ value })) : []);
jexl.addTransform('length', length);
jexl.addTransform('mapValue', mapValue);

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private _oidcConfig: Promise<any> | undefined;
  private _jwksClient: Promise<JwksClient> | undefined;

  constructor(
    @Inject(ROLE_EVALUATORS)
    protected readonly evaluators: RoleEvaluator[],
    @Inject(OIDC_AUTHORITY)
    protected readonly oidcAuthority: string,
    @Inject(JWT_MAPPER)
    protected readonly jwtMapper: (payload: any) => any,
    protected readonly httpService: HttpService,
  ) {}

  onModuleInit() {
    // attempt to eagerly load the jwksClient
    this.getJwksClient().catch((err) => {
      this.logger.warn(`Failed to load JWKS client on init: ${err}`);
    });
  }

  async getJwksClient(): Promise<JwksClient> {
    if (!this._jwksClient) {
      this._jwksClient = this.loadJwksClient().catch((err) => {
        // allow retry by clearing the cached promise
        this._jwksClient = undefined;
        throw err;
      });
    }
    return await this._jwksClient;
  }

  async oidcConfig(): Promise<any> {
    if (!this._oidcConfig) {
      this._oidcConfig = this.loadOidcConfig().catch((err) => {
        // allow retry by clearing the cached promise
        this._oidcConfig = undefined;
        throw err;
      });
    }
    return await this._oidcConfig;
  }

  async getPublicKey(rawJwtToken: string): Promise<string> {
    const result = jsonwebtoken.decode(rawJwtToken, { complete: true });

    if (result && typeof result !== 'string' && result.header) {
      const { header } = result;
      const kid = header.kid;
      const client = await this.getJwksClient();
      const key = await client.getSigningKey(kid);
      return key.getPublicKey();
    }

    throw new Error('No header could be decoded from the JWT.');
  }

  get keyProvider(): SecretOrKeyProvider {
    return (request, rawJwtToken, done) => {
      this.getPublicKey(rawJwtToken)
        .then((key: string) => {
          done(null, key);
        })
        .catch((error) => {
          this.logger.error(`Error fetching public key: ${error}`);
          // @ts-expect-error (types don't match documentation)
          done(error, false);
        });
    };
  }

  async validate(payload: any): Promise<any> {
    const user: any = this.jwtMapper(payload);

    if (this.evaluators?.length) {
      const roles: string[] = [];

      for (const evaluator of this.evaluators) {
        try {
          let hasRole = await jexl.eval(evaluator.expression, { jwt: payload });
          hasRole = !!hasRole; // explicitly cast to boolean

          if (hasRole) {
            roles.push(evaluator.role);
          }
        } catch (err) {
          throw new Error(`Error evaluating JWT role '${evaluator.role}'.`);
        }
      }

      user.roles = roles;
    }

    return user;
  }

  private async loadJwksClient(): Promise<JwksClient> {
    const { jwks_uri } = await this.oidcConfig();
    return new JwksClient({
      jwksUri: jwks_uri,
    });
  }

  private async loadOidcConfig(): Promise<any> {
    try {
      const source$ = this.httpService.get(
        `${this.oidcAuthority}/.well-known/openid-configuration`,
      );
      const response = await lastValueFrom(source$);
      return response.data;
    } catch (err) {
      // this only bubbles up to the keyProvider error log
      throw new ServiceUnavailableException(
        `Failed to fetch openid-configuration: ${err}`,
        { cause: err },
      );
    }
  }
}
