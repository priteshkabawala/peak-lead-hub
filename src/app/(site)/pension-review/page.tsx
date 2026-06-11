import type { Metadata } from 'next'
import ServicePage from '@/components/site/ServicePage'
import { SERVICES } from '@/lib/services'

const service = SERVICES['pension-review']
export const metadata: Metadata = { title: service.title }

export default function Page() {
  return <ServicePage service={service} />
}
