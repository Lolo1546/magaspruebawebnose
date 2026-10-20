export type AdminPagination = {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly pageCount: number;
};

export type AdminIdentity = {
  readonly username: string | null;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
};

export type AdminUser = AdminIdentity & {
  readonly status: string;
  readonly createdAt: string;
  readonly roles: readonly string[];
  readonly directPermissionGrants: readonly string[];
};

export type AdminCommunity = {
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly owner: AdminIdentity;
  readonly createdAt: string;
  readonly memberCount: number;
};

export type AdminScanlationGroup = {
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly founder: AdminIdentity | null;
  readonly createdAt: string;
  readonly memberCount: number;
};

export type AdminList<T> = {
  readonly items: readonly T[];
  readonly pagination: AdminPagination;
};

export type AdminDashboard = {
  readonly users: {
    readonly total: number;
    readonly active: number;
    readonly pendingVerification: number;
    readonly suspended: number;
    readonly pendingDeletion: number;
    readonly deleted: number;
  };
  readonly activeCommunities: number;
  readonly verifiedScanlationGroups: number;
  readonly creationRequests: {
    readonly community: {
      readonly pending: number;
      readonly needsInfo: number;
    };
    readonly scanlationGroup: {
      readonly pending: number;
      readonly needsInfo: number;
    };
    readonly attentionRequired: number;
  };
};

export type AdminDirectoryKind = "users" | "communities" | "scanlation-groups";

export type AdminDirectoryFilters = {
  readonly search?: string;
  readonly status?: string;
  readonly hasRole?: string;
  readonly page: number;
};

export type CreationRequestStatus =
  "PENDING" | "NEEDS_INFO" | "APPROVED" | "REJECTED";

export type AdminCreationRequest = {
  readonly id: string;
  readonly proposedName: string;
  readonly description: string | null;
  readonly language?: string;
  readonly website?: string | null;
  readonly status: CreationRequestStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt: string | null;
  readonly reviewReason: string | null;
  readonly requester: {
    readonly id: string;
    readonly username: string | null;
    readonly displayName: string | null;
  };
};

export type AdminCreationRequestList = {
  readonly items: readonly AdminCreationRequest[];
  readonly pagination: AdminPagination;
};

export type AdminRequestKind = "community" | "scanlation-group";

export const ADMIN_GLOBAL_ROLES = ["USER", "MODERATOR", "ADMIN"] as const;
export type AdminGlobalRole = (typeof ADMIN_GLOBAL_ROLES)[number];

export const ADMIN_DIRECT_PERMISSIONS = [
  "moderate.manga_comments",
  "moderate.communities",
  "moderate.scanlations",
] as const;
export type AdminDirectPermission = (typeof ADMIN_DIRECT_PERMISSIONS)[number];

export type AdminUserMutation =
  | {
      readonly family: "role";
      readonly command: "grant" | "revoke";
      readonly key: AdminGlobalRole;
    }
  | {
      readonly family: "permission";
      readonly command: "grant" | "revoke";
      readonly key: AdminDirectPermission;
    }
  | {
      readonly family: "account";
      readonly command: "suspend" | "restore";
    };
