export type CertaintyLevel = 'CONFIRMED' | 'UNCERTAIN_INTERPRETATION';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EDITED' | 'STALE';

export type ObligationCategory = 
  | 'PAYMENT' 
  | 'DELIVERABLE' 
  | 'COMPLIANCE' 
  | 'AUDIT' 
  | 'INSURANCE' 
  | 'REPORTING' 
  | 'CONFIDENTIALITY' 
  | 'DATA_PROTECTION' 
  | 'OTHER';

export type ResponsibleParty = 'Vendor' | 'Customer' | 'Mutual';

export type RecurrenceType = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'EVENT_DRIVEN';

export interface UserAuditRecord {
  id: string;
  itemId: string;
  itemType: string;
  action: 'APPROVED' | 'REJECTED' | 'EDITED' | 'RESET' | 'RESOLVED_AMBIGUITY';
  timestamp: string;
  user: string;
  notes?: string;
  previousValue?: string;
  newValue?: string;
}

export interface ReminderAlert {
  id: string;
  label: string;
  date: string; // ISO YYYY-MM-DD
  daysBefore: number;
  alertLevel: 'CRITICAL' | 'WARNING' | 'INFO';
  isPast: boolean;
  daysRemaining: number;
  triggerDescription: string;
}

export interface PartyInfo {
  id: string;
  name: string;
  role: 'Customer / Client' | 'Vendor / Service Provider' | 'Partner' | 'Other';
  jurisdiction?: string;
  address?: string;
  citation: string;
  exactQuote: string;
  certainty: CertaintyLevel;
  confidenceScore: number;
  status: ReviewStatus;
  staleReason?: string;
  userCorrection?: string;
  clarificationQuestion?: string;
}

export interface ContractDates {
  effectiveDate: {
    value: string; // ISO YYYY-MM-DD
    citation: string;
    exactQuote: string;
    certainty: CertaintyLevel;
    status: ReviewStatus;
    staleReason?: string;
    userCorrection?: string;
    clarificationQuestion?: string;
  };
  initialTerm: {
    value: string; // e.g., "36 months"
    durationMonths: number;
    citation: string;
    exactQuote: string;
    certainty: CertaintyLevel;
    status: ReviewStatus;
    staleReason?: string;
    userCorrection?: string;
  };
  expiryDate: {
    value: string; // ISO YYYY-MM-DD
    citation: string;
    exactQuote: string;
    certainty: CertaintyLevel;
    status: ReviewStatus;
    staleReason?: string;
    userCorrection?: string;
    clarificationQuestion?: string;
  };
}

export interface RenewalClause {
  id: string;
  type: 'AUTO_RENEWAL' | 'OPT_IN' | 'FIXED_TERM' | 'EXPIRING' | 'NO_RENEWAL';
  renewalPeriodMonths: number;
  renewalPeriodText: string;
  noticeWindowDays: number;
  noticeWindowText: string;
  noticeMethodRequired?: string;
  priceCapOrAdjustment?: string;
  deterministicRenewalDeadline: string; // ISO YYYY-MM-DD (Expiry - noticeWindowDays)
  calculationFormula: string;
  reminders: ReminderAlert[];
  citation: string;
  exactQuote: string;
  certainty: CertaintyLevel;
  clarificationQuestion?: string;
  status: ReviewStatus;
  staleReason?: string;
  userCorrection?: string;
}

export interface TerminationClause {
  id: string;
  hasConvenienceTermination: boolean;
  convenienceNoticeDays?: number;
  convenienceConditions?: string;
  hasCauseTermination: boolean;
  causeCurePeriodDays: number;
  postTerminationTransitionDays?: number;
  dataExportRetentionDays?: number;
  citation: string;
  exactQuote: string;
  certainty: CertaintyLevel;
  clarificationQuestion?: string;
  status: ReviewStatus;
  staleReason?: string;
  userCorrection?: string;
}

export interface NoticeClause {
  id: string;
  permittedMethods: string[];
  restrictedMethods?: string[]; // e.g. "email alone is insufficient"
  designatedRecipient: string;
  designatedAddress: string;
  deemedReceivedDays: number;
  citation: string;
  exactQuote: string;
  certainty: CertaintyLevel;
  clarificationQuestion?: string;
  status: ReviewStatus;
  staleReason?: string;
  userCorrection?: string;
}

export interface ObligationItem {
  id: string;
  title: string;
  description: string;
  category: ObligationCategory;
  responsibleParty: ResponsibleParty;
  recurrence: RecurrenceType;
  targetDate: string; // ISO YYYY-MM-DD or deterministic calculated date
  dateCalculationMethod?: string;
  curePeriodDays?: number;
  reminders: ReminderAlert[];
  citation: string;
  exactQuote: string;
  certainty: CertaintyLevel;
  clarificationQuestion?: string;
  status: ReviewStatus;
  staleReason?: string;
  previousVersionValue?: string;
  userCorrection?: string;
  userNotes?: string;
}

export type ConflictSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ConflictType = 
  | 'INTERNAL_CONTRACT_CONFLICT' 
  | 'POLICY_VIOLATION' 
  | 'AMBIGUOUS_TIMELINE' 
  | 'MISSING_STANDARD_CLAUSE';

export interface ConflictingOrUnclearTerm {
  id: string;
  title: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  description: string;
  contractSectionA: string;
  quoteA: string;
  contractSectionB?: string;
  quoteB?: string;
  policySection?: string;
  policyRequirement?: string;
  policyQuote?: string;
  clarificationQuestion: string;
  operationalRecommendation: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  userResolutionNote?: string;
  resolvedAt?: string;
}

export interface PolicyRule {
  id: string;
  category: string;
  ruleTitle: string;
  requirement: string;
  thresholdOrStandard: string;
  citation: string;
  exactQuote: string;
}

export interface OrganizationalPolicy {
  id: string;
  fileName: string;
  uploadedAt: string;
  rawText: string;
  rules: PolicyRule[];
}

export interface ContractVersion {
  id: string;
  versionNumber: number; // 1, 2, 3...
  versionLabel: string; // e.g. "v1.0 (Initial Draft)", "v2.0 (Amendment)"
  fileName: string;
  uploadedAt: string;
  rawText: string;
  parties: PartyInfo[];
  dates: ContractDates;
  renewal: RenewalClause;
  termination: TerminationClause;
  notice: NoticeClause;
  obligations: ObligationItem[];
  conflicts: ConflictingOrUnclearTerm[];
  auditLog: UserAuditRecord[];
}

export interface ExtractedContractState {
  currentVersionId: string;
  versions: ContractVersion[];
  policy?: OrganizationalPolicy;
}
