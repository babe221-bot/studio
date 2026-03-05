# Security Audit: Data & RLS

## 1. Row Level Security (RLS)
The platform uses Supabase's RLS to ensure data privacy.

*   **`user_profiles` Table:** Only the authenticated user can see or update their own profile (`auth.uid() = id`).
*   **`orders` Table:**
    *   Authenticated users see only their orders.
    *   Guest users see orders matching their temporary session ID header.
*   **`materials` Table:** Publicly readable, restricted write access to admin roles.

## 2. API Security
*   **CORS:** Middleware in `backend/app/main.py` restricts requests to known frontend origins.
*   **Rate Limiting:** (Recommended) Cloudflare or Nginx should limit `/render-3d` calls as they are compute-expensive.

## 3. Data Encryption
*   **At Rest:** Database is encrypted via Supabase (PostgreSQL default).
*   **In Transit:** SSL/TLS is mandatory for all API and DB connections.
