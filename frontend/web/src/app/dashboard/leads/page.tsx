import { requireSession, apiFetch } from '@/src/lib/session'
import LeadsClient from './LeadsClient'

type Lead = {
  id: number
  name: string
  phone: string | null
  email: string | null
  stage: string
  source: string | null
  estimatedValue: number | null
  notes: string | null
  followUpDate: string | null
  createdAt: string
}

export default async function LeadsPage() {
  const session = await requireSession()
  const leads = await apiFetch<Lead[]>('/leads', session)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">{leads?.length ?? 0} leads in pipeline</p>
      </div>

      <LeadsClient leads={leads ?? []} />
    </div>
  )
}
