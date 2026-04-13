import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

new_programs_en = {
  "title": "Programs",
  "eyebrow": "Operations",
  "description": "Program lifecycle, assignments and commission rules for conversions.",
  "createProgram": "Create program",
  "searchPlaceholder": "Search for a program...",
  "documentation": "Documentation",
  "tabs": {
    "programs": "Programs",
    "archived": "Archived"
  },
  "filters": {
    "status": "Status",
    "allStatuses": "All statuses",
    "business": "Business",
    "allBusinesses": "All businesses",
    "exchangeMode": "Exchange Mode",
    "allModes": "All modes",
    "sort": "Sort programs",
    "sortBy": "Sort by"
  },
  "status": {
    "active": "Active",
    "draft": "Draft",
    "paused": "Paused",
    "suspended": "Suspended",
    "archived": "Archived"
  },
  "exchangeModes": {
    "cash": "Cash",
    "reward": "Rewards",
    "both": "Mixed"
  },
  "sortOptions": {
    "newest": "Recent",
    "oldest": "Oldest",
    "status": "Status",
    "pointsHigh": "Points (Descending)",
    "pointsLow": "Points (Ascending)",
    "agentsHigh": "Agent count ↓",
    "agentsLow": "Agent count ↑"
  },
  "noResults": "No program matches the current filter.",
  "dialogs": {
    "createTitle": "Create Program",
    "editTitle": "Edit Program",
    "save": "Save",
    "create": "Create",
    "assignAgents": "Assign Agents",
    "assignAgentsDescription": "Select business agents to attach to this program.",
    "cashRules": "Cash Rules",
    "rewardPack": "Reward Pack",
    "confirmDelete": "Confirm Deletion",
    "deleteWarning": "This action is irreversible. Please type the program name to confirm.",
    "lockedAgentTooltip": "This agent has already added referrals to this program and cannot be removed."
  },
  "card": {
    "actions": {
      "viewProgram": "View program",
      "addProspect": "Add prospect",
      "edit": "Edit",
      "editCash": "Edit cash",
      "manageRewards": "Manage rewards",
      "activate": "Activate program",
      "liftSuspension": "Lift suspension",
      "reactivate": "Reactivate",
      "pause": "Pause",
      "suspend": "Suspend",
      "archive": "Archive",
      "assignAgents": "Assign agents",
      "delete": "Delete"
    },
    "availability": {
      "readOnly": "Read only",
      "readyForProspects": "Ready for referrals",
      "temporarilyPaused": "Temporarily paused",
      "submissionBlocked": "Submission blocked",
      "unavailable": "Unavailable"
    },
    "availabilityHelper": {
      "readOnly": "Referral submission is not enabled for this workspace.",
      "readyForProspects": "Open the program or submit a new referral immediately.",
      "temporarilyPaused": "View program details. Referral submission is paused.",
      "submissionBlocked": "The owner is winding down this program. New referrals are blocked.",
      "unavailable": "This program is not open to new submissions."
    },
    "meta": {
      "business": "Business",
      "attribution": "Attribution",
      "points": "Points",
      "exchange": "Exchange",
      "cash": "Cash",
      "rewards": "Rewards",
      "assignments": "Assignments"
    },
    "attribution": {
      "perTransaction": "Per transaction",
      "revenueTier": "Revenue tier"
    },
    "points": {
      "toConfigure": "To configure"
    },
    "cash": {
      "rate": "{{points}} pts = 1 €",
      "notConfigured": "Cash not configured"
    },
    "rewards": {
      "pack": "Pack",
      "noItemsConfigured": "No reward items configured.",
      "itemCost": "{{title}} - {{points}} pts"
    },
    "assignments": {
      "none": "No agent assigned",
      "label_one": "Assignments - {{count}} agent",
      "label_other": "Assignments - {{count}} agents",
      "labelMany": "Assignees - {{count}}"
    },
    "dialog": {
      "businessScope": "Business scope",
      "businessScopeDescriptionOwner": "Business context of this program.",
      "businessScopeDescriptionAgent": "The business that owns the program. It defines who controls the rules, rewards and assignments.",
      "attribution": "Attribution",
      "attributionDescriptionOwner": "Defines how affiliates earn points from commercial results. Keep this configuration clear so payment logic stays predictable.",
      "attributionDescriptionAgent": "Indicates how this program awards points for your activities.",
      "points": "Points",
      "pointsDescriptionOwner": "Current point rate used by this program. This value directly impacts affiliate earning speed.",
      "pointsDescriptionAgent": "Current point value for this program. This controls what your actions generate.",
      "exchangeMode": "Exchange mode",
      "exchangeModeDescriptionOwner": "Exchange configuration for this program.",
      "exchangeModeDescriptionAgent": "Indicates whether this program offers cash, rewards, or both conversion paths.",
      "cashConversion": "Cash conversion",
      "cashConversionDescriptionOwner": "Defines the point-to-€ conversion ratio for cash exchanges.",
      "cashConversionDescriptionAgent": "Conversion rate used when cash exchange is available.",
      "rewardPack": "Reward pack",
      "rewardPackDescriptionOwner": "Reward catalog linked to this program and the associated point costs.",
      "rewardPackDescriptionAgent": "Available reward items and the points required for each.",
      "assignmentsTitle": "Assignments",
      "assignmentsDescriptionOwner": "Affiliates currently linked to this program. The assignment count helps track coverage and execution.",
      "assignmentsDescriptionAgent": "Assignment context for this program.",
      "viewAllPrograms": "View all programs",
      "programAvailable_one": "{{count}} program available",
      "programAvailable_other": "{{count}} programs available",
      "noOtherPrograms": "No other program found for this business.",
      "noRewardItems": "No reward items configured.",
      "noAgentsAssigned": "No agent assigned.",
      "editCash": "Edit cash",
      "changePack": "Change pack",
      "editPack": "Edit pack"
    },
    "tooltip": {
      "editDisabledArchived": "Archived program, use a non-archived program to edit general settings.",
      "editDisabledAssigned": "Agents are already assigned, remove active assignments to re-enable this edit.",
      "editDisabledFallback": "Prospects already exist or the program.update permission is missing, use a program without prospects or grant this permission.",
      "editCashDisabledNoCash": "Cash mode inactive, switch this program to cash or both to edit this section.",
      "editCashDisabledArchived": "Archived program, use a non-archived program to edit cash rules.",
      "editCashDisabledAssigned": "Agents are already assigned, remove active assignments to re-enable this edit.",
      "editCashDisabledFallback": "Missing program.update permission, grant it to edit cash rules.",
      "editRewardsDisabledNoRewards": "Rewards mode inactive, switch this program to reward or both to edit the pack.",
      "editRewardsDisabledArchived": "Archived program, use a non-archived program to edit the reward pack.",
      "editRewardsDisabledFallback": "Missing program.update permission, grant it to edit the reward pack.",
      "activateDisabledNotDraft": "Only a draft program can be activated, set it back to draft status.",
      "activateDisabledFallback": "Incomplete draft (points, cash conversion or reward pack) or missing program.update permission, complete the config and grant the permission.",
      "liftSuspensionDisabledNotSuspended": "Suspension lift is only available for a suspended program.",
      "liftSuspensionDisabledFallback": "Missing program.pause permission, grant it to lift the suspension.",
      "pauseDisabledPending": "An operation is already in progress, wait for it to finish then try again.",
      "pauseDisabledRevenueTier": "Revenue-tier mode does not yet allow reactivation, finalize this logic on the backend.",
      "pauseDisabledReactivate": "Missing program.pause permission, grant it to reactivate this program.",
      "pauseDisabledPause": "Pause requires an active program with the program.pause permission.",
      "suspendDisabledNotActive": "Suspension is only allowed for an active or paused program.",
      "suspendDisabledOpenProspects": "There are still open prospects, close them before suspending.",
      "suspendDisabledFallback": "Missing program.pause permission, grant it to suspend this program.",
      "archiveDisabledNotSuspended": "Archiving is only possible after the program has been suspended.",
      "archiveDisabledNoDeadline": "Suspension end date missing, re-suspend the program to recreate the waiting period.",
      "archiveDisabledFallback": "The 30-day suspension period is not over or the program.pause permission is missing.",
      "assignDisabledBlocked": "Assignment blocked in suspended/archived status, reactivate the program to assign agents.",
      "assignDisabledFallback": "Missing program.assign-agent permission, grant it to manage assignments.",
      "deleteDisabledArchived": "Missing program.update permission, grant it to delete this archived program.",
      "deleteDisabledAssigned": "Active assignments exist, archive the program first or remove allowed assignments.",
      "deleteDisabledFallback": "Deletion is only allowed for an archived program, or one without active assignments and prospects.",
      "addProspectDisabledNoPermission": "Missing prospect.submit permission, grant it to allow submission.",
      "addProspectDisabledNotActive": "The program is not active, reactivate it to allow adding referrals.",
      "addProspectDisabledFallback": "Action temporarily unavailable, refresh the page and try again."
    },
    "timeline": {
      "suspended": "Suspended {{date}}",
      "paused": "Paused {{date}}",
      "active": "Activated {{date}}",
      "archived": "Archived {{date}}",
      "created": "Created {{date}}"
    },
    "notStarted": "Not started",
    "revenueTierPauseNotice": "Revenue-tier programs stay paused until tier rules are configured.",
    "suspension": {
      "notice": "Suspended: controlled wind-down mode. New referrals are blocked. You can lift the suspension to return to active, or archive the program after the deadline."
    }
  },
  "detail": {
    "back": "Back to programs",
    "addProspect": "Add prospect",
    "edit": "Edit",
    "manageRewards": "Manage rewards",
    "assignAgents": "Assign agents",
    "reactivate": "Reactivate",
    "pause": "Pause",
    "suspend": "Suspend",
    "archive": "Archive",
    "delete": "Delete",
    "editCash": "Edit cash",
    "activate": "Activate program",
    "liftSuspension": "Lift suspension",
    "kpi": {
      "assignedAgents": "Assigned agents",
      "prospects": "Prospects",
      "converted": "Converted",
      "pointsRule": "Points rule"
    },
    "kpiDescription": {
      "assignedAgents": "Affiliates currently linked to this program",
      "prospects": "Active referrals submitted via this program",
      "converted": "Referrals marked as converted",
      "pointsRule": "{{value}}"
    },
    "overview": {
      "title": "Program overview",
      "commission": "Commission",
      "points": "Points",
      "eligibility": "Eligibility",
      "noDescription": "No description available for this program."
    },
    "commission": {
      "perTransaction": "Per transaction",
      "revenueTier": "Revenue tier"
    },
    "pointsRule": {
      "configuredByTiers": "Configured by revenue tiers",
      "value": "{{points}} pts / transaction"
    },
    "cashRule": {
      "none": "No cash conversion",
      "value": "{{points}} pts = 1 €"
    },
    "meta": {
      "activated": "Activated",
      "updated": "Updated"
    },
    "exchangeConfig": {
      "title": "Exchange configuration",
      "cash": "Cash",
      "rewards": "Rewards",
      "noPackLinked": "No pack linked",
      "noRewardItems": "No reward items linked to this program."
    },
    "agents": {
      "title": "Assigned agents",
      "searchPlaceholder": "Search by name, email, code, status...",
      "table": {
        "number": "#",
        "agent": "Agent",
        "email": "Email",
        "code": "Code",
        "status": "Status",
        "assigned": "Assigned"
      },
      "empty": {
        "filter": "No assigned agent matches the current filter.",
        "none": "No agent is assigned to this program yet."
      }
    },
    "prospects": {
      "title": "Program referrals",
      "searchPlaceholder": "Search by contact, company, agent, status...",
      "noPermission": "Referral details are not available for this role.",
      "table": {
        "number": "#",
        "contact": "Contact",
        "email": "Email",
        "agent": "Agent",
        "pipeline": "Pipeline",
        "sync": "Sync",
        "submitted": "Submitted"
      },
      "empty": {
        "filter": "No referral matches the current filter.",
        "none": "No referral has been submitted via this program yet."
      }
    },
    "dialogs": {
      "editTitle": "Edit program",
      "save": "Save",
      "cashRules": "Cash rules",
      "rewardPack": "Reward pack"
    },
    "tooltip": {
      "editDisabledArchived": "Archived programs cannot be edited.",
      "editDisabledAssigned": "Agents are already assigned. Remove active assignments before editing general rules.",
      "editDisabledFallback": "Permission program.update missing or prospects already exist for this program.",
      "editCashDisabledNoCash": "Cash mode is not enabled for this program.",
      "editCashDisabledArchived": "Archived programs cannot edit cash rules.",
      "editCashDisabledAssigned": "Agents are already assigned. Remove active assignments before editing cash rules.",
      "editCashDisabledFallback": "Missing program.update permission.",
      "editRewardsDisabledNoRewards": "Rewards mode is not enabled for this program.",
      "editRewardsDisabledArchived": "Archived programs cannot edit reward packs.",
      "editRewardsDisabledFallback": "Missing program.update permission.",
      "activateDisabledNotDraft": "Only draft programs can be activated.",
      "activateDisabledFallback": "Finalize the program configuration and ensure you have the program.update permission.",
      "liftSuspensionDisabledNotSuspended": "Suspension lift is only available for suspended programs.",
      "liftSuspensionDisabledFallback": "Missing program.pause permission.",
      "pauseDisabledPending": "An action is already in progress on this program.",
      "pauseDisabledRevenueTier": "Revenue-tier programs cannot be reactivated until tier logic is finalized.",
      "pauseDisabledReactivate": "Missing program.pause permission for reactivation.",
      "pauseDisabledPause": "Pausing requires an active program and the program.pause permission.",
      "suspendDisabledNotActive": "Suspension is only available for active or paused programs.",
      "suspendDisabledOpenProspects": "Close open referrals before suspending this program.",
      "suspendDisabledFallback": "Missing program.pause permission.",
      "archiveDisabledNotSuspended": "Archiving is only available after a program has been suspended.",
      "archiveDisabledNoDeadline": "Suspension deadline is missing. Re-suspend the program to rebuild the waiting period.",
      "archiveDisabledFallback": "The suspension waiting period is not over or the program.pause permission is missing.",
      "assignDisabledBlocked": "Assignment is blocked when the program is suspended or archived.",
      "assignDisabledFallback": "Missing program.assign-agent permission.",
      "deleteDisabledArchived": "Missing program.update permission to delete an archived program.",
      "deleteDisabledAssigned": "Active assignments exist. Archive the program first or remove the concerned assignments.",
      "deleteDisabledFallback": "Deletion is only available for archived programs without assignments or prospects.",
      "addProspectDisabledNoPermission": "Missing prospect.submit permission.",
      "addProspectDisabledNotActive": "The program must be active for affiliates to add referrals.",
      "addProspectDisabledFallback": "This action is temporarily unavailable."
    }
  }
}

