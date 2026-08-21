import { resolveHostPath, type DockerMount } from './config';

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
