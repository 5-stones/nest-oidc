import { SetMetadata } from '@nestjs/common';

export const AccessLevel = (...levels: string[]) => SetMetadata('accessLevels', levels);
