import fs from 'fs';

function patch(path) {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  const existing = data.transactions || {};

  data.transactions = {
    ...existing,
    pageTitle: 'Transactions',
    section: {
      agent: 'My transactions',
      owner: 'All transactions',
    },
    filters: {
      clearFilters: 'Clear filters',
      searchPlaceholder: 'Reference, product, prospect...',
      statusLabel: 'Status',
      allStatuses: 'All statuses',
      programLabel: 'Program',
      allPrograms: 'All programs',
      agentLabel: 'Affiliate',
      allAgents: 'All affiliates',
      startDate: 'Start date',
      endDate: 'End date',
    },
    status: {
      detected: 'Detected',
      pending: 'Pending',
      validated: 'Validated',
      rejected: 'Rejected',
      paid: 'Paid',
    },
    invoiceStatus: {
      none: 'No invoice',
      pending: 'Pending',
      paid: 'Paid',
      unpaid: 'Unpaid',
      overdue: 'Overdue',
      cancelled: 'Cancelled',
    },
    sync: {
      rejected: 'Business rejected',
      rejectedAt: 'Rejected on {{date}}',
      synced: 'Synced',
      localTrace: 'Local trace',
      pending: 'Pending',
      noSync: 'No sync',
    },
    kpi: {
      agent: {
        pending: { title: 'Pending', description: 'Invoices in progress' },
        validated: { title: 'Validated', description: 'Validated invoices' },
        paid: { title: 'Paid', description: 'Paid invoices' },
        rejected: { title: 'Rejected', description: 'Rejected invoices' },
        points: { title: 'Total points', description: 'Points earned on your transactions' },
      },
      owner: {
        volume: { title: 'Total volume', description: '{{count}} transactions in current scope' },
        transactions: { title: 'Transactions', description: '{{count}} linked to a prospect' },
        validated: { title: 'Validated', description: 'Amount recognized after validation' },
        paid: { title: 'Paid', description: 'Amount already paid' },
        points: { title: 'Points', description: 'Points generated for affiliates' },
      },
    },
    table: {
      transaction: 'Transaction',
      prospect: 'Prospect',
      program: 'Program',
      status: 'Status',
      sync: 'Sync',
      amount: 'Amount',
      points: 'Points',
      occurred: 'Occurred',
      actions: 'Actions',
    },
    actions: {
      view: 'View transaction',
      moreOptions: 'More options',
    },
    fallback: {
      program: 'Program',
      agent: 'Affiliate',
      linkedProspect: 'Linked prospect',
      noCompany: 'No company',
      noLinkedProspect: 'No linked prospect',
      unattached: 'Unattached transaction',
      noAgent: 'No affiliate',
      noProgram: 'No program',
    },
    empty: {
      eyebrow: 'Transactional ledger',
      title: 'No transaction matches the filters.',
      hint: 'Adjust the period, status, or program/affiliate scope to find an existing transaction.',
    },
    detail: {
      breadcrumb: 'Transactions',
      back: 'Back to transaction list',
      viewProspect: 'View prospect',
      viewProgram: 'View program',
      error: {
        missingId: 'Missing transaction identifier.',
        notFound: 'Transaction not found.',
      },
      kpi: {
        amount: { title: 'Amount', description: 'Commercial value of the transaction' },
        points: { title: 'Points awarded', description: 'Generated affiliate credit', pending: 'Pending' },
        occurred: { title: 'Occurred', description: 'Business date of the transaction' },
        lastSync: { title: 'Last sync', description: 'IACRM sync trace', noReference: 'No reference' },
      },
      overview: {
        title: 'Transaction view',
        description: 'Reference, product and financial data useful for business reading.',
        platformTransaction: 'Transaction attached to the platform',
      },
      meta: {
        reference: 'Reference',
        amount: 'Amount',
        points: 'Points',
        pointsPending: 'Pending',
        occurred: 'Occurred',
        validated: 'Validated',
        paid: 'Paid',
      },
      context: {
        title: 'Commercial context',
        description: 'Program, referring affiliate and prospect attached to the transaction.',
        program: 'Program',
        programDescription: 'Source program for this transaction',
        noProgram: 'No program attachment',
        agent: 'Affiliate',
        noEmail: 'No email provided',
        prospect: 'Prospect',
        noProspect: 'This transaction is not linked to any local prospect.',
        active: 'Active',
        affiliateBadge: 'Affiliate',
      },
      sync: {
        title: 'Synchronization',
        description: 'Quick read of synchronization and reconciliation markers.',
        markers: '{{count}} markers',
        status: 'Transaction status',
        invoice: 'Invoicing',
        iacrm: 'IACRM synchronization',
        noReference: 'No linked reference',
        recognition: 'Recognition',
        recognized: 'Transaction recognized',
        awaitingRecognition: 'Awaiting recognition',
        recognizedBadge: 'Recognized',
        awaitingBadge: 'Pending',
        table: {
          element: 'Element',
          value: 'Value',
          status: 'Status',
          lastUpdate: 'Last updated',
        },
      },
      audit: {
        title: 'Audit trail',
        description: 'Recorded steps on the transaction, sorted from newest to oldest.',
        events: '{{count}} events',
        empty: 'No timestamped event is available for this transaction yet.',
        table: {
          date: 'Date',
          step: 'Step',
          system: 'System',
          detail: 'Detail',
        },
        occurred: {
          event: 'Transaction detected',
          system: 'Transaction engine',
          detail: 'Reference {{reference}}',
        },
        recognized: {
          event: 'Transaction recognized',
          system: 'IACRM / reconciliation',
          detail: 'The transaction was recognized and reconciled to the commercial flow.',
        },
        validated: {
          event: 'Transaction validated',
          system: 'Financial pipeline',
          detail: 'The amount was validated and can feed the points calculation.',
        },
        rejected: {
          event: 'Transaction rejected',
          system: 'Business control',
          detail: 'The transaction was rejected before final validation.',
        },
        paid: {
          event: 'Transaction paid',
          system: 'Billing tracking',
          detail: 'The commercial payment was recorded as paid.',
        },
        synced: {
          event: 'Last synchronization',
          system: 'IACRM',
          detailWithRef: 'External reference {{ref}}',
          detailNoRef: 'Sync recorded without external reference.',
        },
      },
    },
  };

  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log('Patched', path);
}

patch('src/i18n/locales/en.json');
