'use client';

/**
 * UsernameGuard - Previously blocked app until username was set.
 * Now it's a pass-through component - username is only required for referrals.
 */
export function UsernameGuard({ children }: { children: React.ReactNode }) {
    // Simply render children - no blocking
    return <>{children}</>;
}
