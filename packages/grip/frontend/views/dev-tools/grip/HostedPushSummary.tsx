import type { GripPushManifest } from '@core/types/grip-hosted';
import styles from './HostedBoardPage.module.scss';

export function HostedPushSummary({
  manifest,
  label,
}: {
  manifest: GripPushManifest;
  label: string;
}): React.ReactElement {
  return (
    <section aria-label={label} className={styles.manifest}>
      <h2>{label}</h2>
      <p>{manifest.repository}</p>
      <ul>
        {manifest.updates.map((update) => (
          <li key={update.remoteRef}>
            <p>
              <code>{update.localRef}</code> → <code>{update.remoteRef}</code>
            </p>
            <p>
              <code>{update.remoteOid}</code> → <code>{update.localOid}</code>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
