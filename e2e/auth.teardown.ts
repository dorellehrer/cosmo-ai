import { test as teardown } from '@playwright/test';
import fs from 'fs';

teardown('remove auth state', async () => {
  // Clean up the stored auth state
  if (fs.existsSync('.auth/user.json')) {
    fs.unlinkSync('.auth/user.json');
  }
});
