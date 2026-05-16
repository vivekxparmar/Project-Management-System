export interface AuditLog {
  _id: string;
  projectId: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar: string;
  };
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string;
  changes: Record<string, { old: any; new: any }>;
  metadata: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}
