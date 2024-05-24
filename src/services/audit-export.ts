interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  ip: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export function exportToJson(logs: AuditLog[], pretty = false): string {
  return JSON.stringify(
    {
      exported: new Date().toISOString(),
      count: logs.length,
      logs: logs.map((l) => ({
        ...l,
        timestamp: l.timestamp.toISOString(),
      })),
    },
    null,
    pretty ? 2 : undefined
  );
}

export function exportToCsv(logs: AuditLog[]): string {
  const header = 'id,userId,action,resource,ip,timestamp';
  const rows = logs.map((l) =>
    [l.id, l.userId, l.action, l.resource, l.ip, l.timestamp.toISOString()]
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
    if (filters.startDate && log.timestamp < filters.startDate) return false;
    if (filters.endDate && log.timestamp > filters.endDate) return false;
    return true;
  });
}
