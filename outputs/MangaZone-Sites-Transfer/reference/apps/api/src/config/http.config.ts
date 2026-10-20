import { registerAs } from '@nestjs/config';

export default registerAs('http', () => {
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  return {
    corsAllowedOrigins: allowedOrigins,
    trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 0),
  };
});
