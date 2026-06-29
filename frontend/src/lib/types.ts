// ─── Account Types ─────────────────────────────────────────────────────────────

export interface Account {
  _id: string;
  serviceProvider: string;
  attributes: Record<string, string | null>;
  passwordHistory?: { password: string; changedAt: string }[];
  passwordLastChangedAt?: string;
  isFavorite?: boolean;
  isVault?: boolean;
  tags?: string[];
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  daysUntilExpiry?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedAccounts {
  [serviceProvider: string]: Account[];
}

// ─── Import Types ──────────────────────────────────────────────────────────────

export interface ImportEntry {
  serviceProvider: string;
  attributes: Record<string, string | null>;
}

export interface ImportConflict {
  incoming: ImportEntry;
  existing: Account;
}

export interface ImportAnalysis {
  toInsert: ImportEntry[];
  conflicts: ImportConflict[];
  summary: {
    newCount: number;
    conflictCount: number;
  };
}

export type ConflictResolution = "ignore" | "update" | "add_new";

export interface ConflictDecision {
  existingId: string;
  resolution: ConflictResolution;
  incoming: ImportEntry;
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}

export interface AccountsResponse {
  accounts: Account[];
  grouped: GroupedAccounts;
  vault?: VaultStatus;
}

export interface VaultStatus {
  mfaEnabled: boolean;
  unlocked: boolean;
  unlockedUntil: string | null;
  unlockMinutes: number;
}

export interface ProvidersResponse {
  providers: string[];
}

export interface ImportResolveResponse {
  success: boolean;
  summary: {
    inserted: number;
    updated: number;
    ignored: number;
    errors: string[];
  };
}

// ─── Audit Log Types ──────────────────────────────────────────────────────────

export interface AuditLogEntry {
  _id: string;
  action: string;
  entity: "account" | "settings" | "auth" | "import" | "export";
  entityId?: string;
  details: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
}

// ─── Tags Types ────────────────────────────────────────────────────────────────

export interface TagsResponse {
  tags: string[];
}

// ─── Veshtit JSON Format ───────────────────────────────────────────────────────

export type VeshtitJson = {
  [serviceProvider: string]: Record<string, string | null>[];
};

// ─── Auth Types ────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  identifier?: string;
  username?: string;
  password?: string;
}

export interface RegisterCredentials {
  email?: string;
  username?: string;
  password?: string;
}

export interface AuthResponse {
  success: boolean;
  username?: string;
  role?: string;
  features?: { vault?: boolean };
  mfaRequired?: boolean;
  tempToken?: string;
  error?: string;
}
