import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Hostname-based routing:
//   crm.mypensionadvisor.co.uk        → serves the CRM (which lives under /crm)
//   mypensionadvisor.co.uk (apex/www) → serves the marketing site (root)
//
// The CRM lives at the /crm path in the codebase; on the crm subdomain we
// rewrite so it appears at the subdomain root. On the marketing domain we
// bounce any /crm URL over to the subdomain so the CRM only lives in one place.
export function proxy(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase()
  const { pathname } = request.nextUrl
  const isCrmHost = host.startsWith('crm.')

  if (isCrmHost) {
    if (!pathname.startsWith('/crm')) {
      const url = request.nextUrl.clone()
      url.pathname = pathname === '/' ? '/crm' : `/crm${pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // Only on the real marketing apex/www do we bounce /crm to the subdomain.
  // On vercel.app / localhost we leave /crm reachable (so the CRM works there
  // before the custom-domain DNS cutover).
  const APEX_HOSTS = ['mypensionadvisor.co.uk', 'www.mypensionadvisor.co.uk']
  if (APEX_HOSTS.includes(host) && (pathname === '/crm' || pathname.startsWith('/crm/'))) {
    const url = new URL(request.url)
    url.host = 'crm.mypensionadvisor.co.uk'
    url.protocol = 'https:'
    url.port = ''
    url.pathname = pathname.replace(/^\/crm/, '') || '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Run on page routes only — never on API, Next internals, or static files
  // (so /api/* stays at /api on both hosts and assets load normally).
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
