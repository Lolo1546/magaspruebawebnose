import { registerAs } from '@nestjs/config';

export const sessionConfig = registerAs('session', () => ({
  maxAgeDays: Number(process.env.SESSION_MAX_AGE_DAYS || '30'),
  idleTimeoutDays: Number(process.env.SESSION_IDLE_TIMEOUT_DAYS || '7'),
  touchThrottleMinutes: Number(
    process.env.SESSION_TOUCH_THROTTLE_MINUTES || '5',
  ),
}));
