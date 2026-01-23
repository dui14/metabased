import { redirect } from 'next/navigation';

export default function RootPage() {
  // Server-side redirect - nhanh hơn và không gây recompile
  redirect('/home');
}
