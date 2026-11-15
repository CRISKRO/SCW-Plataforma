const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPERADMIN: ['*'],
  ADMIN: ['*'],
  STAFF: ['/admin', '/admin/events', '/admin/fighters', '/admin/school'],
  REPORTER: ['/admin', '/admin/chronicles'],
};

export function canAccessAdminPath(role: string | undefined, pathname: string) {
  const permissions = ROLE_PERMISSIONS[role ?? ''] ?? [];
  return permissions.includes('*') || permissions.some(path =>
    pathname === path || (path !== '/admin' && pathname.startsWith(path + '/'))
  );
}
