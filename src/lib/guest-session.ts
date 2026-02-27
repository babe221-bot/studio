// Guest session types and utilities
export interface GuestUser {
    id: string;
    email: string;
    isGuest: boolean;
    guestSince: string;
}

export const GUEST_COOKIE_NAME = 'studio_guest_session';
export const GUEST_EMAIL_DOMAIN = 'guest.studio.local';

// Generate a unique guest ID
export function generateGuestId(): string {
    return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create a guest user object
export function createGuestUser(): GuestUser {
    const id = generateGuestId();
    return {
        id,
        email: `${id}@${GUEST_EMAIL_DOMAIN}`,
        isGuest: true,
        guestSince: new Date().toISOString(),
    };
}

// Serialize guest user for storage
export function serializeGuestUser(user: GuestUser): string {
    return JSON.stringify(user);
}

// Deserialize guest user from storage
export function deserializeGuestUser(data: string): GuestUser | null {
    try {
        const user = JSON.parse(data) as GuestUser;
        if (user && user.isGuest && user.id) {
            return user;
        }
        return null;
    } catch {
        return null;
    }
}
