import * as fs from 'node:fs';

// Docker bind-mounts /etc/hostname, /etc/hosts and /etc/resolv.conf from
// <data-root>/containers/<id>/, so mountinfo carries the full id of the running
// container whatever HOSTNAME says, on cgroup v1 and v2 alike.
const MOUNTINFO_ID = /\/containers\/([0-9a-f]{64})\/(?:hostname|hosts|resolv\.conf)(?=\s|$)/;

export function containerIdFromMountinfo(mountinfo: string): string | undefined {
  return MOUNTINFO_ID.exec(mountinfo)?.[1];
}

function readMountinfo(): string {
  try {
    return fs.readFileSync('/proc/self/mountinfo', 'utf8');
  } catch {
    return '';
  }
}

/**
 * Ids `docker inspect` may know this container by, most likely first.
 *
 * HOSTNAME is the short id Docker assigned at creation, but a tool that recreates
 * the container by copying its old Config (Watchtower does) carries the *previous*
 * id over as the hostname, so inspecting it answers "No such object" from inside
 * the very container it names. The id in mountinfo is always the current one.
 */
export function ownContainerIds(mountinfo = readMountinfo()): string[] {
  const ids = [process.env.HOSTNAME?.trim(), containerIdFromMountinfo(mountinfo)];
  return [...new Set(ids.filter((id): id is string => !!id))];
}

export function isInsideContainer(mountinfo = readMountinfo()): boolean {
  return fs.existsSync('/.dockerenv') || !!containerIdFromMountinfo(mountinfo);
}
