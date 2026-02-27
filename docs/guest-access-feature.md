# Guest Access Feature Documentation

## Overview
The Guest Access Feature enables users to access the application with full functionality without requiring authentication. Guests can use all features that authenticated users can access, with the exception of data persistence.

## Implementation Details

### Files Modified/Created

1. **New Files:**
   - [`src/lib/guest-session.ts`](src/lib/guest-session.ts) - Guest session types and utilities
   - [`docs/guest-access-feature.md`](docs/guest-access-feature.md) - This documentation

2. **Modified Files:**
   - [`src/utils/supabase/middleware.ts`](src/utils/supabase/middleware.ts) - Added guest session check
   - [`src/app/login/actions.ts`](src/app/login/actions.ts) - Added `joinAsGuest` action
   - [`src/app/login/page.tsx`](src/app/login/page.tsx) - Added "Join as Guest" button
   - [`src/app/page.tsx`](src/app/page.tsx) - Added guest session handling
   - [`src/components/Header.tsx`](src/components/Header.tsx) - Added guest status indicator
   - [`src/components/SignOutButton.tsx`](src/components/SignOutButton.tsx) - Added guest sign out handling

## Guest Session Mechanism

### Session Storage
- Guest sessions are stored in a browser cookie named `studio_guest_session`
- Cookie settings:
  - `httpOnly: false` (allows client-side access)
  - `secure: true` in production
  - `sameSite: 'lax'`
  - `maxAge: 24 hours` (86400 seconds)
  - `path: '/'`

### Guest User Object
```typescript
interface GuestUser {
  id: string;          // Generated unique ID (format: guest_<timestamp>_<random>)
  email: string;       // Format: guest_<id>@guest.studio.local
  isGuest: boolean;   // Always true for guest users
  guestSince: string;  // ISO 8601 timestamp
}
```

## Access Control

### Protected Routes
All routes except `/login` and `/auth` require either:
1. Authenticated user session (Supabase auth), OR
2. Valid guest session cookie, OR
3. Guest parameter in URL (temporary, during guest login flow)

### Middleware Logic
The middleware at [`src/utils/supabase/middleware.ts`](src/utils/supabase/middleware.ts) checks:
1. Is user authenticated via Supabase? → Allow
2. Is there a valid guest cookie? → Allow
3. Is the path `/login` or `/auth`? → Allow
4. Is there a `guest` parameter in the URL? → Allow (for guest login flow)
5. Otherwise → Redirect to `/login`

## User Experience

### Login Page
- Added "Nastavi kao gost" (Continue as Guest) button
- Added separator between regular auth and guest options
- Helper text explains guest limitations

### Header Display
- Guest users see a yellow indicator dot next to "Gost" (Guest) label
- Sign out button works for both authenticated and guest users

### Sign Out Flow
- For guests: Clears the guest cookie and redirects to login
- For authenticated users: Calls Supabase signOut and redirects to login

## Guest Limitations

### Data Persistence
- **Primary Limitation**: Guest data is NOT persisted
- Any work done as a guest will be lost when the session expires or user signs out
- No data is saved to the database for guest users

### Session Duration
- Guest sessions last 24 hours or until sign out
- Sessions cannot be recovered after expiration

### Authentication Features
- Guests cannot access features requiring email verification
- Guests cannot use password reset functionality
- Guests cannot access user-specific settings

## Configuration

### Environment Variables
No new environment variables required. Uses existing Supabase configuration.

### Guest Session Cookie
Customize in [`src/lib/guest-session.ts`](src/lib/guest-session.ts):
- `GUEST_COOKIE_NAME` - Cookie name (default: `studio_guest_session`)
- `GUEST_EMAIL_DOMAIN` - Email domain for guest IDs (default: `guest.studio.local`)

## Security Considerations

1. **No Authentication**: Guest sessions don't verify identity
2. **Data Isolation**: Guests have no access to other users' data
3. **Session Binding**: Sessions are bound to browser cookies
4. **Production Security**: Cookies are only served over HTTPS in production

## Future Enhancements

Potential improvements:
1. Allow guests to save work by converting to registered account
2. Guest session extension option
3. Guest activity logging (for analytics, not persistence)
4. Rate limiting for guest users
