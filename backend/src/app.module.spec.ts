import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';
import { AppModule } from './app.module';

// Unit tests mock every provider, so a service injected across a module boundary
// that was never imported still passes them and only fails when the app starts.
// This compiles the real module graph, which is what catches that.
describe('AppModule wiring', () => {
  let workDir: string;

  const realConfig = new ConfigService();

  beforeAll(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'minepanel-app-'));
    await fs.ensureDir(path.join(workDir, 'servers'));
    await fs.ensureDir(path.join(workDir, 'data'));
  });

  afterAll(async () => {
    await fs.remove(workDir);
  });

  it('resolves every provider, so no service depends on a module that is not imported', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue({
        // Redirect the paths that are absolute in production; everything else
        // falls through to the real configuration.
        get: (key: string) => {
          if (key === 'serversDir') return path.join(workDir, 'servers');
          if (key === 'serversHostDir') return `${workDir}/servers`;
          if (key === 'database') return { path: path.join(workDir, 'data', 'test.db') };
          if (key === 'jwtSecret') return 'test-secret-for-module-compilation';
          return realConfig.get(key);
        },
      })
      .compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  }, 30000);
});
