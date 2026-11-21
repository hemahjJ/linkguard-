/**
 * AegisLoom Security Lab — Administrator Authentication Controller
 */

import { Request, Response, NextFunction } from 'express';
import {
  authenticateAdmin,
  setupMfa,
  confirmMfaActivation,
  refreshAccessToken
} from './auth.service';

export async function loginAdminHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password, mfaCode } = req.body;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authenticateAdmin(username, password, mfaCode, ipAddress, userAgent);

    if (result.requireMfa) {
      res.status(200).json({
        success: true,
        requireMfa: true,
        message: 'MFA challenge required to complete administrator authentication.',
        tempToken: result.tempToken
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Administrator authentication successful.',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
}

export async function setupMfaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.admin!.adminId;
    const mfaData = await setupMfa(adminId);

    res.status(200).json({
      success: true,
      message: 'MFA secret generated. Scan QR code or enter secret in Authenticator app.',
      secret: mfaData.secret,
      otpauthUri: mfaData.otpauthUri
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmMfaHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = req.admin!.adminId;
    const { mfaCode } = req.body;

    await confirmMfaActivation(adminId, mfaCode);

    res.status(200).json({
      success: true,
      message: 'Multi-Factor Authentication successfully activated for administrator account.'
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshTokenHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const newAccessToken = await refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    next(error);
  }
}

export function getCurrentAdminHandler(req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    admin: req.admin
  });
}
