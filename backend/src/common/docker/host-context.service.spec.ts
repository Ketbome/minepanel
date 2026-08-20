import { HostContextService } from './host-context.service';

const execMock = jest.fn();
jest.mock('node:child_process', () => ({
  exec: (command: string, callback: (...args: unknown[]) => void) => {
    const result = execMock(command);
    if (result instanceof Error) {
      callback(result, null);
      return;
    }
    callback(null, { stdout: result ?? '', stderr: '' });
  },
}));

describe('HostContextService', () => {
  let service: HostContextService;
  const originalHostname = process.env.HOSTNAME;

  const labels = (value: Record<string, string>) => JSON.stringify(value);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOSTNAME = 'abc123def';
    service = new HostContextService();
  });

  afterAll(() => {
    process.env.HOSTNAME = originalHostname;
  });

  it('reads how the panel was started from its own compose labels', async () => {
    execMock.mockReturnValue(
      labels({
        'com.docker.compose.project': 'minepanel',
        'com.docker.compose.project.working_dir': '/opt/minepanel',
        'com.docker.compose.project.config_files': '/opt/minepanel/docker-compose.yml',
        'com.docker.compose.service': 'backend',
      }),
    );

    expect(await service.get()).toEqual({
      project: 'minepanel',
      workingDir: '/opt/minepanel',
      configFiles: ['/opt/minepanel/docker-compose.yml'],
      service: 'backend',
    });
  });

  it('splits a multi-file compose invocation, preserving order', async () => {
    execMock.mockReturnValue(
      labels({
        'com.docker.compose.project.config_files': '/opt/a/docker-compose.yml, /opt/a/override.yml',
        'com.docker.compose.service': 'minepanel',
      }),
    );

    const context = await service.get();

    expect(context.configFiles).toEqual(['/opt/a/docker-compose.yml', '/opt/a/override.yml']);
  });

  it('inspects the container only once', async () => {
    execMock.mockReturnValue(labels({ 'com.docker.compose.service': 'backend' }));

    await service.get();
    await service.get();

    expect(execMock).toHaveBeenCalledTimes(1);
  });

  it('returns an empty context instead of throwing when docker inspect fails', async () => {
    execMock.mockReturnValue(new Error('no such container'));

    expect(await service.get()).toEqual({ configFiles: [] });
  });

  it('returns an empty context when the panel is not running in a container', async () => {
    delete process.env.HOSTNAME;
    service = new HostContextService();

    expect(await service.get()).toEqual({ configFiles: [] });
    expect(execMock).not.toHaveBeenCalled();
  });

  it('does not fail on a container with no compose labels at all', async () => {
    execMock.mockReturnValue('{}');

    expect(await service.get()).toEqual({ configFiles: [] });
  });
});
