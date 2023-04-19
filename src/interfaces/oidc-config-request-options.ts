import { HttpService } from '@nestjs/axios';

export type OidcConfigRequestOptions = Parameters<HttpService['get']>[1];
