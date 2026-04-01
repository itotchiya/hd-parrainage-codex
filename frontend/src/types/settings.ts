export interface SettingsPayload {
  user: {
    id: string
    display_name: string
    avatar_url: string | null
    email: string
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
