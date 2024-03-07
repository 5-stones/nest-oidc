import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
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

type SecretOrKeyProviderCallback = (error, secret: false | string) => void;
type SecretOrKeyProvider = (
  request,
  rawJwtToken,
  done: SecretOrKeyProviderCallback,
) => void;
@Injectable()
export class AuthService {
  private _oidcConfig: any | null = null;
  private jwksClient: Promise<JwksClient>;

  constructor(
    @Inject(ROLE_EVALUATORS)
    protected readonly evaluators: RoleEvaluator[],
    @Inject(OIDC_AUTHORITY)
    protected readonly oidcAuthority: string,
    @Inject(JWT_MAPPER)
    protected readonly jwtMapper: (payload: any) => any,
    protected readonly httpService: HttpService,
  ) {
    this.jwksClient = this.getJwksClient();
  }

  async getJwksClient(): Promise<JwksClient> {
    const { jwks_uri } = await this.oidcConfig();
    return new JwksClient({
      jwksUri: jwks_uri,
    });
  }

  async oidcConfig(): Promise<any> {
    if (this._oidcConfig) return this._oidcConfig;

    try {
      const source$ = this.httpService.get(
        `${this.oidcAuthority}/.well-known/openid-configuration`,
      );
      const response = await lastValueFrom(source$);
      this._oidcConfig = response.data;
      return this._oidcConfig;
    } catch (err) {
      throw new BadRequestException(
        'There was an error when attempting to fetch openid-configuration',
        { cause: err },
      );
    }
  }

  async getPublicKey(rawJwtToken): Promise<string> {
    const result = jsonwebtoken.decode(rawJwtToken, { complete: true });

    if (result && typeof result !== 'string' && result.header) {
      const { header } = result;
      const kid = header.kid;
      const client = await this.jwksClient;
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
}
