import { notFound } from 'next/navigation';
import { HostedBoardPage } from '@uni-hub/views/dev-tools/grip/HostedBoardPage';

export default async function GripBoardPage({
  params,
}: {
  params: Promise<{ checkId: string }>;
}): Promise<React.ReactElement> {
  const { checkId } = await params;

  if (!/^[A-Za-z0-9_-]{43}$/.test(checkId)) {
    notFound();
  }

  return <HostedBoardPage checkId={checkId} />;
}
