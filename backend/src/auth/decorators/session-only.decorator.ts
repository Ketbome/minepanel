import { SetMetadata } from '@nestjs/common';

// Routes an API token must never reach: minting tokens, credentials, roles and the like.
export const SESSION_ONLY_KEY = 'sessionOnly';
export const SessionOnly = () => SetMetadata(SESSION_ONLY_KEY, true);
