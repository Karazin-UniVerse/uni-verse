import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type {
  GripDecryptContentParams,
  GripEncryptedContent,
  GripEncryptContentParams,
} from './grip-hosted.types';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function encryptGripContent({
  plaintext,
  checkPublicId,
  payloadVersion,
  keyring,
  keyVersion,
}: GripEncryptContentParams): GripEncryptedContent {
  const key = keyring.get(keyVersion);

  if (!key) {
    throw new Error('Grip content encryption key unavailable');
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  cipher.setAAD(
    Buffer.from(JSON.stringify([checkPublicId, payloadVersion, keyVersion])),
  );
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return { keyVersion, iv, tag: cipher.getAuthTag(), ciphertext };
}

export function decryptGripContent({
  content,
  checkPublicId,
  payloadVersion,
  keyring,
}: GripDecryptContentParams): Buffer {
  try {
    const key = keyring.get(content.keyVersion);

    if (
      !key ||
      content.iv.length !== IV_BYTES ||
      content.tag.length !== TAG_BYTES
    ) {
      throw new Error('Invalid encrypted Grip content');
    }

    const decipher = createDecipheriv(ALGORITHM, key, content.iv);

    decipher.setAAD(
      Buffer.from(
        JSON.stringify([checkPublicId, payloadVersion, content.keyVersion]),
      ),
    );
    decipher.setAuthTag(content.tag);

    return Buffer.concat([
      decipher.update(content.ciphertext),
      decipher.final(),
    ]);
  } catch {
    throw new Error('Invalid encrypted Grip content');
  }
}
