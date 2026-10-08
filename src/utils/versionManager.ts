import type {
  ContractVersion,
  ObligationItem,
  ReviewStatus,
} from '../types/contract';

export interface VersionDiffItem {
  id: string;
  category: 'PARTIES' | 'DATES' | 'RENEWAL' | 'TERMINATION' | 'NOTICE' | 'OBLIGATION';
  title: string;
  field: string;
  v1Value: string;
  v2Value: string;
  isChanged: boolean;
  isStaleFlagged: boolean;
  explanation: string;
}

export interface VersionComparisonResult {
  previousVersion: ContractVersion;
  newVersion: ContractVersion;
  diffItems: VersionDiffItem[];
  staleCount: number;
  changedCount: number;
  preservedCorrectionCount: number;
}

/**
 * Merges and reconciles a new contract version against the previous version.
 * Marks previously approved items whose text or values changed as 'STALE'.
 * Preserves user corrections and audit history.
 */
export function reconcileNewVersion(
  prevVersion: ContractVersion,
  newVersionRaw: ContractVersion
): VersionComparisonResult {
  const diffItems: VersionDiffItem[] = [];
  let staleCount = 0;
  let changedCount = 0;
  let preservedCorrectionCount = 0;

  const updatedVersion: ContractVersion = JSON.parse(JSON.stringify(newVersionRaw));

  // 1. Check Dates
  // Effective Date
  const effChanged = prevVersion.dates.effectiveDate.value !== updatedVersion.dates.effectiveDate.value;
  if (effChanged) {
    changedCount++;
    if (prevVersion.dates.effectiveDate.status === 'APPROVED') {
      updatedVersion.dates.effectiveDate.status = 'STALE';
      updatedVersion.dates.effectiveDate.staleReason = `Effective date changed from ${prevVersion.dates.effectiveDate.value} to ${updatedVersion.dates.effectiveDate.value}`;
      staleCount++;
    }
  } else {
    // Preserve approval & user correction
    updatedVersion.dates.effectiveDate.status = prevVersion.dates.effectiveDate.status;
    if (prevVersion.dates.effectiveDate.userCorrection) {
      updatedVersion.dates.effectiveDate.userCorrection = prevVersion.dates.effectiveDate.userCorrection;
      preservedCorrectionCount++;
    }
  }
  diffItems.push({
    id: 'diff-effective-date',
    category: 'DATES',
    title: 'Effective Date',
    field: 'effectiveDate',
    v1Value: prevVersion.dates.effectiveDate.value,
    v2Value: updatedVersion.dates.effectiveDate.value,
    isChanged: effChanged,
    isStaleFlagged: updatedVersion.dates.effectiveDate.status === 'STALE',
    explanation: effChanged ? 'Effective date modified in new version' : 'Unchanged',
  });

  // Expiry Date
  const expChanged = prevVersion.dates.expiryDate.value !== updatedVersion.dates.expiryDate.value;
  if (expChanged) {
    changedCount++;
    if (prevVersion.dates.expiryDate.status === 'APPROVED') {
      updatedVersion.dates.expiryDate.status = 'STALE';
      updatedVersion.dates.expiryDate.staleReason = `Contract Expiry date extended from ${prevVersion.dates.expiryDate.value} to ${updatedVersion.dates.expiryDate.value}`;
      staleCount++;
    }
  } else {
    updatedVersion.dates.expiryDate.status = prevVersion.dates.expiryDate.status;
    if (prevVersion.dates.expiryDate.userCorrection) {
      updatedVersion.dates.expiryDate.userCorrection = prevVersion.dates.expiryDate.userCorrection;
      preservedCorrectionCount++;
    }
  }
  diffItems.push({
    id: 'diff-expiry-date',
    category: 'DATES',
    title: 'Contract Expiry Date',
    field: 'expiryDate',
    v1Value: prevVersion.dates.expiryDate.value,
    v2Value: updatedVersion.dates.expiryDate.value,
    isChanged: expChanged,
    isStaleFlagged: updatedVersion.dates.expiryDate.status === 'STALE',
    explanation: expChanged
      ? `Extended by 12 months (New Expiry: ${updatedVersion.dates.expiryDate.value})`
      : 'Unchanged',
  });

  // 2. Check Renewal Clause
  const renewalWindowChanged = prevVersion.renewal.noticeWindowDays !== updatedVersion.renewal.noticeWindowDays;
  const renewalDeadlineChanged = prevVersion.renewal.deterministicRenewalDeadline !== updatedVersion.renewal.deterministicRenewalDeadline;
  const renewalAnyChanged = renewalWindowChanged || renewalDeadlineChanged;

  if (renewalAnyChanged) {
    changedCount++;
    if (prevVersion.renewal.status === 'APPROVED') {
      updatedVersion.renewal.status = 'STALE';
      updatedVersion.renewal.staleReason = `Renewal notice window adjusted from ${prevVersion.renewal.noticeWindowDays} days to ${updatedVersion.renewal.noticeWindowDays} days; calculated deadline moved to ${updatedVersion.renewal.deterministicRenewalDeadline}`;
      staleCount++;
    }
  } else {
    updatedVersion.renewal.status = prevVersion.renewal.status;
    if (prevVersion.renewal.userCorrection) {
      updatedVersion.renewal.userCorrection = prevVersion.renewal.userCorrection;
      preservedCorrectionCount++;
    }
  }
  diffItems.push({
    id: 'diff-renewal-window',
    category: 'RENEWAL',
    title: 'Renewal Notice Window & Deadline',
    field: 'renewalNoticeWindow',
    v1Value: `${prevVersion.renewal.noticeWindowDays} days notice (Deadline: ${prevVersion.renewal.deterministicRenewalDeadline})`,
    v2Value: `${updatedVersion.renewal.noticeWindowDays} days notice (Deadline: ${updatedVersion.renewal.deterministicRenewalDeadline})`,
    isChanged: renewalAnyChanged,
    isStaleFlagged: updatedVersion.renewal.status === 'STALE',
    explanation: renewalWindowChanged
      ? `Notice requirement expanded from ${prevVersion.renewal.noticeWindowDays} to ${updatedVersion.renewal.noticeWindowDays} days. Deterministic deadline recalculated.`
      : 'Unchanged',
  });

  // 3. Reconcile Obligations
  const updatedObligations: ObligationItem[] = [];

  for (const newOb of updatedVersion.obligations) {
    const prevMatch = prevVersion.obligations.find(
      (p) => p.id === newOb.id || p.category === newOb.category
    );

    if (prevMatch) {
      const isContentChanged =
        prevMatch.exactQuote !== newOb.exactQuote ||
        prevMatch.targetDate !== newOb.targetDate ||
        prevMatch.title !== newOb.title;

      if (isContentChanged) {
        changedCount++;
        let status: ReviewStatus = 'PENDING';
        let staleReason: string | undefined = undefined;

        if (prevMatch.status === 'APPROVED') {
          status = 'STALE';
          staleReason = `Obligation parameters modified in ${updatedVersion.versionLabel}. Previously approved in ${prevVersion.versionLabel}. Re-approval required.`;
          staleCount++;
        }

        updatedObligations.push({
          ...newOb,
          status,
          staleReason,
          previousVersionValue: `${prevMatch.title} [Target: ${prevMatch.targetDate}]`,
          userCorrection: prevMatch.userCorrection,
          userNotes: prevMatch.userNotes
            ? `${prevMatch.userNotes} (Preserved from ${prevVersion.versionLabel})`
            : undefined,
        });

        if (prevMatch.userCorrection) preservedCorrectionCount++;

        diffItems.push({
          id: `diff-ob-${newOb.id}`,
          category: 'OBLIGATION',
          title: newOb.title,
          field: newOb.category,
          v1Value: `${prevMatch.title} | ${prevMatch.targetDate}`,
          v2Value: `${newOb.title} | ${newOb.targetDate}`,
          isChanged: true,
          isStaleFlagged: status === 'STALE',
          explanation: `Updated in new version: quote or parameters changed.`,
        });
      } else {
        // Unchanged: preserve previous status and user corrections
        updatedObligations.push({
          ...newOb,
          status: prevMatch.status,
          userCorrection: prevMatch.userCorrection,
          userNotes: prevMatch.userNotes,
        });
        if (prevMatch.userCorrection) preservedCorrectionCount++;
      }
    } else {
      // Brand new obligation
      updatedObligations.push(newOb);
      diffItems.push({
        id: `diff-ob-new-${newOb.id}`,
        category: 'OBLIGATION',
        title: newOb.title,
        field: newOb.category,
        v1Value: 'Not present in v1',
        v2Value: newOb.title,
        isChanged: true,
        isStaleFlagged: false,
        explanation: 'New obligation introduced in this version',
      });
      changedCount++;
    }
  }

  updatedVersion.obligations = updatedObligations;

  // Preserve and append audit history
  const combinedAudit = [
    ...prevVersion.auditLog,
    {
      id: `audit-reconcile-${Date.now()}`,
      itemId: updatedVersion.id,
      itemType: 'VERSION_COMPARISON',
      action: 'EDITED' as const,
      timestamp: new Date().toISOString(),
      user: 'Version Reconciliation Engine',
      notes: `Reconciled ${updatedVersion.versionLabel} against ${prevVersion.versionLabel}. ${staleCount} items marked as POTENTIALLY STALE due to underlying modifications. ${preservedCorrectionCount} user corrections preserved.`,
    },
  ];
  updatedVersion.auditLog = combinedAudit;

  return {
    previousVersion: prevVersion,
    newVersion: updatedVersion,
    diffItems,
    staleCount,
    changedCount,
    preservedCorrectionCount,
  };
}
