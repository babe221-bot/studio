import { Header } from '@/components/Header';
import { Lab } from '@/components/Lab';
import { AssistantWrapper } from '@/components/AssistantWrapper';
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
      <AssistantWrapper />
    </div>
  );
}
