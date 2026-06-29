import type {
  Account,
  AccountsResponse,
  ProvidersResponse,
  ImportAnalysis,
  ImportEntry,
  ConflictDecision,
  ImportResolveResponse,
  AuditLogsResponse,
  TagsResponse,
  VaultStatus,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse
} from "./types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    credentials: "include", // send httpOnly cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(response.status, body.error || "Request failed");
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    return request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  verifyMfa: (tempToken: string, code: string) =>
    request<{ success: boolean; username: string }>("/api/auth/verify-mfa", {
      method: "POST",
      body: JSON.stringify({ tempToken, code }),
    }),

  logout: () =>
    request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),

  verify: () =>
    request<{ authenticated: boolean; username: string | null; role: string; features: { vault: boolean }; sessionId: string | null }>("/api/auth/verify"),
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminApi = {
  getUsers: () =>
    request<{ users: any[] }>("/api/admin/users"),

  updateUser: (userId: string, updates: any) =>
    request<{ success: boolean }>(`/api/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  getAuditLogs: () =>
    request<{ logs: any[] }>("/api/admin/audit"),

  getMetrics: () =>
    request<{ metrics: { totalUsers: number; activeUsers: number; totalAccounts: number; totalLinks: number; totalAuditLogs: number; activeSessions: number } }>("/api/admin/metrics"),
};

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsApi = {
  generateMfa: () =>
    request<{ success: boolean; qrCode: string; secret: string }>("/api/settings/mfa/generate", {
      method: "POST",
    }),

  enableMfa: (code: string) =>
    request<{ success: boolean }>("/api/settings/mfa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  disableMfa: (password: string) =>
    request<{ success: boolean }>("/api/settings/mfa/disable", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  changeUsername: (newUsername: string) =>
    request<{ ok: boolean; message: string; newUsername: string }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ action: "changeUsername", newUsername }),
    }),

  updateVaultSettings: (vaultUnlockMinutes: number) =>
    request<{ ok: boolean; message: string }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ action: "updateVaultSettings", vaultUnlockMinutes }),
    }),
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface SessionAuditEntry {
  timestamp: string;
  action: string;
  details: string;
}

export interface Session {
  _id: string;
  sessionId: string;
  username: string;
  loginAt: string;
  lastActiveAt: string;
  expiresAt: string;
  logoutAt?: string;
  terminatedAt?: string;
  status: "active" | "expired" | "logged_out" | "terminated";
  ipAddress: string;
  userAgent: string;
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  os: string;
  browser: string;
  auditLog: SessionAuditEntry[];
}

export const sessionsApi = {
  list: () =>
    request<{ sessions: Session[]; currentSessionId: string | null }>("/api/sessions"),

  terminate: (sessionId: string) =>
    request<{ success: boolean }>(`/api/sessions/${sessionId}`, { method: "DELETE" }),
};

// ─── Accounts ─────────────────────────────────────────────────────────────────

export const accountsApi = {
  list: (filter?: string, tag?: string, vault?: boolean) => {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    if (tag) params.set("tag", tag);
    if (vault) params.set("vault", "true");
    const qs = params.toString();
    return request<AccountsResponse>(`/api/accounts${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) =>
    request<{ account: Account }>(`/api/accounts/${id}`),

  create: (
    serviceProvider: string,
    attributes: Record<string, string | null>,
    tags?: string[]
  ) =>
    request<{ account: Account }>("/api/accounts", {
      method: "POST",
      body: JSON.stringify({ serviceProvider, attributes, tags }),
    }),

  update: (
    id: string,
    data: {
      serviceProvider?: string;
      attributes?: Record<string, string | null>;
      tags?: string[];
      isFavorite?: boolean;
      isVault?: boolean;
    }
  ) =>
    request<{ account: Account }>(`/api/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  toggleFavorite: (id: string, isFavorite: boolean) =>
    request<{ account: Account }>(`/api/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify({ isFavorite }),
    }),

  moveToVault: (id: string, isVault: boolean) =>
    request<{ account: Account }>(`/api/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify({ isVault }),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/api/accounts/${id}`, {
      method: "DELETE",
    }),

  share: (id: string, expiresIn: number | null, allowedAttributes: string[]) =>
    request<{ token: string }>(`/api/accounts/${id}/share`, {
      method: "POST",
      body: JSON.stringify({ expiresIn, allowedAttributes }),
    }),

  getShares: (id: string) =>
    request<{ links: any[] }>(`/api/accounts/${id}/share`),

  revokeShare: (id: string, linkId: string) =>
    request<{ success: boolean }>(`/api/accounts/${id}/share?linkId=${linkId}`, {
      method: "DELETE",
    }),
};

// ─── सन्दूक ──────────────────────────────────────────────────────────────────

export const vaultApi = {
  status: () => request<VaultStatus>("/api/vault/status"),

  unlock: (code: string) =>
    request<{ success: boolean; unlockedUntil: string; unlockMinutes: number }>("/api/vault/unlock", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};

// ─── Providers ────────────────────────────────────────────────────────────────

export const providersApi = {
  list: () => request<ProvidersResponse>("/api/providers"),
};

// ─── Import ───────────────────────────────────────────────────────────────────

export const importApi = {
  analyze: (jsonData: Record<string, unknown>) =>
    request<ImportAnalysis>("/api/import", {
      method: "POST",
      body: JSON.stringify(jsonData),
    }),

  resolve: (toInsert: ImportEntry[], resolutions: ConflictDecision[]) =>
    request<ImportResolveResponse>("/api/import/resolve", {
      method: "POST",
      body: JSON.stringify({ toInsert, resolutions }),
    }),
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const exportApi = {
  /**
   * Downloads the export JSON file directly by triggering a browser download.
   */
  download: async () => {
    const response = await fetch(`${BACKEND_URL}/api/export`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new ApiError(response.status, "Export failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `veshtit-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const tagsApi = {
  list: () => request<TagsResponse>("/api/tags"),
};

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogsApi = {
  list: (limit?: number, entity?: string) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (entity) params.set("entity", entity);
    const qs = params.toString();
    return request<AuditLogsResponse>(`/api/audit-logs${qs ? `?${qs}` : ""}`);
  },
};

// ─── Share ────────────────────────────────────────────────────────────────────

export const shareApi = {
  get: (token: string) => request<any>(`/api/share/${token}`),
};

export { ApiError };
