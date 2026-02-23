'use server'

import { requireAdmin } from '@/lib/security'
import { runHealthCheck, sendHealthCheckReport } from '@/app/api/cron/health-check/route'

export async function triggerHealthCheck() {
  await requireAdmin()

  const result = await runHealthCheck()
  const { emailSent, pushSent } = await sendHealthCheckReport(result)

  return {
    globalStatus: result.globalStatus,
    summary: result.summary,
    emailSent,
    pushSent,
  }
}
