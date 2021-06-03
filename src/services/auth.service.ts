import { Injectable, Inject, HttpService } from '@nestjs/common';
import * as jsonwebtoken from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import * as jexl from 'jexl';

import { ACCESS_EVALUATORS, OIDC_AUTHORITY } from '../consts';
import { AccessLevelEvaluator } from '../interfaces';
import { JwtUser } from '../dto';

const length = (elem: any) => elem ? elem.length : 0;
const mapValue = (obj: any) => obj ? obj.map(value => ({ value })) : [];
jexl.addTransform('length', length);
jexl.addTransform('mapValue', mapValue);

type SecretOrKeyProviderCallback = (error, secret: false|string) => void;
type SecretOrKeyProvider = (request, rawJwtToken, done: SecretOrKeyProviderCallback) => void;

interface JwksKey {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
  x5c: string[];
  x5t: string;
}

@Injectable()
export class AuthService {
  private _oidcConfig: any | null = null;
  private jwksClient: Promise<JwksClient>;

  constructor(
    @Inject(ACCESS_EVALUATORS)
    protected readonly evaluators: AccessLevelEvaluator[],
    @Inject(OIDC_AUTHORITY)
    protected readonly oidcAuthority: string,
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

    const response = await this.httpService
      .get(`${this.oidcAuthority}/.well-known/openid-configuration`)
      .toPromise()
    ;

    this._oidcConfig = response.data;
    return this._oidcConfig;
  }

  async getPublicKey(rawJwtToken): Promise<string> {
    const result = jsonwebtoken.decode(rawJwtToken, { complete: true });

    if (result && typeof result !== 'string' && result.header) {
      const { header } = result;
      const kid =  header.kid;
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
        .catch(error => {
          done(error, false);
        })
      ;
    };
  }

  async validate(payload: any): Promise<JwtUser> {
    const accessLevels: string[] = [];

    for (const evaluator of this.evaluators) {
      try {
        let hasAccessLevel = await jexl.eval(evaluator.expression, { jwt: payload });
        hasAccessLevel = !!hasAccessLevel; // explicitly cast to boolean

        if (hasAccessLevel) {
          accessLevels.push(evaluator.level);
        }
      } catch (err) {
        throw new Error(`Error evaluating JWT access level '${evaluator.level}'.`);
      }
    }

    return {
      id: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      client: payload.azp,
      accessLevels,
    };
  }
}