new_programs_fr = {
  "title": "Programmes",
  "eyebrow": "Opérations",
  "description": "Cycle de vie des programmes, assignations et règles de commission pour les convertis.",
  "createProgram": "Créer un programme",
  "searchPlaceholder": "Rechercher un programme...",
  "documentation": "Documentation",
  "tabs": {
    "programs": "Programmes",
    "archived": "Archivés"
  },
  "filters": {
    "status": "Statut",
    "allStatuses": "Tous les statuts",
    "business": "Business",
    "allBusinesses": "Tous les business",
    "exchangeMode": "Mode d'échange",
    "allModes": "Tous les modes",
    "sort": "Trier les programmes",
    "sortBy": "Trier par"
  },
  "status": {
    "active": "Actif",
    "draft": "Brouillon",
    "paused": "En pause",
    "suspended": "Suspendu",
    "archived": "Archivé"
  },
  "exchangeModes": {
    "cash": "Cash",
    "reward": "Récompenses",
    "both": "Mixte"
  },
  "sortOptions": {
    "newest": "Récents",
    "oldest": "Anciens",
    "status": "Statut",
    "pointsHigh": "Points (Décroissant)",
    "pointsLow": "Points (Croissant)",
    "agentsHigh": "Nombre d'agents ↓",
    "agentsLow": "Nombre d'agents ↑"
  },
  "noResults": "Aucun programme ne correspond au filtre actuel.",
  "dialogs": {
    "createTitle": "Créer un Programme",
    "editTitle": "Modifier le Programme",
    "save": "Enregistrer",
    "create": "Créer",
    "assignAgents": "Assigner des Agents",
    "assignAgentsDescription": "Sélectionnez les agents du business à rattacher à ce programme.",
    "cashRules": "Règles Cash",
    "rewardPack": "Pack de Récompenses",
    "confirmDelete": "Confirmer la Suppression",
    "deleteWarning": "Cette action est irréversible. Veuillez saisir le nom du programme pour confirmer.",
    "lockedAgentTooltip": "Cet agent a déjà ajouté des prospects dans ce programme et ne peut pas être retiré."
  },
  "card": {
    "actions": {
      "viewProgram": "Voir le programme",
      "addProspect": "Ajouter un prospect",
      "edit": "Modifier",
      "editCash": "Modifier le cash",
      "manageRewards": "Gérer le pack récompenses",
      "activate": "Activer le programme",
      "liftSuspension": "Lever la suspension",
      "reactivate": "Réactiver",
      "pause": "Mettre en pause",
      "suspend": "Suspendre",
      "archive": "Archiver",
      "assignAgents": "Assigner des agents",
      "delete": "Supprimer"
    },
    "availability": {
      "readOnly": "Lecture seule",
      "readyForProspects": "Prêt pour les prospects",
      "temporarilyPaused": "Temporairement en pause",
      "submissionBlocked": "Soumission bloquée",
      "unavailable": "Indisponible"
    },
    "availabilityHelper": {
      "readOnly": "La soumission de prospects n'est pas activée pour cet espace.",
      "readyForProspects": "Ouvrez le programme ou soumettez un nouveau prospect immédiatement.",
      "temporarilyPaused": "Consultez les détails du programme. La soumission de prospects est en pause.",
      "submissionBlocked": "Le propriétaire clôture ce programme. Les nouveaux prospects sont bloqués.",
      "unavailable": "Ce programme n'est pas ouvert aux nouvelles soumissions."
    },
    "meta": {
      "business": "Business",
      "attribution": "Attribution",
      "points": "Points",
      "exchange": "Échange",
      "cash": "Cash",
      "rewards": "Récompenses",
      "assignments": "Assignations"
    },
    "attribution": {
      "perTransaction": "Par transaction",
      "revenueTier": "Paliers CA"
    },
    "points": {
      "toConfigure": "À configurer"
    },
    "cash": {
      "rate": "{{points}} pts = 1 €",
      "notConfigured": "Cash non configuré"
    },
    "rewards": {
      "pack": "Pack",
      "noItemsConfigured": "Aucun article de récompense configuré.",
      "itemCost": "{{title}} - {{points}} pts"
    },
    "assignments": {
      "none": "Aucun agent assigné",
      "label_one": "Assignations - {{count}} agent",
      "label_other": "Assignations - {{count}} agents",
      "labelMany": "Assignés - {{count}}"
    },
    "dialog": {
      "businessScope": "Périmètre business",
      "businessScopeDescriptionOwner": "Contexte business de ce programme.",
      "businessScopeDescriptionAgent": "Le business propriétaire du programme. Il définit qui contrôle les règles, les récompenses et les assignations.",
      "attribution": "Attribution",
      "attributionDescriptionOwner": "Définit comment les agents gagnent des points à partir des résultats commerciaux. Gardez cette configuration claire pour que la logique de paiement reste prévisible.",
      "attributionDescriptionAgent": "Indique comment ce programme attribue des points pour vos activités.",
      "points": "Points",
      "pointsDescriptionOwner": "Taux de points actuel utilisé par ce programme. Cette valeur impacte directement la vitesse de gain des agents.",
      "pointsDescriptionAgent": "Valeur de points actuelle pour ce programme. Cela contrôle ce que vos actions génèrent.",
      "exchangeMode": "Mode d'échange",
      "exchangeModeDescriptionOwner": "Configuration des échanges pour ce programme.",
      "exchangeModeDescriptionAgent": "Indique si ce programme propose du cash, des récompenses ou les deux chemins de conversion.",
      "cashConversion": "Conversion cash",
      "cashConversionDescriptionOwner": "Définit le ratio de conversion des points en € pour les échanges cash.",
      "cashConversionDescriptionAgent": "Taux de conversion utilisé lorsque l'échange cash est disponible.",
      "rewardPack": "Pack récompenses",
      "rewardPackDescriptionOwner": "Catalogue de récompenses lié à ce programme et les coûts en points associés.",
      "rewardPackDescriptionAgent": "Articles disponibles en récompense et les points nécessaires pour chacun.",
      "assignmentsTitle": "Assignations",
      "assignmentsDescriptionOwner": "Agents actuellement liés à ce programme. Le nombre d'assignations aide à suivre la couverture et l'exécution.",
      "assignmentsDescriptionAgent": "Contexte d'assignation pour ce programme.",
      "viewAllPrograms": "Voir tous les programmes",
      "programAvailable_one": "{{count}} programme disponible",
      "programAvailable_other": "{{count}} programmes disponibles",
      "noOtherPrograms": "Aucun autre programme trouvé pour ce business.",
      "noRewardItems": "Aucun article de récompense configuré.",
      "noAgentsAssigned": "Aucun agent assigné.",
      "editCash": "Modifier le cash",
      "changePack": "Changer le pack",
      "editPack": "Modifier le pack"
    },
    "tooltip": {
      "editDisabledArchived": "Programme archivé, utilisez un programme non archivé pour modifier les réglages généraux.",
      "editDisabledAssigned": "Des agents sont déjà assignés, retirez les assignations actives pour réactiver cette modification.",
      "editDisabledFallback": "Des prospects existent déjà ou la permission program.update manque, utilisez un programme sans prospects ou accordez cette permission.",
      "editCashDisabledNoCash": "Mode cash inactif, passez ce programme en mode cash ou both pour éditer cette section.",
      "editCashDisabledArchived": "Programme archivé, utilisez un programme non archivé pour modifier les règles cash.",
      "editCashDisabledAssigned": "Des agents sont déjà assignés, retirez les assignations actives pour réactiver cette modification.",
      "editCashDisabledFallback": "Permission program.update manquante, accordez-la pour éditer les règles cash.",
      "editRewardsDisabledNoRewards": "Mode rewards inactif, passez ce programme en mode reward ou both pour éditer le pack.",
      "editRewardsDisabledArchived": "Programme archivé, utilisez un programme non archivé pour modifier le pack rewards.",
      "editRewardsDisabledFallback": "Permission program.update manquante, accordez-la pour modifier le pack rewards.",
      "activateDisabledNotDraft": "Seul un programme en brouillon peut être activé, remettez-le en statut draft.",
      "activateDisabledFallback": "Brouillon incomplet (points, conversion cash ou pack rewards) ou permission program.update manquante, complétez la config et accordez la permission.",
      "liftSuspensionDisabledNotSuspended": "La levée de suspension est disponible uniquement pour un programme suspendu.",
      "liftSuspensionDisabledFallback": "Permission program.pause manquante, accordez-la pour lever la suspension.",
      "pauseDisabledPending": "Une opération est déjà en cours, attendez la fin du traitement puis réessayez.",
      "pauseDisabledRevenueTier": "Le mode revenue-tier ne permet pas encore la réactivation, finalisez cette logique côté backend.",
      "pauseDisabledReactivate": "Permission program.pause manquante, accordez-la pour réactiver ce programme.",
      "pauseDisabledPause": "La pause nécessite un programme actif avec la permission program.pause.",
      "suspendDisabledNotActive": "La suspension est autorisée uniquement pour un programme actif ou en pause.",
      "suspendDisabledOpenProspects": "Des prospects sont encore ouverts, clôturez-les avant de suspendre.",
      "suspendDisabledFallback": "Permission program.pause manquante, accordez-la pour suspendre ce programme.",
      "archiveDisabledNotSuspended": "L'archivage n'est possible qu'après suspension du programme.",
      "archiveDisabledNoDeadline": "Date de fin de suspension absente, re-suspendez le programme pour recréer la période d'attente.",
      "archiveDisabledFallback": "Le délai de suspension de 30 jours n'est pas terminé ou la permission program.pause est manquante.",
      "assignDisabledBlocked": "Assignation bloquée en statut suspended/archived, réactivez le programme pour assigner des agents.",
      "assignDisabledFallback": "Permission program.assign-agent manquante, accordez-la pour gérer les assignations.",
      "deleteDisabledArchived": "Permission program.update manquante, accordez-la pour supprimer ce programme archivé.",
      "deleteDisabledAssigned": "Des assignations actives existent, archivez d'abord le programme, ou retirez les assignations autorisées.",
      "deleteDisabledFallback": "Suppression autorisée seulement pour un programme archivé, ou sans assignations actives et sans prospects.",
      "addProspectDisabledNoPermission": "Permission prospect.submit manquante, accordez-la pour autoriser la soumission.",
      "addProspectDisabledNotActive": "Le programme n'est pas actif, réactivez-le pour permettre l'ajout de prospects.",
      "addProspectDisabledFallback": "Action temporairement indisponible, actualisez la page puis réessayez."
    },
    "timeline": {
      "suspended": "Suspendu {{date}}",
      "paused": "En pause {{date}}",
      "active": "Activé {{date}}",
      "archived": "Archivé {{date}}",
      "created": "Créé {{date}}"
    },
    "notStarted": "Non démarré",
    "revenueTierPauseNotice": "Les programmes à paliers CA restent en pause jusqu'à ce que les règles de paliers soient configurées.",
    "suspension": {
      "notice": "Suspendu : mode de clôture progressive. Les nouveaux prospects sont bloqués. Vous pouvez lever la suspension pour revenir à l'état actif, ou archiver le programme après la date limite."
    }
  },
  "detail": {
    "back": "Retour aux programmes",
    "addProspect": "Ajouter un prospect",
    "edit": "Modifier",
    "manageRewards": "Gérer les récompenses",
    "assignAgents": "Assigner des agents",
    "reactivate": "Réactiver",
    "pause": "Mettre en pause",
    "suspend": "Suspendre",
    "archive": "Archiver",
    "delete": "Supprimer",
    "editCash": "Modifier le cash",
    "activate": "Activer le programme",
    "liftSuspension": "Lever la suspension",
    "kpi": {
      "assignedAgents": "Agents assignés",
      "prospects": "Prospects",
      "converted": "Convertis",
      "pointsRule": "Règle de points"
    },
    "kpiDescription": {
      "assignedAgents": "Agents actuellement liés à ce programme",
      "prospects": "Prospects actifs soumis via ce programme",
      "converted": "Prospects marqués comme convertis",
      "pointsRule": "{{value}}"
    },
    "overview": {
      "title": "Aperçu du programme",
      "commission": "Commission",
      "points": "Points",
      "eligibility": "Éligibilité",
      "noDescription": "Aucune description disponible pour ce programme."
    },
    "commission": {
      "perTransaction": "Par transaction",
      "revenueTier": "Paliers CA"
    },
    "pointsRule": {
      "configuredByTiers": "Configuré par paliers CA",
      "value": "{{points}} pts / transaction"
    },
    "cashRule": {
      "none": "Pas de conversion cash",
      "value": "{{points}} pts = 1 €"
    },
    "meta": {
      "activated": "Activé",
      "updated": "Mis à jour"
    },
    "exchangeConfig": {
      "title": "Configuration des échanges",
      "cash": "Cash",
      "rewards": "Récompenses",
      "noPackLinked": "Aucun pack lié",
      "noRewardItems": "Aucun article de récompense n'est lié à ce programme."
    },
    "agents": {
      "title": "Agents assignés",
      "searchPlaceholder": "Rechercher par nom, email, code, statut...",
      "table": {
        "number": "#",
        "agent": "Agent",
        "email": "Email",
        "code": "Code",
        "status": "Statut",
        "assigned": "Assigné"
      },
      "empty": {
        "filter": "Aucun agent assigné ne correspond au filtre actuel.",
        "none": "Aucun agent n'est encore assigné à ce programme."
      }
    },
    "prospects": {
      "title": "Prospects du programme",
      "searchPlaceholder": "Rechercher par contact, entreprise, agent, statut...",
      "noPermission": "Les détails des prospects ne sont pas disponibles pour ce rôle.",
      "table": {
        "number": "#",
        "contact": "Contact",
        "email": "Email",
        "agent": "Agent",
        "pipeline": "Pipeline",
        "sync": "Sync",
        "submitted": "Soumis"
      },
      "empty": {
        "filter": "Aucun prospect ne correspond au filtre actuel.",
        "none": "Aucun prospect n'a encore été soumis via ce programme."
      }
    },
    "dialogs": {
      "editTitle": "Modifier le programme",
      "save": "Enregistrer",
      "cashRules": "Règles cash",
      "rewardPack": "Pack récompenses"
    },
    "tooltip": {
      "editDisabledArchived": "Les programmes archivés ne peuvent pas être modifiés.",
      "editDisabledAssigned": "Des agents sont déjà assignés. Retirez les assignations actives avant de modifier les règles générales.",
      "editDisabledFallback": "Permission program.update manquante ou des prospects existent déjà pour ce programme.",
      "editCashDisabledNoCash": "Le mode cash n'est pas activé pour ce programme.",
      "editCashDisabledArchived": "Les programmes archivés ne peuvent pas modifier les règles cash.",
      "editCashDisabledAssigned": "Des agents sont déjà assignés. Retirez les assignations actives avant de modifier les règles cash.",
      "editCashDisabledFallback": "Permission program.update manquante.",
      "editRewardsDisabledNoRewards": "Le mode récompenses n'est pas activé pour ce programme.",
      "editRewardsDisabledArchived": "Les programmes archivés ne peuvent pas modifier les packs récompenses.",
      "editRewardsDisabledFallback": "Permission program.update manquante.",
      "activateDisabledNotDraft": "Seuls les programmes en brouillon peuvent être activés.",
      "activateDisabledFallback": "Finalisez la configuration du programme et assurez-vous d'avoir la permission program.update.",
      "liftSuspensionDisabledNotSuspended": "La levée de suspension n'est disponible que pour les programmes suspendus.",
      "liftSuspensionDisabledFallback": "Permission program.pause manquante.",
      "pauseDisabledPending": "Une action est déjà en cours sur ce programme.",
      "pauseDisabledRevenueTier": "Les programmes à paliers CA ne peuvent pas être réactivés tant que la logique de paliers n'est pas finalisée.",
      "pauseDisabledReactivate": "Permission program.pause manquante pour la réactivation.",
      "pauseDisabledPause": "La mise en pause nécessite un programme actif et la permission program.pause.",
      "suspendDisabledNotActive": "La suspension n'est disponible que pour les programmes actifs ou en pause.",
      "suspendDisabledOpenProspects": "Clôturez les prospects ouverts avant de suspendre ce programme.",
      "suspendDisabledFallback": "Permission program.pause manquante.",
      "archiveDisabledNotSuspended": "L'archivage n'est disponible qu'après la suspension d'un programme.",
      "archiveDisabledNoDeadline": "La date limite de suspension est manquante. Re-suspendez le programme pour reconstruire la période d'attente.",
      "archiveDisabledFallback": "La période d'attente de suspension n'est pas terminée ou la permission program.pause est manquante.",
      "assignDisabledBlocked": "L'assignation est bloquée lorsque le programme est suspendu ou archivé.",
      "assignDisabledFallback": "Permission program.assign-agent manquante.",
      "deleteDisabledArchived": "Permission program.update manquante pour la suppression d'un programme archivé.",
      "deleteDisabledAssigned": "Des assignations actives existent. Archivez d'abord le programme ou retirez les assignations concernées.",
      "deleteDisabledFallback": "La suppression n'est disponible que pour les programmes archivés sans assignations ni prospects.",
      "addProspectDisabledNoPermission": "Permission prospect.submit manquante.",
      "addProspectDisabledNotActive": "Le programme doit être actif pour que les agents puissent ajouter des prospects.",
      "addProspectDisabledFallback": "Cette action est temporairement indisponible."
    }
  }
}

def merge():
    for fname, data in [("en.json", new_programs_en), ("fr.json", new_programs_fr)]:
        path = ROOT / "src" / "i18n" / "locales" / fname
        obj = json.loads(path.read_text(encoding="utf-8"))
        obj["programs"] = data
        path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Updated {fname}")

if __name__ == "__main__":
    merge()
