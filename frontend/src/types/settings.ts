export interface SettingsPayload {
  user: {
    id: string
    display_name: string
    avatar_url: string | null
    email: string
    pending_email: string | null
    phone_number: string | null
    email_verified_at: string | null
    pending_email_verification_sent_at: string | null
    pending_email_verification_expires_at: string | null
    status: string
  }
  business: {
    id: string
    slug: string
    display_name: string
    legal_name: string
    contact_email: string | null
    contact_phone: string | null
    website_url: string | null
    timezone: string
    currency_code: string
  } | null
  permissions: {
    can_update_own: boolean
    can_update_business: boolean
  }
}

export interface SettingsEnvelope {
  data: SettingsPayload
}
