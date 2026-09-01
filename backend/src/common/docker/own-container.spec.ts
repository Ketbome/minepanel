import { containerIdFromMountinfo, isInsideContainer, ownContainerIds } from './own-container';

const ID = 'a'.repeat(64);
const MOUNTINFO = [
  '742 731 0:38 / / rw,relatime - overlay overlay rw,lowerdir=/var/lib/docker/overlay2/l/ABC',
  `757 742 8:1 /var/lib/docker/containers/${ID}/resolv.conf /etc/resolv.conf rw,relatime - ext4 /dev/sda1 rw`,
  `758 742 8:1 /var/lib/docker/containers/${ID}/hostname /etc/hostname rw,relatime - ext4 /dev/sda1 rw`,
  `759 742 8:1 /var/lib/docker/containers/${ID}/hosts /etc/hosts rw,relatime - ext4 /dev/sda1 rw`,
].join('\n');

describe('own-container', () => {
  const originalHostname = process.env.HOSTNAME;

  afterEach(() => {
    process.env.HOSTNAME = originalHostname;
  });

  describe('containerIdFromMountinfo', () => {
    it('reads the full container id off the /etc/hostname bind', () => {
      expect(containerIdFromMountinfo(MOUNTINFO)).toBe(ID);
    });

    it('accepts a custom data root', () => {
      expect(containerIdFromMountinfo(`1 2 8:1 /mnt/docker/containers/${ID}/hostname /etc/hostname rw - ext4 /dev/sdb rw`)).toBe(ID);
    });

    it('returns undefined outside a container', () => {
      expect(containerIdFromMountinfo('24 1 8:1 / / rw,relatime - ext4 /dev/sda1 rw')).toBeUndefined();
      expect(containerIdFromMountinfo('')).toBeUndefined();
    });

    it('ignores paths that only look like a container dir', () => {
      expect(containerIdFromMountinfo(`1 2 8:1 /containers/${ID}/data /data rw - ext4 /dev/sda1 rw`)).toBeUndefined();
      expect(containerIdFromMountinfo('1 2 8:1 /containers/abc/hostname /etc/hostname rw - ext4 /dev/sda1 rw')).toBeUndefined();
    });
  });

  describe('ownContainerIds', () => {
    it('tries HOSTNAME first and the mountinfo id second', () => {
      process.env.HOSTNAME = 'abc123def456';

      expect(ownContainerIds(MOUNTINFO)).toEqual(['abc123def456', ID]);
    });

    // Watchtower copies the old Config, hostname included, so HOSTNAME names a
    // container that no longer exists. mountinfo still has the right one.
    it('still knows the id when HOSTNAME is stale', () => {
      process.env.HOSTNAME = 'deadbeef0000';

      expect(ownContainerIds(MOUNTINFO)).toContain(ID);
    });

    it('does not repeat an id HOSTNAME and mountinfo agree on', () => {
      process.env.HOSTNAME = ID;

      expect(ownContainerIds(MOUNTINFO)).toEqual([ID]);
    });

    it('is empty with no HOSTNAME and no container mounts', () => {
      delete process.env.HOSTNAME;

      expect(ownContainerIds('')).toEqual([]);
    });
  });

  describe('isInsideContainer', () => {
    it('is true when mountinfo shows a container id', () => {
      expect(isInsideContainer(MOUNTINFO)).toBe(true);
    });

    it('is false on a plain host', () => {
      expect(isInsideContainer('24 1 8:1 / / rw,relatime - ext4 /dev/sda1 rw')).toBe(false);
    });
  });
});
