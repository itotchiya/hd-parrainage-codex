import fs from 'fs';

function patch(path) {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  const existing = data.transactions || {};

  data.transactions = {
    ...existing,
    pageTitle: 'Transactions',
    section: {
      agent: 'Mes transactions',
      owner: 'Toutes les transactions',
    },
    filters: {
      clearFilters: 'Effacer les filtres',
      searchPlaceholder: 'Référence, produit, prospect...',
      statusLabel: 'Statut',
      allStatuses: 'Tous statuts',
      programLabel: 'Programme',
      allPrograms: 'Tous programmes',
      agentLabel: 'Affilié',
      allAgents: 'Tous affiliés',
      startDate: 'Date de début',
      endDate: 'Date de fin',
    },
    status: {
      detected: 'Détectée',
      pending: 'En attente',
      validated: 'Validée',
      rejected: 'Rejetée',
      paid: 'Payée',
    },
    invoiceStatus: {
      none: 'Aucune facture',
      pending: 'En attente',
      paid: 'Réglée',
      unpaid: 'Impayée',
      overdue: 'En retard',
      cancelled: 'Annulée',
    },
    sync: {
      rejected: 'Rejet métier',
      rejectedAt: 'Rejetée le {{date}}',
      synced: 'Synchronisée',
      localTrace: 'Trace locale',
      pending: 'En attente',
      noSync: 'Aucune synchro',
    },
    kpi: {
      agent: {
        pending: { title: 'En attente', description: 'Factures en cours' },
        validated: { title: 'Validées', description: 'Factures validées' },
        paid: { title: 'Réglées', description: 'Factures payées' },
        rejected: { title: 'Rejetées', description: 'Factures rejetées' },
        points: { title: 'Points totaux', description: 'Points gagnés sur vos transactions' },
      },
      owner: {
        volume: { title: 'Volume total', description: '{{count}} transactions dans le scope courant' },
        transactions: { title: 'Transactions', description: '{{count}} reliées à un prospect' },
        validated: { title: 'Validé', description: 'Montant reconnu après validation' },
        paid: { title: 'Réglé', description: 'Montant déjà payé' },
        points: { title: 'Points', description: 'Points générés pour les affiliés' },
      },
    },
    table: {
      transaction: 'Transaction',
      prospect: 'Prospect',
      program: 'Programme',
      status: 'Statut',
      sync: 'Sync',
      amount: 'Montant',
      points: 'Points',
      occurred: 'Survenue',
      actions: 'Actions',
    },
    actions: {
      view: 'Voir la transaction',
      moreOptions: "Plus d'options",
    },
    fallback: {
      program: 'Programme',
      agent: 'Affilié',
      linkedProspect: 'Prospect lié',
      noCompany: 'Sans société',
      noLinkedProspect: 'Aucun prospect lié',
      unattached: 'Transaction non rattachée',
      noAgent: 'Sans affilié',
      noProgram: 'Aucun programme',
    },
    empty: {
      eyebrow: 'Ledger transactionnel',
      title: 'Aucune transaction ne correspond aux filtres.',
      hint: 'Ajustez la période, le statut ou le périmètre programme/affilié pour retrouver une transaction existante.',
    },
    detail: {
      breadcrumb: 'Transactions',
      back: 'Retour à la liste des transactions',
      viewProspect: 'Voir le prospect',
      viewProgram: 'Voir le programme',
      error: {
        missingId: 'Identifiant de transaction manquant.',
        notFound: 'Transaction introuvable.',
      },
      kpi: {
        amount: { title: 'Montant', description: 'Valeur commerciale de la transaction' },
        points: { title: 'Points attribués', description: 'Crédit affilié généré', pending: 'En attente' },
        occurred: { title: 'Survenue', description: 'Date métier de la transaction' },
        lastSync: { title: 'Dernière synchro', description: 'Trace de synchronisation IACRM', noReference: 'Sans référence' },
      },
      overview: {
        title: 'Vue transaction',
        description: 'Référence, produit et données financières utiles pour la lecture métier.',
        platformTransaction: 'Transaction rattachée à la plateforme',
      },
      meta: {
        reference: 'Référence',
        amount: 'Montant',
        points: 'Points',
        pointsPending: 'En attente',
        occurred: 'Survenue',
        validated: 'Validée',
        paid: 'Réglée',
      },
      context: {
        title: 'Contexte commercial',
        description: 'Programme, affilié référent et prospect rattaché à la transaction.',
        program: 'Programme',
        programDescription: 'Programme source de la transaction',
        noProgram: 'Aucun rattachement programme',
        agent: 'Affilié',
        noEmail: 'Aucun email renseigné',
        prospect: 'Prospect',
        noProspect: "Cette transaction n'est reliée à aucun prospect local.",
        active: 'Actif',
        affiliateBadge: 'Affilié',
      },
      sync: {
        title: 'Synchronisation',
        description: 'Lecture rapide des repères de synchronisation et de rapprochement.',
        markers: '{{count}} repères',
        status: 'Statut transaction',
        invoice: 'Facturation',
        iacrm: 'Synchronisation IACRM',
        noReference: 'Aucune référence liée',
        recognition: 'Reconnaissance',
        recognized: 'Transaction reconnue',
        awaitingRecognition: 'En attente de reconnaissance',
        recognizedBadge: 'Reconnue',
        awaitingBadge: 'En attente',
        table: {
          element: 'Élément',
          value: 'Valeur',
          status: 'Statut',
          lastUpdate: 'Dernière mise à jour',
        },
      },
      audit: {
        title: 'Audit trail',
        description: 'Étapes enregistrées sur la transaction, classées du plus récent au plus ancien.',
        events: '{{count}} événements',
        empty: "Aucun événement horodaté n'est encore disponible pour cette transaction.",
        table: {
          date: 'Date',
          step: 'Étape',
          system: 'Système',
          detail: 'Détail',
        },
        occurred: {
          event: 'Transaction détectée',
          system: 'Moteur transactionnel',
          detail: 'Référence {{reference}}',
        },
        recognized: {
          event: 'Transaction reconnue',
          system: 'IACRM / rapprochement',
          detail: 'La transaction a été reconnue et rapprochée au flux commercial.',
        },
        validated: {
          event: 'Transaction validée',
          system: 'Pipeline financier',
          detail: 'Le montant a été validé et peut alimenter le calcul de points.',
        },
        rejected: {
          event: 'Transaction rejetée',
          system: 'Contrôle métier',
          detail: 'La transaction a été rejetée avant validation finale.',
        },
        paid: {
          event: 'Transaction réglée',
          system: 'Suivi facturation',
          detail: 'Le règlement commercial a été enregistré comme payé.',
        },
        synced: {
          event: 'Dernière synchronisation',
          system: 'IACRM',
          detailWithRef: 'Référence externe {{ref}}',
          detailNoRef: 'Synchronisation enregistrée sans référence externe.',
        },
      },
    },
  };

  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log('Patched', path);
}

patch('src/i18n/locales/fr.json');
