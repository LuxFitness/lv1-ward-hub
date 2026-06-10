import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

export const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 2,             // Start slowing after 2 attempts
  delayMs: (hits) => hits * 500,
});
