import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function withQueryClient(
  element: React.ReactElement,
  queryClient: QueryClient = new QueryClient(),
): React.ReactElement {
  return React.createElement(QueryClientProvider, { client: queryClient }, element);
}
