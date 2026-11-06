import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import type { GripPushManifest } from '../../types/grip-hosted.ts';
import { canonicalizeGripManifest, createGripBindingDigest } from '../grip-hosted.ts';

const manifest: GripPushManifest = {
  repository: 'Karazin-UniVerse/uni-verse',
  updates: [
    {
      localRef: 'refs/heads/z',
      localOid: 'b'.repeat(40),
      remoteRef: 'refs/heads/z',
      remoteOid: 'a'.repeat(40),
    },
    {
      localRef: 'refs/heads/a',
      localOid: 'd'.repeat(40),
      remoteRef: 'refs/heads/a',
      remoteOid: 'c'.repeat(40),
    },
  ],
  policyVersion: 'hosted-v1',
  diffDigest: 'e'.repeat(64),
};

describe('hosted Grip push binding', () => {
  it('should canonicalize update and property order independently of caller order', () => {
    const canonical = canonicalizeGripManifest(manifest);

    assert.equal(
      canonical,
      '{"repository":"Karazin-UniVerse/uni-verse","updates":[{"localRef":"refs/heads/a","localOid":"dddddddddddddddddddddddddddddddddddddddd","remoteRef":"refs/heads/a","remoteOid":"cccccccccccccccccccccccccccccccccccccccc"},{"localRef":"refs/heads/z","localOid":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","remoteRef":"refs/heads/z","remoteOid":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}],"policyVersion":"hosted-v1","diffDigest":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"}',
    );
    assert.equal(
      canonicalizeGripManifest({ ...manifest, updates: [...manifest.updates].reverse() }),
      canonical,
    );
    assert.equal(manifest.updates[0].localRef, 'refs/heads/z');
  });

  it('should bind the exact repository, refs, object IDs, diff and policy', async () => {
    const binding = await createGripBindingDigest(manifest);
    const canonical = canonicalizeGripManifest(manifest);

    assert.equal(binding, createHash('sha256').update(canonical, 'utf8').digest('hex'));

    for (const changed of [
      { ...manifest, repository: 'other/repository' },
      { ...manifest, policyVersion: 'hosted-v2' },
      { ...manifest, diffDigest: 'f'.repeat(64) },
      { ...manifest, updates: [{ ...manifest.updates[0], remoteOid: '0'.repeat(40) }] },
      { ...manifest, updates: [{ ...manifest.updates[0], localOid: '0'.repeat(40) }] },
      { ...manifest, updates: [{ ...manifest.updates[0], remoteRef: 'refs/heads/other' }] },
    ]) {
      assert.notEqual(await createGripBindingDigest(changed), binding);
    }
  });
});
