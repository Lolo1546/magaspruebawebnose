import { SetMetadata } from '@nestjs/common';
import { AUTH_CONSTANTS } from '../constants/auth.constants.js';

export const Public = () => SetMetadata(AUTH_CONSTANTS.IS_PUBLIC_KEY, true);
