import { NextFunction, Request, Response } from 'express';
import { isIP } from 'node:net';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

type RiskLevel = 'low' | 'suspicious' | 'malicious';
type SignalSeverity = 'low' | 'medium' | 'high';

interface ScanSignal {
  severity: SignalSeverity;
  title: string;
  detail: string;
}

interface ReputationResult {
  provider: 'VirusTotal';
  status: 'not_requested' | 'not_configured' | 'not_found' | 'available' | 'unavailable';
  message: string;
  malicious?: number;
  suspicious?: number;
  harmless?: number;
  undetected?: number;
}

const suspiciousTlds = new Set([
  'buzz', 'click', 'country', 'gq', 'link', 'mom', 'rest', 'tk', 'top', 'work', 'xyz', 'zip', 'mov'
]);

const baitWords = ['account', 'auth', 'bonus', 'confirm', 'crypto', 'login', 'password', 'secure', 'support', 'update', 'verify', 'wallet'];
const sensitiveParameter = /(access_?token|api_?key|auth|code|credential|key|password|passwd|secret|session|sig(nature)?|token)/i;

function isPrivateNetworkHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host === 'localhost' || host.endsWith('.local') || host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) {
    return true;
  }

  if (isIP(host) !== 4) return false;

  const [first, second] = host.split('.').map(Number);
  return first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168);
}

function normalizePublicHttpUrl(rawUrl: string): URL {
  const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new AppError('Enter a valid http:// or https:// link.', 400, 'INVALID_URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('Only http:// and https:// links can be checked.', 400, 'UNSUPPORTED_URL_PROTOCOL');
  }

  if (!parsed.hostname || parsed.username || parsed.password) {
    throw new AppError('Links containing embedded usernames or passwords cannot be checked.', 400, 'UNSAFE_URL_FORMAT');
  }

  if (isPrivateNetworkHost(parsed.hostname)) {
    throw new AppError('Private-network and local links cannot be checked.', 400, 'PRIVATE_NETWORK_URL');
  }

  if (Array.from(parsed.searchParams.keys()).some(key => sensitiveParameter.test(key))) {
    throw new AppError('Remove session tokens, reset codes, or other private parameters before checking a link.', 400, 'PRIVATE_URL_BLOCKED');
  }

  parsed.hash = '';
  return parsed;
}

function analyzeLocally(url: URL): { score: number; signals: ScanSignal[] } {
  const signals: ScanSignal[] = [];
  let score = 0;

  const addSignal = (severity: SignalSeverity, title: string, detail: string, points: number) => {
    signals.push({ severity, title, detail });
    score += points;
  };

  const hostname = url.hostname.toLowerCase();
  const hostnameParts = hostname.split('.');
  const tld = hostnameParts.at(-1) || '';
  const combined = `${hostname}${url.pathname}`.toLowerCase();

  if (url.protocol === 'http:') {
    addSignal('medium', 'No HTTPS encryption', 'The link uses HTTP instead of HTTPS, so traffic may be exposed or altered in transit.', 15);
  }

  if (hostname.includes('xn--')) {
    addSignal('high', 'Punycode domain', 'This link uses an internationalized domain that can visually imitate another domain.', 30);
  }

  if (isIP(hostname)) {
    addSignal('high', 'IP address used as host', 'Legitimate public services usually use a named domain instead of a raw IP address.', 28);
  }

  if (suspiciousTlds.has(tld)) {
    addSignal('medium', 'Higher-risk domain ending', `The .${tld} ending is commonly abused in short-lived scam campaigns.`, 18);
  }

  const hyphenCount = (hostname.match(/-/g) || []).length;
  if (hyphenCount >= 3) {
    addSignal('medium', 'Heavily hyphenated domain', 'Several hyphens can be a sign of an impersonation or disposable campaign domain.', 12);
  }

  if (hostnameParts.length >= 5) {
    addSignal('medium', 'Many subdomains', 'Long subdomain chains can hide the actual registered domain on small screens.', 12);
  }

  const foundBaitWords = baitWords.filter(word => combined.includes(word));
  if (foundBaitWords.length >= 2) {
    addSignal('medium', 'Credential or urgency wording', 'The address combines multiple login, account, or verification terms often used in phishing lures.', 12);
  }

  if (url.port && url.port !== '80' && url.port !== '443') {
    addSignal('low', 'Unusual network port', `The link uses port ${url.port} instead of the typical web ports.`, 8);
  }

  if (url.toString().length > 160) {
    addSignal('low', 'Very long link', 'Long links can make it harder to spot the real destination and meaningful parameters.', 6);
  }

  return { score: Math.min(score, 100), signals };
}

