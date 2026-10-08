import React, { useState, useEffect, useRef } from 'react';
import { 
  ListChecks, 
  CalendarClock, 
  AlertTriangle, 
  GitCompare, 
  FileText, 
  Eye,
  Loader2,
} from 'lucide-react';
import type { 
  ContractVersion, 
  OrganizationalPolicy, 
  ReviewStatus,
} from './types/contract';
import { 
  extractContract, 
  extractPolicyRules 
} from './utils/contractExtractor';
import { 
  SAMPLE_CONTRACT_V1_TEXT, 
  SAMPLE_POLICY_TEXT, 
  SAMPLE_CONTRACT_V2_TEXT
} from './utils/sampleContracts';
import { reconcileNewVersion } from './utils/versionManager';

// Components
import { Header } from './components/Header';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { StatCards } from './components/StatCards';
import { ExtractionWorkbench } from './components/ExtractionWorkbench';
import { DeadlinesTimeline } from './components/DeadlinesTimeline';
import { ConflictsClarifications } from './components/ConflictsClarifications';
import { VersionDiffView } from './components/VersionDiffView';
import { ReviewedSummaryView } from './components/ReviewedSummaryView';
import { DocumentViewer } from './components/DocumentViewer';
import { EditItemModal } from './components/EditItemModal';
import { UploadModal } from './components/UploadModal';
import { DocumentIntakeHero } from './components/DocumentIntakeHero';
import { OperationalDatesModal } from './components/OperationalDatesModal';
import { LogsDrawer } from './components/LogsDrawer';
import { AiConsultantModal } from './components/AiConsultantModal';
import { 
  calculateRenewalDeadline, 
  generateDeterministicReminders, 
  addDays 
} from './utils/deterministicDate';
import {
  getSavedContracts,
  saveContracts,
  getSavedPolicy,
  savePolicy,
  runAiContractAnalysis,
  logStructuredEvent,
} from './services/api';

