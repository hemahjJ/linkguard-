import { NextFunction, Request, Response } from 'express';

type EventSeverity = 'warning' | 'critical';

export interface MonitorEvent {
  id: number;
  timestamp: string;
  severity: EventSeverity;
  title: string;
  detail: string;
  method: string;
  path: string;
  status: number;
}

interface MonitorSnapshot {
  status: 'online';
  uptimeSeconds: number;
  totalRequests: number;
  suspiciousRequests: number;
  blockedRequests: number;
  recentEvents: MonitorEvent[];
  activity: Array<{ label: string; requests: number; suspicious: number }>;
  summary: {
    criticalEvents: number;
    warningEvents: number;
    suspiciousPercent: number;
    trend: 'up' | 'down' | 'stable';
  };
}

const startedAt = Date.now();
let nextEventId = 1;
let totalRequests = 0;
let suspiciousRequests = 0;
let blockedRequests = 0;
const recentEvents: MonitorEvent[] = [];
const subscribers = new Set<Response>();
const ACTIVITY_WINDOW_MS = 5_000;
const ACTIVITY_BUCKET_COUNT = 12;
const activityBuckets = new Map<number, { requests: number; suspicious: number }>();

function currentActivityBucket(): { requests: number; suspicious: number } {
  const bucketId = Math.floor(Date.now() / ACTIVITY_WINDOW_MS);
  const existing = activityBuckets.get(bucketId);
  if (existing) return existing;

  const created = { requests: 0, suspicious: 0 };
  activityBuckets.set(bucketId, created);

  const cutoff = bucketId - ACTIVITY_BUCKET_COUNT;
  activityBuckets.forEach((_value, key) => {
    if (key < cutoff) activityBuckets.delete(key);
  });
  return created;
}

const suspiciousPathPattern =
  /(^|\/)(\.env|\.git|wp-admin|wp-login|phpmyadmin|xmlrpc\.php|cgi-bin|admin\/config|shell|backup|database)(\/|$)/i;
const injectionPattern =
  /(union\s+select|<script\b|javascript:|%3cscript|(?:^|[?&])(?:cmd|exec|command)=|(?:\.\.\/){2}|%00|(?:'|\")\s*(?:or|and)\s*(?:'|\")?\d+)/i;
const scannerAgentPattern =
  /(sqlmap|nikto|nmap|acunetix|nessus|masscan|gobuster|dirbuster|wpscan|burp|hydra)/i;

function publishEvent(event: MonitorEvent): void {
  recentEvents.unshift(event);
  if (recentEvents.length > 50) recentEvents.pop();

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  subscribers.forEach((subscriber) => {
    try {
      subscriber.write(payload);
    } catch {
      subscribers.delete(subscriber);
    }
  });
}

function safePath(req: Request): string {
  const path = req.originalUrl.split('?')[0].slice(0, 160);
  return path || '/';
}

export function monitorRequests(req: Request, res: Response, next: NextFunction): void {
  totalRequests++;
  currentActivityBucket().requests++;
  const path = safePath(req);
  const raw = `${req.originalUrl} ${req.headers['user-agent'] || ''}`;

  res.once('finish', () => {
    const scannerAgent = scannerAgentPattern.test(String(req.headers['user-agent'] || ''));
    const injectionAttempt = injectionPattern.test(raw);
    const suspiciousPath = suspiciousPathPattern.test(path);
    const blockedOrRejected = res.statusCode === 429 || res.statusCode === 403;

    if (!scannerAgent && !injectionAttempt && !suspiciousPath && !blockedOrRejected) return;

    suspiciousRequests++;
    currentActivityBucket().suspicious++;
    if (blockedOrRejected) blockedRequests++;

    let severity: EventSeverity = 'warning';
    let title = 'Suspicious request blocked';
    let detail = `The server returned ${res.statusCode}.`;

    if (scannerAgent) {
      severity = 'critical';
      title = 'Security scanner detected';
      detail = 'An automated security scanning user-agent was observed.';
    } else if (injectionAttempt) {
      severity = 'critical';
      title = 'Injection pattern detected';
      detail = 'SQL, script, command, or traversal patterns were found in the request.';
    } else if (suspiciousPath) {
      title = 'Reconnaissance path detected';
      detail = 'A request targeted a common admin, backup, source-control, or server-tool path.';
    } else if (res.statusCode === 429) {
      title = 'Rate limit triggered';
      detail = 'Automated or excessive requests were throttled.';
    } else if (res.statusCode === 403) {
      title = 'Forbidden request blocked';
      detail = 'The request was rejected by a security policy.';
    }

    publishEvent({
      id: nextEventId++,
      timestamp: new Date().toISOString(),
      severity,
      title,
      detail,
      method: req.method,
      path,
      status: res.statusCode
    });
  });

  next();
}

export function getMonitorSnapshot(): MonitorSnapshot {
  const nowBucket = Math.floor(Date.now() / ACTIVITY_WINDOW_MS);
  const activity = Array.from({ length: ACTIVITY_BUCKET_COUNT }, (_unused, index) => {
    const bucketId = nowBucket - (ACTIVITY_BUCKET_COUNT - 1 - index);
    const bucket = activityBuckets.get(bucketId);
    const bucketTime = new Date(bucketId * ACTIVITY_WINDOW_MS);
    return {
      label: bucketTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      requests: bucket?.requests || 0,
      suspicious: bucket?.suspicious || 0
    };
  });

  const currentWindow = activity.slice(6).reduce((total, bucket) => total + bucket.suspicious, 0);
  const previousWindow = activity.slice(0, 6).reduce((total, bucket) => total + bucket.suspicious, 0);
  const trendDifference = currentWindow - previousWindow;
  const trend: 'up' | 'down' | 'stable' =
    trendDifference > 0 ? 'up' : trendDifference < 0 ? 'down' : 'stable';

  return {
    status: 'online',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    totalRequests,
    suspiciousRequests,
    blockedRequests,
    recentEvents: [...recentEvents],
    activity,
    summary: {
      criticalEvents: recentEvents.filter(event => event.severity === 'critical').length,
      warningEvents: recentEvents.filter(event => event.severity === 'warning').length,
      suspiciousPercent: totalRequests
        ? Math.round((suspiciousRequests / totalRequests) * 100)
        : 0,
      trend
    }
  };
}

export function monitorStream(req: Request, res: Response): void {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  subscribers.add(res);
  req.on('close', () => subscribers.delete(res));
}
