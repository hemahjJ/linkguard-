import { Router, Request, Response } from 'express';
import { getMonitorSnapshot, monitorStream } from './monitor.service';
import { noCache } from '../../middleware/securityHeaders';

const router = Router();

router.get('/status', noCache, (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    ...getMonitorSnapshot()
  });
});

router.get('/stream', (_req: Request, res: Response) => {
  monitorStream(_req, res);
});

export const monitorRouter = router;
