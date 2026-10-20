import { registerAs } from '@nestjs/config';

export default registerAs('cookie', () => {
  return {
    name: process.env.SESSION_COOKIE_NAME || 'mz_session',
    isProduction: process.env.NODE_ENV === 'production',
  };
});
