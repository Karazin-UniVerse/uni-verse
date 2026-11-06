import type { GripPushManifest, GripPushUpdate } from '../types/grip-hosted.ts';

function compareUpdate(left: GripPushUpdate, right: GripPushUpdate): number {
  const leftKey = [left.remoteRef, left.localRef, left.remoteOid, left.localOid].join('\0');
  const rightKey = [right.remoteRef, right.localRef, right.remoteOid, right.localOid].join('\0');

  if (leftKey === rightKey) {
    return 0;
  }

  return leftKey < rightKey ? -1 : 1;
}

export function canonicalizeGripManifest(manifest: GripPushManifest): string {
  const updates = [...manifest.updates].sort(compareUpdate).map((update) => ({
    localRef: update.localRef,
    localOid: update.localOid,
    remoteRef: update.remoteRef,
    remoteOid: update.remoteOid,
  }));

  return JSON.stringify({
    repository: manifest.repository,
    updates,
    policyVersion: manifest.policyVersion,
    diffDigest: manifest.diffDigest,
  });
}

export async function createGripBindingDigest(manifest: GripPushManifest): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalizeGripManifest(manifest));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
