import { Header } from '@/components/Header';
import { Lab } from '@/components/Lab';
import dynamic from 'next/dynamic';

const AIAssistant = dynamic(() => import('@/components/AIAssistant').then(mod => mod.AIAssistant), {
  ssr: false,
  loading: () => <div className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary/10 animate-pulse" />
});
import { cookies } from 'next/headers';
import { GUEST_COOKIE_NAME, deserializeGuestUser, type GuestUser } from '@/lib/guest-session';

export default async function Home() {
  const cookieStore = await cookies();

  // Check if there's a valid guest session
  const guestCookie = cookieStore.get(GUEST_COOKIE_NAME);
  const guestUser: GuestUser | null = guestCookie ? deserializeGuestUser(guestCookie.value) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header guestUser={guestUser} />
      <Lab />
      <AIAssistant />
    </div>
  );
}
