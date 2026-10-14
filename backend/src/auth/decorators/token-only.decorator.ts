import { SetMetadata } from '@nestjs/common';

// Routes only an API token may reach, so a logged-in browser tab cannot be driven into them.
export const TOKEN_ONLY_KEY = 'tokenOnly';
export const TokenOnly = () => SetMetadata(TOKEN_ONLY_KEY, true);
