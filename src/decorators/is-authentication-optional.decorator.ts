import { SetMetadata } from '@nestjs/common';

export const IS_AUTHENTICATION_OPTIONAL_TOKEN = 'isAuthenticationOptional';

export const IsAuthenticationOptional = (isOptional: boolean = true) => {
  return SetMetadata(IS_AUTHENTICATION_OPTIONAL_TOKEN, isOptional);
};
