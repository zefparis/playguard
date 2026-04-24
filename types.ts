export type PlayGuardVerdict = 'ALLOWED' | 'MINOR' | 'BANNED' | 'VERIFY_AGE';

export interface ScanResult {
  scanId: string;
  playerId: string;
  boardId: string;
  platform: string;
  verdict: PlayGuardVerdict;
  access: boolean;
  age: {
    range: { Low: number; High: number };
    isMinor: boolean;
    isAmbiguous: boolean;
    threshold: number;
    ambiguityNote: string | null;
  };
  ban: { detected: boolean; similarity?: number; faceId?: string; externalId?: string };
  quality: { Brightness: number; Sharpness: number };
  faceConfidence: number;
  timestamp: string;
}

export interface BanRecord {
  faceId: string;
  externalId: string;
  reason: string;
  operator: string;
  bannedAt: string;
  metadata?: Record<string, unknown>;
}
