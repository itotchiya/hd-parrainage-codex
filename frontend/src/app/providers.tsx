import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthSessionProvider } from '../features/auth/session'
import { queryClient } from '../lib/query'
import { router } from './router'

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <RouterProvider router={router} />
      </AuthSessionProvider>
    </QueryClientProvider>
  )
}
