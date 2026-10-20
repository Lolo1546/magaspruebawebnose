import { registerAs } from '@nestjs/config';

export default registerAs('csrf', () => {
  return {
    secret: process.env.CSRF_SECRET as string,
  };
});
