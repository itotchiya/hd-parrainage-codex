import { useTranslation } from 'react-i18next'
import { authenticatedNavigation, type AppModuleRoute } from './navigation'

export interface TranslatedRoute extends Omit<AppModuleRoute, 'labelKey' | 'titleKey' | 'eyebrowKey' | 'descriptionKey'> {
  label: string
  title: string
  eyebrow: string
  description: string
}

export function useNavigation(): TranslatedRoute[] {
  const { t } = useTranslation()

  return authenticatedNavigation.map((route) => ({
    path: route.path,
    icon: route.icon,
    permissions: route.permissions,
    label: t(route.labelKey),
    title: t(route.titleKey),
    eyebrow: t(route.eyebrowKey),
    description: t(route.descriptionKey),
  }))
}

export function useActiveRoute(pathname: string): TranslatedRoute | undefined {
  const navigation = useNavigation()
  return (
    navigation.find(
      (route) =>
        pathname === route.path || pathname.startsWith(`${route.path}/`),
    ) ?? navigation[0]
  )
}
