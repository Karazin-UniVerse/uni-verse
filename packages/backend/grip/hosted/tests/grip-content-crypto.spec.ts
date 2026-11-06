import { decryptGripContent, encryptGripContent } from '../grip-content-crypto';

const keyring = new Map([['test-v1', Buffer.alloc(32, 7)]]);
const parameters = {
  checkPublicId: 'opaque-check',
  payloadVersion: 1,
  keyring,
};

describe('hosted Grip encrypted content', () => {
  it('should preserve UTF-8 bytes and use a different nonce for each encryption', () => {
    const plaintext = Buffer.from('private diff 日本語', 'utf8');
    const first = encryptGripContent({
      ...parameters,
      plaintext,
      keyVersion: 'test-v1',
    });
    const second = encryptGripContent({
      ...parameters,
      plaintext,
      keyVersion: 'test-v1',
    });

    expect(first.ciphertext.equals(second.ciphertext)).toBe(false);
    expect(first.iv).toHaveLength(12);
    expect(first.tag).toHaveLength(16);
    expect(decryptGripContent({ ...parameters, content: first })).toEqual(
      plaintext,
    );
    expect(first.ciphertext.includes(plaintext)).toBe(false);
  });

  it.each(['ciphertext', 'tag', 'iv'] as const)(
    'should reject tampered %s',
    (field) => {
      const content = encryptGripContent({
        ...parameters,
        plaintext: Buffer.from('secret'),
        keyVersion: 'test-v1',
      });

      content[field][0] ^= 1;
      expect(() => decryptGripContent({ ...parameters, content })).toThrow(
        'Invalid encrypted Grip content',
      );
    },
  );

  it('should reject substitution across checks, versions or keyrings', () => {
    const content = encryptGripContent({
      ...parameters,
      plaintext: Buffer.from('secret'),
      keyVersion: 'test-v1',
    });

    expect(() =>
      decryptGripContent({
        ...parameters,
        checkPublicId: 'other-check',
        content,
      }),
    ).toThrow();
    expect(() =>
      decryptGripContent({ ...parameters, payloadVersion: 2, content }),
    ).toThrow();
    expect(() =>
      decryptGripContent({ ...parameters, keyring: new Map(), content }),
    ).toThrow();
  });
});
