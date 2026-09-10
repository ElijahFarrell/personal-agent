'use client'

import { useEffect } from 'react'
import { persistCampaignParams } from '@/lib/marketing/campaign'

export function CampaignCapture() {
  useEffect(() => {
    persistCampaignParams()
  }, [])
  return null
}
