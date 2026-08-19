'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/services/users/users.service';

// The backend is what enforces `changeServerVersion`; this only keeps the panel
// from staging a change that would come back as 403.
export const useCanChangeVersion = (): boolean => {
  const [canChangeVersion, setCanChangeVersion] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setCanChangeVersion(user.role === 'ADMIN' || user.access.permissions.changeServerVersion))
      .catch(() => setCanChangeVersion(true));
  }, []);

  return canChangeVersion;
};
