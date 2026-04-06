export function translateRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    'super-admin': 'Super administrateur',
    'business-owner': 'Responsable entreprise',
    agent: 'Affilie',
  };

  return labels[role] ?? role;
}

export function translateStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Actif',
    approved: 'Approuve',
    archived: 'Archive',
    cancelled: 'Annule',
    completed: 'Finalise',
    detected: 'Detecte',
    draft: 'Brouillon',
    interview: 'En onboarding',
    paid: 'Paye',
    paused: 'En pause',
    pending: 'En attente',
    processing: 'En traitement',
    rejected: 'Rejete',
    requested: 'Demande',
    suspended: 'Suspendu',
    validated: 'Valide',
    suspect: 'Suspect',
    'prospect-froid': 'Prospect froid',
    'prospect-tiede': 'Prospect tiede',
    'prospect-chaud': 'Prospect chaud',
  };

  return labels[status] ?? status;
}

export function translateExchangeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cash: 'Conversion en argent',
    reward: 'Recompense',
  };

  return labels[type] ?? type;
}
