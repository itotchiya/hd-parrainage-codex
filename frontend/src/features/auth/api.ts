import { apiRequest } from '../../lib/api'

interface InvitationValidationEnvelope {
  data: {
    valid: boolean
    message: string
    display_name?: string
    email?: string
  }
}

interface PasswordForgotEnvelope {
  data: {
    message: string
    reset_token?: string
  }
}

interface PasswordResetEnvelope {
  data: {
    message: string
  }
}

export async function validateInvitationToken(payload: { email: string; token: string }) {
  return apiRequest<InvitationValidationEnvelope>('/auth/invitation/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function activateInvitation(payload: {
  email: string
  token: string
  password: string
  password_confirmation: string
}) {
  return apiRequest<{ code: string; message: string }>('/auth/invitation/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function resendVerificationEmail(payload: { email: string }) {
  return apiRequest<{ message: string }>('/auth/invitation/resend-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function requestPasswordResetToken(payload: { email: string }) {
  return apiRequest<PasswordForgotEnvelope>('/auth/password/forgot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function resetPassword(payload: {
  email: string
  token: string
  password: string
  password_confirmation: string
}) {
  return apiRequest<PasswordResetEnvelope>('/auth/password/reset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}
