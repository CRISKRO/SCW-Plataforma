const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPERADMIN: ['*'],
  ADMIN: ['*'],
  STAFF: ['/admin', '/admin/events', '/admin/fighters', '/admin/school'],
  REPORTER: ['/admin', '/admin/chronicles'],
};

/**
 * Un rol administrativo no equivale a is_superuser.
 * La autorización real de la auditoría se hace también en Django.
 */
export function canAccessAdminPath(
  role: string | undefined,
  pathname: string,
  isSuperuser: boolean = false,
) {
  if (pathname === '/admin/auditoria' || pathname.startsWith('/admin/auditoria/')) {
    return role === 'SUPERADMIN' && isSuperuser;
  }

  const permissions = ROLE_PERMISSIONS[role ?? ''] ?? [];
  return permissions.includes('*') || permissions.some(path =>
    pathname === path || (path !== '/admin' && pathname.startsWith(path + '/'))
  );
}