export const App: React.FC = () => {
  // Optional organizational policy state
  const [policy, setPolicy] = useState<OrganizationalPolicy | undefined>(undefined);

  // Contract versions
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string>('');

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<
    'WORKBENCH' | 'TIMELINE' | 'CONFLICTS' | 'DIFF' | 'SUMMARY' | 'VIEWER'
  >('WORKBENCH');

  // Persistence Initialized Flag
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  // AI Loading & Analysis State
  const [aiAnalyzing, setAiAnalyzing] = useState<{ isAnalyzing: boolean; message: string }>({
    isAnalyzing: false,
    message: '',
  });

  // Logs Drawer State
  const [isLogsOpen, setIsLogsOpen] = useState<boolean>(false);

  // AI Clause Consultant Modal State
  const [aiConsultModal, setAiConsultModal] = useState<{
    isOpen: boolean;
    title: string;
    clauseText: string;
  }>({
    isOpen: false,
    title: '',
    clauseText: '',
  });

  // Modal States
  const [uploadModalState, setUploadModalState] = useState<{
    isOpen: boolean;
    mode: 'CONTRACT' | 'POLICY' | 'CONTRACT_NEW_VERSION';
  }>({
    isOpen: false,
    mode: 'CONTRACT',
  });

  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    item: any;
    itemType: string;
  }>({
    isOpen: false,
    item: null,
    itemType: '',
  });

  const [operationalDatesModalOpen, setOperationalDatesModalOpen] = useState(false);

  // 1. Initial Load from Backend & LocalStorage Persistence
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initData = async () => {
      try {
        const [savedVersions, savedPolicy] = await Promise.all([
          getSavedContracts(),
          getSavedPolicy(),
        ]);

        if (savedVersions && savedVersions.length > 0) {
          setVersions(savedVersions);
          setCurrentVersionId(savedVersions[savedVersions.length - 1].id);
        }
        if (savedPolicy) {
          setPolicy(savedPolicy);
        }
        await logStructuredEvent('INFO', 'STORAGE', 'Loaded persistent contract workspace state', {
          versionsLoaded: savedVersions?.length || 0,
          hasPolicy: !!savedPolicy,
        });
      } catch (err) {
        console.warn('Initial persistence loading notice:', err);
      } finally {
        setIsInitialized(true);
      }
    };
    initData();
  }, []);

  // 2. Auto-persist versions on updates
  useEffect(() => {
    if (isInitialized) {
      saveContracts(versions);
    }
  }, [versions, isInitialized]);

  // 3. Auto-persist policy on updates
  useEffect(() => {
    if (isInitialized) {
      savePolicy(policy || null);
    }
  }, [policy, isInitialized]);

  const currentVersion = versions.find((v) => v.id === currentVersionId) || versions[0];

  // Helper to update current version and record audit log
  const updateCurrentVersion = (
    updater: (prev: ContractVersion) => ContractVersion,
    auditAction?: { action: any; notes: string; itemId?: string; itemType?: string }
  ) => {
    setVersions((prevVersions) =>
      prevVersions.map((v) => {
        if (v.id !== currentVersionId) return v;
        const updated = updater(v);
        if (auditAction) {
          const newRecord = {
            id: `audit-${Date.now()}`,
            itemId: auditAction.itemId || 'user-action',
            itemType: auditAction.itemType || 'STATUS_UPDATE',
            action: auditAction.action,
            timestamp: new Date().toISOString(),
            user: 'User / Human Reviewer',
            notes: auditAction.notes,
          };
          updated.auditLog = [...updated.auditLog, newRecord];

          // Structured Audit Log Entry
          logStructuredEvent('AUDIT', 'HUMAN_REVIEW', `Human review action: ${auditAction.notes}`, {
            action: auditAction.action,
            itemId: auditAction.itemId,
            itemType: auditAction.itemType,
          });
        }
        return updated;
      })
    );
  };

  // --- Handlers for Item Review Updates ---
  const handleUpdatePartyStatus = (partyId: string, status: ReviewStatus) => {
    updateCurrentVersion(
      (v) => ({
        ...v,
        parties: v.parties.map((p) => (p.id === partyId ? { ...p, status } : p)),
      }),
      { action: status, notes: `Party status set to ${status}`, itemId: partyId, itemType: 'PARTY' }
    );
  };

  const handleUpdateDateStatus = (dateField: 'effectiveDate' | 'initialTerm' | 'expiryDate', status: ReviewStatus) => {
    updateCurrentVersion(
      (v) => ({
        ...v,
        dates: {
          ...v.dates,
          [dateField]: { ...v.dates[dateField], status },
        },
      }),
      { action: status, notes: `${dateField} status set to ${status}`, itemId: dateField, itemType: 'DATE' }
    );
  };

  const handleUpdateRenewalStatus = (status: ReviewStatus) => {
    updateCurrentVersion(
      (v) => ({
        ...v,
        renewal: { ...v.renewal, status },
      }),
      { action: status, notes: `Renewal clause status set to ${status}`, itemId: 'renewal', itemType: 'RENEWAL' }
    );
  };

  const handleUpdateTerminationStatus = (status: ReviewStatus) => {
    updateCurrentVersion(
      (v) => ({
        ...v,
        termination: { ...v.termination, status },
      }),
      { action: status, notes: `Termination clause status set to ${status}`, itemId: 'termination', itemType: 'TERMINATION' }
    );
  };

  const handleUpdateNoticeStatus = (status: ReviewStatus) => {
    updateCurrentVersion(
      (v) => ({
        ...v,
        notice: { ...v.notice, status },
      }),
      { action: status, notes: `Notice clause status set to ${status}`, itemId: 'notice', itemType: 'NOTICE' }
    );
  };

  const handleUpdateObligationStatus = (obligationId: string, status: ReviewStatus) => {
    updateCurrentVersion(
      (v) => ({
        ...v,
        obligations: v.obligations.map((o) => (o.id === obligationId ? { ...o, status } : o)),
      }),
      { action: status, notes: `Obligation ${obligationId} status set to ${status}`, itemId: obligationId, itemType: 'OBLIGATION' }
    );
  };

  const handleApproveAllPending = () => {
    updateCurrentVersion(
      (v) => ({
        ...v,
        parties: v.parties.map((p) => ({ ...p, status: 'APPROVED' as ReviewStatus })),
        dates: {
          effectiveDate: { ...v.dates.effectiveDate, status: 'APPROVED' },
          initialTerm: { ...v.dates.initialTerm, status: 'APPROVED' },
          expiryDate: { ...v.dates.expiryDate, status: 'APPROVED' },
        },
        renewal: { ...v.renewal, status: 'APPROVED' },
        termination: { ...v.termination, status: 'APPROVED' },
        notice: { ...v.notice, status: 'APPROVED' },
        obligations: v.obligations.map((o) => ({ ...o, status: 'APPROVED' as ReviewStatus })),
      }),
      { action: 'APPROVED', notes: 'Bulk approved all pending and potentially stale items.', itemId: 'all', itemType: 'BULK_APPROVAL' }
    );
  };

  // Resolve conflict
  const handleResolveConflict = (conflictId: string, resolutionNote: string) => {
    updateCurrentVersion(
      (v) => ({
        ...v,
        conflicts: v.conflicts.map((c) =>
          c.id === conflictId
            ? {
                ...c,
                status: 'RESOLVED',
                userResolutionNote: resolutionNote,
                resolvedAt: new Date().toISOString(),
              }
            : c
        ),
      }),
      { action: 'RESOLVED_AMBIGUITY', notes: `Resolved conflict: ${resolutionNote}`, itemId: conflictId, itemType: 'AMBIGUITY' }
    );
  };

  const handleDismissConflict = (conflictId: string) => {
    updateCurrentVersion((v) => ({
      ...v,
      conflicts: v.conflicts.map((c) => (c.id === conflictId ? { ...c, status: 'DISMISSED' } : c)),
    }));
  };

  // Re-approve stale items from diff view
  const handleReApproveFromDiff = (itemId: string, itemType: string) => {
    if (itemType === 'DATES') {
      if (itemId === 'diff-effective-date') handleUpdateDateStatus('effectiveDate', 'APPROVED');
      if (itemId === 'diff-expiry-date') handleUpdateDateStatus('expiryDate', 'APPROVED');
    } else if (itemType === 'RENEWAL') {
      handleUpdateRenewalStatus('APPROVED');
    } else if (itemType === 'OBLIGATION') {
      const realId = itemId.replace('diff-ob-', '');
      handleUpdateObligationStatus(realId, 'APPROVED');
    }
  };

  // Edit modal save
  const handleSaveEditedItem = (updatedItem: any, itemType: string, correctionNote: string) => {
    updateCurrentVersion(
      (v) => {
        if (itemType === 'PARTY') {
          return {
            ...v,
            parties: v.parties.map((p) => (p.id === updatedItem.id ? { ...p, ...updatedItem } : p)),
          };
        }
        if (itemType.startsWith('DATE_')) {
          const field =
            itemType === 'DATE_EFFECTIVE'
              ? 'effectiveDate'
              : itemType === 'DATE_TERM'
              ? 'initialTerm'
              : 'expiryDate';
          return {
            ...v,
            dates: { ...v.dates, [field]: { ...v.dates[field as keyof typeof v.dates], ...updatedItem } },
          };
        }
        if (itemType === 'RENEWAL') {
          return { ...v, renewal: { ...v.renewal, ...updatedItem } };
        }
        if (itemType === 'TERMINATION') {
          return { ...v, termination: { ...v.termination, ...updatedItem } };
        }
        if (itemType === 'NOTICE') {
          return { ...v, notice: { ...v.notice, ...updatedItem } };
        }
        if (itemType === 'OBLIGATION') {
          return {
            ...v,
            obligations: v.obligations.map((o) => (o.id === updatedItem.id ? { ...o, ...updatedItem } : o)),
          };
        }
        return v;
      },
      { action: 'EDITED', notes: `User edited item: ${correctionNote || 'Updated fields'}`, itemId: updatedItem.id, itemType }
    );
  };

  const handleSaveOperationalDates = ({
    effectiveDate,
    expiryDate,
    initialTerm,
    hasRenewalOption,
    renewalNoticeDays,
    renewalPeriodMonths,
    auditNote,
  }: {
    effectiveDate: string;
    expiryDate: string;
    initialTerm: string;
    hasRenewalOption: boolean;
    renewalNoticeDays: number;
    renewalPeriodMonths: number;
    auditNote: string;
  }) => {
    updateCurrentVersion(
      (v) => {
        let updatedRenewal = { ...v.renewal };
        if (hasRenewalOption && renewalNoticeDays > 0) {
          const deadlineCalc = calculateRenewalDeadline(expiryDate, renewalNoticeDays);
          const reminders = generateDeterministicReminders(
            deadlineCalc.deadline,
            'Contract Option/Extension Cutoff',
            [60, 30, 14, 7, 1]
          );
          updatedRenewal = {
            ...v.renewal,
            type: 'AUTO_RENEWAL',
            noticeWindowDays: renewalNoticeDays,
            renewalPeriodMonths,
            renewalPeriodText: `${renewalPeriodMonths} months extension`,
            deterministicRenewalDeadline: deadlineCalc.deadline,
            calculationFormula: deadlineCalc.formula,
            reminders,
            certainty: 'CONFIRMED',
            status: 'EDITED',
            userCorrection: `User configured renewal option: ${renewalNoticeDays}d notice window`,
          };
        } else {
          updatedRenewal = {
            ...v.renewal,
            type: 'NO_RENEWAL',
            noticeWindowDays: 0,
            renewalPeriodMonths: 0,
            renewalPeriodText: 'No Automatic Renewal (Fixed Term)',
            deterministicRenewalDeadline: 'N/A',
            calculationFormula: 'N/A — Contract contains no renewal clause and no renewal date is specified in PDF',
            reminders: [],
            certainty: 'CONFIRMED',
            status: 'EDITED',
            userCorrection: 'Confirmed fixed-term contract without auto-renewal',
          };
        }

        const updatedObligations = v.obligations.map((ob) => {
          if (ob.id === 'ob-final-invoice-cutoff') {
            const finalInvDate = addDays(expiryDate, 60);
            return {
              ...ob,
              targetDate: finalInvDate,
              dateCalculationMethod: `Contract End Date (${expiryDate}) + 60 calendar days = ${finalInvDate}`,
              reminders: generateDeterministicReminders(finalInvDate, 'CRITICAL: Final Invoice Donor Cutoff', [60, 30, 14, 7, 1]),
            };
          }
          if (ob.id === 'ob-hmo-coverage' && effectiveDate) {
            return {
              ...ob,
              targetDate: effectiveDate,
              reminders: generateDeterministicReminders(effectiveDate, 'HMO Inception Active', [14, 7, 1]),
            };
          }
          return ob;
        });

        return {
          ...v,
          dates: {
            ...v.dates,
            effectiveDate: {
              ...v.dates.effectiveDate,
              value: effectiveDate,
              certainty: 'CONFIRMED',
              status: 'EDITED',
              userCorrection: `Operational inception date confirmed: ${effectiveDate}`,
            },
            expiryDate: {
              ...v.dates.expiryDate,
              value: expiryDate,
              certainty: 'CONFIRMED',
              status: 'EDITED',
              userCorrection: `Operational expiration date confirmed: ${expiryDate}`,
            },
            initialTerm: {
              ...v.dates.initialTerm,
              value: initialTerm,
              certainty: 'CONFIRMED',
              status: 'EDITED',
              userCorrection: `Operational term confirmed: ${initialTerm}`,
            },
          },
          renewal: updatedRenewal,
          obligations: updatedObligations,
        };
      },
      {
        action: 'EDITED',
        notes: auditNote || `Configured confirmed operational dates: ${effectiveDate} to ${expiryDate}`,
        itemId: 'dates-reconciliation',
        itemType: 'OPERATIONAL_DATES',
      }
    );
  };

  // Ingest contract document (v1 or new version v2) with Gemini AI Agent
  const handleProcessContract = async (text: string, fileName: string, isNewVersion: boolean) => {
    const nextVerNum = isNewVersion ? versions.length + 1 : 1;
    setAiAnalyzing({
      isAnalyzing: true,
      message: 'Gemini 2.5 Flash analyzing clauses, extracting obligations, and grounding citations...',
    });

    try {
      const { version: analyzedVersion, provider } = await runAiContractAnalysis(
        text,
        fileName,
        nextVerNum,
        policy
      );

      await logStructuredEvent(
        'AI_AGENT',
        'GEMINI_AGENT',
        `Contract analyzed via ${provider === 'GEMINI_AI' ? 'Google Gemini 2.5 Flash' : 'Deterministic Heuristics Engine'}`,
        { fileName, provider, obligationsCount: analyzedVersion.obligations.length }
      );

      if (isNewVersion && versions.length > 0) {
        // Reconcile against current version to flag stale items!
        const comparison = reconcileNewVersion(currentVersion, analyzedVersion);
        setVersions((prev) => [...prev, comparison.newVersion]);
        setCurrentVersionId(comparison.newVersion.id);
        setActiveTab('DIFF');
      } else {
        // Set as v1
        setVersions([analyzedVersion]);
        setCurrentVersionId(analyzedVersion.id);
        setActiveTab('WORKBENCH');
      }
    } catch (err: any) {
      console.error('Contract processing error:', err);
      // Fallback
      const fallback = extractContract(text, fileName, nextVerNum, policy);
      setVersions([fallback]);
      setCurrentVersionId(fallback.id);
      setActiveTab('WORKBENCH');
    } finally {
      setAiAnalyzing({ isAnalyzing: false, message: '' });
    }
  };

  // Ingest organizational policy document
  const handleProcessPolicy = (text: string, fileName: string) => {
    const newPolicy = extractPolicyRules(text, fileName);
    setPolicy(newPolicy);
    // Re-run extraction cross-benchmark on current version
    setVersions((prevVersions) =>
      prevVersions.map((v) => {
        const reExtracted = extractContract(v.rawText, v.fileName, v.versionNumber, newPolicy);
        return {
          ...v,
          conflicts: reExtracted.conflicts,
        };
      })
    );
    setActiveTab('CONFLICTS');
    logStructuredEvent('INFO', 'STORAGE', `Imported organizational procurement policy: ${fileName}`, {
      rulesCount: newPolicy.rules.length,
    });
  };

  // Handle analysis from the initial intake hero screen
  const handleAnalyzeContract = async (
    contractText: string,
    fileName: string,
    benchmarkPolicy?: OrganizationalPolicy
  ) => {
    const activePolicy = benchmarkPolicy || policy;
    if (benchmarkPolicy) {
      setPolicy(benchmarkPolicy);
    }

    setAiAnalyzing({
      isAnalyzing: true,
      message: 'Google Gemini 2.5 Flash analyzing document structure, clauses, and commitments...',
    });

    try {
      const { version: analyzedVersion, provider } = await runAiContractAnalysis(
        contractText,
        fileName,
        1,
        activePolicy
      );

      setVersions([analyzedVersion]);
      setCurrentVersionId(analyzedVersion.id);
      setActiveTab('WORKBENCH');

      await logStructuredEvent(
        'AI_AGENT',
        'GEMINI_AGENT',
        `Intake Hero: Contract analyzed via ${provider}`,
        { fileName, obligations: analyzedVersion.obligations.length, provider }
      );
    } catch (e) {
      console.error('Analysis error:', e);
      const fallback = extractContract(contractText, fileName, 1, activePolicy);
      setVersions([fallback]);
      setCurrentVersionId(fallback.id);
      setActiveTab('WORKBENCH');
    } finally {
      setAiAnalyzing({ isAnalyzing: false, message: '' });
    }
  };

  // Reset all state to return to intake upload portal
  const handleResetAll = () => {
    setVersions([]);
    setCurrentVersionId('');
    setActiveTab('WORKBENCH');
    saveContracts([]);
    logStructuredEvent('INFO', 'STORAGE', 'Cleared all contract versions and reset state');
  };

  // Quick Demo Loaders
  const handleLoadSampleV1 = () => {
    const activePolicy = policy || extractPolicyRules(SAMPLE_POLICY_TEXT, 'Apex_Procurement_Policy_v3.2.txt');
    if (!policy) setPolicy(activePolicy);
    const v1 = extractContract(SAMPLE_CONTRACT_V1_TEXT, 'NexusCloud_Master_SaaS_Agreement_v1.0.txt', 1, activePolicy);
    setVersions([v1]);
    setCurrentVersionId(v1.id);
    setActiveTab('WORKBENCH');
    logStructuredEvent('INFO', 'STORAGE', 'Loaded Sample SaaS Agreement v1.0');
  };

  const handleLoadSamplePolicy = () => {
    handleProcessPolicy(SAMPLE_POLICY_TEXT, 'Apex_Procurement_Policy_v3.2.txt');
  };

  const handleLoadSampleV2 = () => {
    handleProcessContract(SAMPLE_CONTRACT_V2_TEXT, 'NexusCloud_Master_Agreement_Amendment_v2.0.txt', true);
  };

  const staleItemsCount = currentVersion
    ? (currentVersion.obligations || []).filter((o) => o.status === 'STALE').length +
      (currentVersion.renewal?.status === 'STALE' ? 1 : 0)
    : 0;
  const openConflictsCount = currentVersion
    ? (currentVersion.conflicts || []).filter((c) => c.status === 'OPEN').length
    : 0;

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        currentVersion={currentVersion}
        versions={versions}
        policy={policy}
        onSelectVersion={(id) => setCurrentVersionId(id)}
        onOpenUploadContract={() =>
          setUploadModalState({
            isOpen: true,
            mode: versions.length > 0 ? 'CONTRACT_NEW_VERSION' : 'CONTRACT',
          })
        }
        onOpenUploadPolicy={() => setUploadModalState({ isOpen: true, mode: 'POLICY' })}
        onLoadSampleV1={handleLoadSampleV1}
        onLoadSamplePolicy={handleLoadSamplePolicy}
        onLoadSampleV2={handleLoadSampleV2}
        onExportSummary={() => setActiveTab('SUMMARY')}
        onOpenLogs={() => setIsLogsOpen(true)}
        onResetAll={handleResetAll}
      />

      {/* Prominent Legal Disclaimer Banner */}
      <DisclaimerBanner />

      {/* AI Processing Overlay */}
      {aiAnalyzing.isAnalyzing && (
        <div className="ai-loading-overlay">
          <div className="ai-loading-card">
            <Loader2 size={40} className="spinning text-accent" />
            <h3 style={{ margin: '0.8rem 0 0.3rem', fontSize: '1.2rem', color: '#fff' }}>
              Gemini 2.5 Flash AI Agent Active
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, textAlign: 'center' }}>
              {aiAnalyzing.message}
            </p>
            <div className="ai-loading-steps">
              <span>📄 Parsing Text</span>
              <span style={{ color: '#475569' }}>→</span>
              <span className="step-active">🧠 Gemini Extracting Commitments</span>
              <span style={{ color: '#475569' }}>→</span>
              <span>📅 Calculating Deadlines</span>
            </div>
          </div>
        </div>
      )}

      {/* Default Intake Screen vs Output Workbench */}
      {versions.length === 0 || !currentVersion ? (
        <DocumentIntakeHero onAnalyzeContract={handleAnalyzeContract} />
      ) : (
        <>
          {/* KPI Stats Grid */}
          <StatCards 
            version={currentVersion} 
            policy={policy} 
            onOpenSetDates={() => setOperationalDatesModalOpen(true)}
            onOpenEditRenewal={() => setOperationalDatesModalOpen(true)}
          />

          {/* Tabs Navigation Bar */}
          <nav className="tabs-nav-bar" aria-label="Main Navigation">
            <button
              className={`tab-btn ${activeTab === 'WORKBENCH' ? 'active' : ''}`}
              onClick={() => setActiveTab('WORKBENCH')}
            >
              <ListChecks size={16} />
              1. Clauses & Approvals
              {staleItemsCount > 0 && <span className="tab-badge stale">{staleItemsCount} Stale</span>}
            </button>

            <button
              className={`tab-btn ${activeTab === 'TIMELINE' ? 'active' : ''}`}
              onClick={() => setActiveTab('TIMELINE')}
            >
              <CalendarClock size={16} />
              2. Deadlines & Reminders
            </button>

            <button
              className={`tab-btn ${activeTab === 'CONFLICTS' ? 'active' : ''}`}
              onClick={() => setActiveTab('CONFLICTS')}
            >
              <AlertTriangle size={16} />
              3. Ambiguities & Policy Checks
              {openConflictsCount > 0 && <span className="tab-badge warning">{openConflictsCount}</span>}
            </button>

            <button
              className={`tab-btn ${activeTab === 'DIFF' ? 'active' : ''}`}
              onClick={() => setActiveTab('DIFF')}
            >
              <GitCompare size={16} />
              4. Version Diff & Staleness
              {versions.length > 1 && <span className="tab-badge">{versions.length} Versions</span>}
            </button>

            <button
              className={`tab-btn ${activeTab === 'SUMMARY' ? 'active' : ''}`}
              onClick={() => setActiveTab('SUMMARY')}
            >
              <FileText size={16} />
              5. Reviewed Summary & Export
            </button>

            <button
              className={`tab-btn ${activeTab === 'VIEWER' ? 'active' : ''}`}
              onClick={() => setActiveTab('VIEWER')}
            >
              <Eye size={16} />
              6. Raw Document Text
            </button>
          </nav>

          {/* Tab Panels */}
          <main>
            {activeTab === 'WORKBENCH' && (
              <ExtractionWorkbench
                version={currentVersion}
                onUpdatePartyStatus={handleUpdatePartyStatus}
                onUpdateDateStatus={handleUpdateDateStatus}
                onUpdateRenewalStatus={handleUpdateRenewalStatus}
                onUpdateTerminationStatus={handleUpdateTerminationStatus}
                onUpdateNoticeStatus={handleUpdateNoticeStatus}
                onUpdateObligationStatus={handleUpdateObligationStatus}
                onOpenEditModal={(item, type) => setEditModalState({ isOpen: true, item, itemType: type })}
                onApproveAllPending={handleApproveAllPending}
                onOpenSetDates={() => setOperationalDatesModalOpen(true)}
                onOpenAiConsult={(title, quote) =>
                  setAiConsultModal({ isOpen: true, title, clauseText: quote })
                }
              />
            )}

            {activeTab === 'TIMELINE' && (
              <DeadlinesTimeline version={currentVersion} />
            )}

            {activeTab === 'CONFLICTS' && (
              <ConflictsClarifications
                version={currentVersion}
                policy={policy}
                onResolveConflict={handleResolveConflict}
                onDismissConflict={handleDismissConflict}
                onOpenUploadPolicy={() => setUploadModalState({ isOpen: true, mode: 'POLICY' })}
              />
            )}

            {activeTab === 'DIFF' && (
              <VersionDiffView
                versions={versions}
                currentVersion={currentVersion}
                onReApproveItem={handleReApproveFromDiff}
              />
            )}

            {activeTab === 'SUMMARY' && (
              <ReviewedSummaryView version={currentVersion} policy={policy} />
            )}

            {activeTab === 'VIEWER' && (
              <DocumentViewer version={currentVersion} policy={policy} />
            )}
          </main>
        </>
      )}

      {/* Modals & Drawers */}
      <UploadModal
        isOpen={uploadModalState.isOpen}
        mode={uploadModalState.mode}
        onClose={() => setUploadModalState({ ...uploadModalState, isOpen: false })}
        onProcessContract={handleProcessContract}
        onProcessPolicy={handleProcessPolicy}
      />

      <EditItemModal
        isOpen={editModalState.isOpen}
        item={editModalState.item}
        itemType={editModalState.itemType}
        onClose={() => setEditModalState({ ...editModalState, isOpen: false })}
        onSave={handleSaveEditedItem}
      />

      {currentVersion && (
        <OperationalDatesModal
          isOpen={operationalDatesModalOpen}
          version={currentVersion}
          onClose={() => setOperationalDatesModalOpen(false)}
          onSaveDates={handleSaveOperationalDates}
        />
      )}

      <LogsDrawer
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />

      <AiConsultantModal
        isOpen={aiConsultModal.isOpen}
        onClose={() => setAiConsultModal({ ...aiConsultModal, isOpen: false })}
        contextTitle={aiConsultModal.title}
        clauseText={aiConsultModal.clauseText}
      />
    </div>
  );
};

export default App;
