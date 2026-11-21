/**
 * AegisLoom Security Lab — Training Certificate Generator
 * Produces verifiable completion records and vector SVG certificates for training only.
 */

import crypto from 'crypto';
import { env } from '../config/env';

export interface CertificateData {
  certificateId: string;
  anonymousLearnerId: string;
  moduleTitle: string;
  completionDate: string;
  scorePercentage: number;
  verificationHash: string;
}

export function generateCertificateData(
  anonymousLearnerId: string,
  moduleId: string,
  moduleTitle: string,
  score: number,
  totalQuestions: number
): CertificateData {
  const timestamp = new Date().toISOString();
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const randomSalt = crypto.randomBytes(4).toString('hex').toUpperCase();
  const certificateId = `AEGIS-CERT-${Date.now().toString(36).toUpperCase()}-${randomSalt}`;

  // Cryptographic signature verifying authenticity without revealing PII
  const hashPayload = `${certificateId}:${anonymousLearnerId}:${moduleId}:${score}:${timestamp}`;
  const verificationHash = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(hashPayload)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  const scorePercentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 100;

  return {
    certificateId,
    anonymousLearnerId,
    moduleTitle,
    completionDate: dateStr,
    scorePercentage,
    verificationHash
  };
}

/**
 * Renders a vector SVG certificate for download / embedding
 */
export function renderCertificateSvg(cert: CertificateData): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1000" height="700" viewBox="0 0 1000 700" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark Blue SOC Background -->
  <rect width="1000" height="700" rx="16" fill="#060B17"/>
  <rect x="20" y="20" width="960" height="660" rx="12" stroke="#1C3260" stroke-width="2"/>
  <rect x="30" y="30" width="940" height="640" rx="8" stroke="#00F5D4" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="8 6"/>

  <!-- Watermark -->
  <text x="500" y="390" font-family="'Inter', sans-serif" font-size="70" font-weight="900" fill="#FFFFFF" fill-opacity="0.02" text-anchor="middle" transform="rotate(-20 500 390)">TRAINING SIMULATION ONLY</text>

  <!-- AegisLoom Logo & Header -->
  <g transform="translate(470, 70)">
    <rect width="60" height="60" rx="12" fill="#0A1329" stroke="#00F5D4" stroke-width="2"/>
    <path d="M30 14L45 22V36C45 44 38 49 30 52C22 49 15 44 15 36V22L30 14Z" stroke="#00F5D4" stroke-width="2.5" fill="none"/>
    <circle cx="30" cy="33" r="5" fill="#38BDF8"/>
  </g>

  <text x="500" y="160" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#00F5D4" letter-spacing="4" text-anchor="middle">AEGISLOOM SECURITY LAB</text>
  <text x="500" y="185" font-family="'Inter', sans-serif" font-size="11" font-weight="500" fill="#94A3B8" letter-spacing="2" text-anchor="middle">DEFENSIVE HUMAN-LAYER SECURITY CAPABILITY VERIFICATION</text>

  <!-- Main Certificate Title -->
  <text x="500" y="245" font-family="'Inter', sans-serif" font-size="32" font-weight="900" fill="#FFFFFF" text-anchor="middle">CERTIFICATE OF SIMULATION DEFENSE</text>

  <!-- Statement -->
  <text x="500" y="295" font-family="'Inter', sans-serif" font-size="13" font-weight="500" fill="#64748B" letter-spacing="1.5" text-anchor="middle">THIS IS TO CERTIFY THAT ANONYMOUS LEARNER ID</text>
  
  <rect x="250" y="315" width="500" height="42" rx="6" fill="#0F1C3D" stroke="#2D4F8F" stroke-width="1"/>
  <text x="500" y="342" font-family="'Courier New', monospace" font-size="18" font-weight="700" fill="#38BDF8" text-anchor="middle">${cert.anonymousLearnerId}</text>

  <text x="500" y="395" font-family="'Inter', sans-serif" font-size="14" font-weight="400" fill="#CBD5E1" text-anchor="middle">has successfully completed authorized phishing defense training for</text>
  <text x="500" y="425" font-family="'Inter', sans-serif" font-size="20" font-weight="800" fill="#FFFFFF" text-anchor="middle">${cert.moduleTitle}</text>

  <!-- Metrics Grid -->
  <g transform="translate(200, 470)">
    <rect width="600" height="60" rx="8" fill="#0A1329" stroke="#1C3260" stroke-width="1"/>
    
    <text x="100" y="25" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#64748B" text-anchor="middle">COMPLETION SCORE</text>
    <text x="100" y="47" font-family="'Courier New', monospace" font-size="16" font-weight="800" fill="#00F5D4" text-anchor="middle">${cert.scorePercentage}% PROFICIENT</text>

    <line x1="200" y1="12" x2="200" y2="48" stroke="#1C3260"/>

    <text x="300" y="25" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#64748B" text-anchor="middle">VERIFIED DATE</text>
    <text x="300" y="47" font-family="'Inter', sans-serif" font-size="14" font-weight="600" fill="#FFFFFF" text-anchor="middle">${cert.completionDate}</text>

    <line x1="400" y1="12" x2="400" y2="48" stroke="#1C3260"/>

    <text x="500" y="25" font-family="'Inter', sans-serif" font-size="10" font-weight="600" fill="#64748B" text-anchor="middle">SECURITY HASH</text>
    <text x="500" y="47" font-family="'Courier New', monospace" font-size="14" font-weight="700" fill="#FBBF24" text-anchor="middle">${cert.verificationHash}</text>
  </g>

  <!-- Legal & Educational Disclaimer -->
  <rect x="220" y="565" width="560" height="26" rx="13" fill="#FB923C" fill-opacity="0.1" stroke="#F97316" stroke-width="1"/>
  <text x="500" y="582" font-family="'Inter', sans-serif" font-size="10.5" font-weight="600" fill="#FDBA74" text-anchor="middle">⚠️ AUTHORIZED TRAINING SIMULATION ONLY • NO EXTERNAL CREDENTIAL ACCREDITATION</text>

  <!-- Certificate ID Footer -->
  <text x="500" y="640" font-family="'Courier New', monospace" font-size="11" font-weight="500" fill="#475569" text-anchor="middle">CERTIFICATE ID: ${cert.certificateId}</text>
</svg>`;
}
