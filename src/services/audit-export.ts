interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  statusCode: number | null;
  durationMs: number | null;
  createdAt: Date;
}

export function exportToJson(logs: AuditLog[], pretty = false): string {
  return JSON.stringify(
    {
      exported: new Date().toISOString(),
      count: logs.length,
      logs: logs.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      })),
    },
    null,
    pretty ? 2 : undefined
  );
}

export function exportToCsv(logs: AuditLog[]): string {
  const header = 'id,userId,action,resource,ipAddress,createdAt';
  const rows = logs.map((l) =>
    [l.id, l.userId ?? '', l.action, l.resource, l.ipAddress ?? '', l.createdAt.toISOString()]
      .map((v) => escapeCSV(v))
      .join(',')
  );
  return [header, ...rows].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function filterLogs(
  logs: AuditLog[],
  filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }
): AuditLog[] {
  return logs.filter((log) => {
    if (filters.userId && log.userId !== filters.userId) return false;
    if (filters.action && log.action !== filters.action) return false;
    if (filters.resource && log.resource !== filters.resource) return false;
    if (filters.startDate && log.createdAt < filters.startDate) return false;
    if (filters.endDate && log.createdAt > filters.endDate) return false;
    return true;
  });
}
