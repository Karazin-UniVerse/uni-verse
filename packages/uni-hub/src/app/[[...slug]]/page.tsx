'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('@uni-hub/App'), { ssr: false });

export default function Page() {
  return <App />;
}
