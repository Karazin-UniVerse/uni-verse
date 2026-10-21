import { redirect } from 'next/navigation';
import { ROUTE } from '@uni-hub/views/dashboard/routes';

export default function Page(): never {
  redirect(ROUTE.Wall);
}
