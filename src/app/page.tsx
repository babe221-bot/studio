import { Header } from '@/components/Header';
import { Lab } from '@/components/Lab';
import { AIAssistant } from '@/components/AIAssistant';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GUEST_COOKIE_NAME, deserializeGuestUser, serializeGuestUser, type GuestUser } from '@/lib/guest-session';

export default async function Home(props: { searchParams: Promise<{ guest?: string }> }) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();

  // Check for guest parameter in URL and set cookie
  if (searchParams?.guest) {
    try {
      const guestUser = deserializeGuestUser(decodeURIComponent(searchParams.guest));
      if (guestUser) {
        cookieStore.set(GUEST_COOKIE_NAME, serializeGuestUser(guestUser), {
          httpOnly: false, // Allow client-side access
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        });
        // Remove the guest parameter from URL
        redirect('/');
      }
    } catch (e) {
      // Invalid guest data, redirect to login
      redirect('/login');
    }
  }

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