async function lookupVirusTotal(url: string, allowExternalLookup: boolean): Promise<ReputationResult> {
  if (!allowExternalLookup) {
    return {
      provider: 'VirusTotal',
      status: 'not_requested',
      message: 'Live reputation lookup was not requested. This result uses local risk signals only.'
    };
  }

  if (!env.LINK_REPUTATION_ENABLED || !env.VIRUSTOTAL_API_KEY) {
    return {
      provider: 'VirusTotal',
      status: 'not_configured',
      message: 'Live reputation lookup is not configured yet. This result uses local risk signals only.'
    };
  }

  try {
    const urlId = Buffer.from(url).toString('base64url');
    const response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: {
        accept: 'application/json',
        'x-apikey': env.VIRUSTOTAL_API_KEY
      },
      signal: AbortSignal.timeout(8000)
    });

    if (response.status === 404) {
      return {
        provider: 'VirusTotal',
        status: 'not_found',
        message: 'No existing public reputation report was found for this link.'
      };
    }

    if (!response.ok) {
      return {
        provider: 'VirusTotal',
        status: 'unavailable',
        message: 'Live reputation lookup is temporarily unavailable. Local checks are still shown.'
      };
    }

    const payload = await response.json() as {
      data?: { attributes?: { last_analysis_stats?: Record<string, unknown> } };
    };
    const stats = payload.data?.attributes?.last_analysis_stats || {};
    const count = (name: string) => typeof stats[name] === 'number' ? stats[name] as number : 0;

    return {
      provider: 'VirusTotal',
      status: 'available',
      message: 'Live public reputation data was found for this link.',
      malicious: count('malicious'),
      suspicious: count('suspicious'),
      harmless: count('harmless'),
      undetected: count('undetected')
    };
  } catch {
    return {
      provider: 'VirusTotal',
      status: 'unavailable',
      message: 'Live reputation lookup timed out or is unavailable. Local checks are still shown.'
    };
  }
}

export async function scanUrlHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const url = normalizePublicHttpUrl(req.body.url);
    const local = analyzeLocally(url);
    const reputation = await lookupVirusTotal(url.toString(), req.body.allowExternalLookup);

    let risk: RiskLevel = local.score >= 45 ? 'suspicious' : 'low';
    let score = local.score;

    if ((reputation.malicious || 0) > 0) {
      risk = 'malicious';
      score = Math.max(score, 90);
      local.signals.unshift({
        severity: 'high',
        title: 'Threat detection reported',
        detail: `${reputation.malicious} reputation engine(s) reported this link as malicious.`
      });
    } else if ((reputation.suspicious || 0) > 0) {
      risk = 'suspicious';
      score = Math.max(score, 65);
      local.signals.unshift({
        severity: 'high',
        title: 'Suspicious reputation reported',
        detail: `${reputation.suspicious} reputation engine(s) marked this link as suspicious.`
      });
    }

    logger.info('Link check completed.', {
      hostname: url.hostname,
      risk,
      liveLookup: reputation.status
    });

    res.status(200).json({
      success: true,
      normalizedUrl: url.toString(),
      hostname: url.hostname,
      risk,
      score,
      summary: risk === 'malicious'
        ? 'Threat intelligence has flagged this link. Do not open it.'
        : risk === 'suspicious'
          ? 'This link has risk indicators. Verify it through an independent, trusted source before opening it.'
          : 'No high-risk indicators were found. This is not a guarantee that the link is safe.',
      signals: local.signals,
      reputation
    });
  } catch (err) {
    next(err);
  }
}
