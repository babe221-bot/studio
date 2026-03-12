import { ReactNode } from 'react';
import { Sidebar } from '@/components/admin/Sidebar';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// This is a placeholder for a real role check.
// In a real app, you'd fetch the user's profile and check their role.
async function getUserRole(supabase: any): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return 'guest';
  // Placeholder: assume the first user is an admin for now.
  // Replace with a real query to your user_profiles table.
  if (session.user.email?.includes('admin')) {
    // Simple placeholder logic
    return 'admin';
  }
  return 'customer';
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const role = await getUserRole(supabase);

  if (role !== 'admin' && role !== 'superadmin') {
    redirect('/'); // Or to an unauthorized page
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
