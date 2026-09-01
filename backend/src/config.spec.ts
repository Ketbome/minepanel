import { readOwnMounts, resolveHostPath, type DockerMount } from './config';

describe('resolveHostPath', () => {
  const bind = (source: string, destination: string): DockerMount => ({ Type: 'bind', Source: source, Destination: destination });
  const volume = (name: string, destination: string, driver = 'local'): DockerMount => ({
    Type: 'volume',
    Name: name,
    Driver: driver,
    Source: `/var/lib/docker/volumes/${name}/_data`,
    Destination: destination,
  });
  const subpathVolume = (name: string, destination: string, subpath: string): DockerMount => ({
    ...volume(name, destination),
    Subpath: subpath,
  });

  it('returns the bind source as the host path', () => {
    const mounts = [bind('/srv/minepanel/servers', '/app/servers'), bind('/srv/minepanel/data', '/app/data')];

    expect(resolveHostPath(mounts, '/app/servers')).toBe('/srv/minepanel/servers');
    expect(resolveHostPath(mounts, '/app/data')).toBe('/srv/minepanel/data');
  });

  // The bug: deriving the parent of the source dropped `_data`, so every generated
  // mount pointed at a directory the daemon then created, empty.
  it('keeps _data when the mount is a named volume', () => {
    expect(resolveHostPath([volume('minepanel_data', '/app/servers')], '/app/servers')).toBe('/var/lib/docker/volumes/minepanel_data/_data');
  });

  it('appends the remainder when a parent directory is mounted', () => {
    const mounts = [volume('minepanel_all', '/app')];

    expect(resolveHostPath(mounts, '/app/servers')).toBe('/var/lib/docker/volumes/minepanel_all/_data/servers');
    expect(resolveHostPath(mounts, '/app/data')).toBe('/var/lib/docker/volumes/minepanel_all/_data/data');
  });

  // `docker inspect .Mounts` reports the volume root as Source even when only a subpath is
  // mounted, so without the subpath the router bind landed next to the real data.
  it('appends the subpath a volume was mounted with', () => {
    const mounts = [subpathVolume('minepanel_data', '/app/servers', 'servers'), subpathVolume('minepanel_data', '/app/data', 'data')];

    expect(resolveHostPath(mounts, '/app/servers')).toBe('/var/lib/docker/volumes/minepanel_data/_data/servers');
    expect(resolveHostPath(mounts, '/app/data')).toBe('/var/lib/docker/volumes/minepanel_data/_data/data');
  });

  it('appends the subpath before the remainder', () => {
    expect(resolveHostPath([subpathVolume('minepanel_data', '/app', 'panel')], '/app/data')).toBe(
      '/var/lib/docker/volumes/minepanel_data/_data/panel/data',
    );
  });

  it('prefers the deepest mount containing the path', () => {
    const mounts = [bind('/srv/minepanel', '/app'), bind('/mnt/big-disk/servers', '/app/servers')];

    expect(resolveHostPath(mounts, '/app/servers')).toBe('/mnt/big-disk/servers');
    expect(resolveHostPath(mounts, '/app/data')).toBe('/srv/minepanel/data');
  });

  it('refuses a volume on a non-local driver instead of guessing its host path', () => {
    expect(resolveHostPath([volume('nfs_data', '/app/servers', 'nfs')], '/app/servers')).toBeUndefined();
  });

  it('ignores mounts that do not contain the path', () => {
    expect(resolveHostPath([bind('/var/run/docker.sock', '/var/run/docker.sock')], '/app/servers')).toBeUndefined();
    expect(resolveHostPath([], '/app/servers')).toBeUndefined();
  });
});

describe('readOwnMounts', () => {
  const inspectOutput = JSON.stringify({
    mounts: [{ Type: 'volume', Name: 'minepanel_data', Source: '/var/lib/docker/volumes/minepanel_data/_data', Destination: '/app/data' }],
    spec: [{ Target: '/app/data', VolumeOptions: { Subpath: 'data' } }],
  });
  const noSuchObject = (id: string) => Object.assign(new Error(`Command failed: docker inspect ${id}`), { stderr: `Error: No such object: ${id}\n`, status: 1 });
  const timeout = () => Object.assign(new Error('spawnSync docker ETIMEDOUT'), { code: 'ETIMEDOUT', signal: 'SIGTERM' });

  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('copies the volume subpath onto the mount it belongs to', () => {
    const inspect = jest.fn().mockReturnValue(inspectOutput);

    expect(readOwnMounts(['abc'], true, inspect)).toEqual([expect.objectContaining({ Destination: '/app/data', Subpath: 'data' })]);
  });

  // The bug: a container recreated with the previous container's hostname made the
  // inspect fail, and that was indistinguishable from running outside Docker.
  it('falls through to the next id when the first one is not a container', () => {
    const inspect = jest.fn((id: string) => {
      if (id === 'stale') throw noSuchObject(id);
      return inspectOutput;
    });

    expect(readOwnMounts(['stale', 'current'], true, inspect)).toHaveLength(1);
    expect(inspect).toHaveBeenCalledTimes(2);
  });

  it('does not retry an id the daemon does not know', () => {
    const inspect = jest.fn((id: string) => {
      throw noSuchObject(id);
    });

    readOwnMounts(['stale'], true, inspect, 3, 0);

    expect(inspect).toHaveBeenCalledTimes(1);
  });

  it('retries when the daemon is too slow to answer', () => {
    const inspect = jest.fn().mockImplementationOnce(() => {
      throw timeout();
    });
    inspect.mockReturnValue(inspectOutput);

    expect(readOwnMounts(['abc'], true, inspect, 3, 0)).toHaveLength(1);
    expect(inspect).toHaveBeenCalledTimes(2);
  });

  it('reports unknown mounts, not "no mounts", when it is in a container it cannot inspect', () => {
    const inspect = jest.fn((id: string) => {
      throw noSuchObject(id);
    });

    expect(readOwnMounts(['stale'], true, inspect, 3, 0)).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No such object: stale'));
  });

  it('gives up after the last attempt on a daemon that never answers', () => {
    const inspect = jest.fn(() => {
      throw timeout();
    });

    expect(readOwnMounts(['abc'], true, inspect, 2, 0)).toBeUndefined();
    expect(inspect).toHaveBeenCalledTimes(2);
  });

  it('treats a failed inspect outside a container as local dev', () => {
    const inspect = jest.fn(() => {
      throw new Error('spawnSync docker ENOENT');
    });

    expect(readOwnMounts(['my-laptop'], false, inspect)).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('is empty outside a container with no id to try', () => {
    expect(readOwnMounts([], false, jest.fn())).toEqual([]);
  });
});
