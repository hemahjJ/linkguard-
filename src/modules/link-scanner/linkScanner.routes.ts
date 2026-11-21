import { Router } from 'express';
import { scanUrlHandler } from './linkScanner.controller';
import { validate } from '../../middleware/validation';
import { scanUrlSchema } from './linkScanner.schemas';
import { linkScannerRateLimiter } from '../../middleware/rateLimiter';
import { noCache } from '../../middleware/securityHeaders';

const router = Router();

router.post('/', linkScannerRateLimiter, noCache, validate(scanUrlSchema), scanUrlHandler);

export const linkScannerRouter = router;
