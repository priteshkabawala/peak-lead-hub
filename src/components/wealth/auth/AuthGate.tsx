'use client'

/* Authentication placeholder.
   ---------------------------------------------------------------------------
   The guide is deliberately usable with no account: everything lives in the
   browser. When a real identity layer is added (Supabase Auth is already a
   dependency of this project, so `supabase.auth.getUser()` is the likely
   implementation), replace `useSession` below and the rest of the app needs no
   changes — it only ever reads `session`.

   To turn it on:
     1. Implement `useSession` against your provider.
     2. Wrap any step you want gated in <AuthGate>.
     3. Point `saveToServer` in ../integrations/providers.ts at your API. */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import Icon from '../ui/Icon'
import { Btn } from '../ui/Primitives'

export interface Session {
  id: string
  name: string | null
  email: string | null
}

interface AuthValue {
  session: Session | null
  status: 'anonymous' | 'authenticated' | 'loading'
  signIn: () => void
  signOut: () => void
}

const AuthContext = createContext<AuthValue>({
  session: null,
  status: 'anonymous',
  signIn: () => {},
  signOut: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthValue>(
    () => ({
      session: null,
      status: 'anonymous',
      // Intentionally inert until a provider is wired up.
      signIn: () => console.info('[elite-guide] sign-in placeholder — wire up an auth provider'),
      signOut: () => console.info('[elite-guide] sign-out placeholder'),
    }),
    [],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useSession = () => useContext(AuthContext)

/** Wrap anything that should require an account once auth is live. */
export default function AuthGate({ children, feature }: { children: ReactNode; feature?: string }) {
  const { status, signIn } = useSession()
  if (status === 'authenticated') return <>{children}</>

  return (
    <div className="pk-card flex flex-col items-center p-8 text-center">
      <span style={{ color: 'var(--pk-gold)' }}>
        <Icon name="lock" size={26} />
      </span>
      <h3 className="mt-4 text-[18px]">Secure area</h3>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed" style={{ color: 'var(--pk-text-2)' }}>
        {feature ?? 'This section'} will require a secure account so your plan can sync across devices and connect to
        your providers. Nothing here is live yet.
      </p>
      <div className="mt-5">
        <Btn variant="ghost" icon="lock" iconSide="left" onClick={signIn}>
          Sign in
        </Btn>
      </div>
    </div>
  )
}
