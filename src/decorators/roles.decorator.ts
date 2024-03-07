import { SetMetadata } from '@nestjs/common';

export const ROLES_TOKEN = 'roles';

export const Roles = (...roles: string[]) => {
  // check to see if any roles have been passed
  const hasRoles: boolean =
    roles.length > 0 && !(roles.length === 1 && roles[0] === undefined);
  if (hasRoles) {
    return SetMetadata(ROLES_TOKEN, roles);
  } else {
    // if no roles have been set, then disable roles
    return SetMetadata(ROLES_TOKEN, false);
  }
};
