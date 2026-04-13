import i18n from '@/i18n/config'

export function getAppLanguage() {
  return i18n.resolvedLanguage === 'fr' ? 'fr' : 'en'
}

export function getAppLocale() {
  return getAppLanguage() === 'fr' ? 'fr-FR' : 'en-US'
}

export function formatAppDate(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString(getAppLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatAppDateTime(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleString(getAppLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatAppTime(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleTimeString(getAppLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatAppNumber(value: number) {
  return value.toLocaleString(getAppLocale())
}

export function formatAppCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(getAppLocale(), {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount)
}
