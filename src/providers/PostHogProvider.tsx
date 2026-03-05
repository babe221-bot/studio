'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react';

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
      // Check if window is defined (client-side) and if key is present
      if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
          person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
          capture_pageview: false // Disable automatic pageview capture, as we capture manually
        })
      }
    }, []);
  
    return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
