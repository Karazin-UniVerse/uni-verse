import { GripDeveloperProvider } from '@uni-hub/views/dev-tools/grip/GripDeveloperProvider';

export default function GripLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return <GripDeveloperProvider>{children}</GripDeveloperProvider>;
}
