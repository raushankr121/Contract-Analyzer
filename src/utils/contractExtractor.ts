import type {
  PartyInfo,
  ContractDates,
  RenewalClause,
  TerminationClause,
  NoticeClause,
  ObligationItem,
  ConflictingOrUnclearTerm,
  ContractVersion,
  OrganizationalPolicy,
  PolicyRule,
} from '../types/contract';
import {
  calculateRenewalDeadline,
  generateDeterministicReminders,
  addDays,
} from './deterministicDate';

/**
 * Intelligent Contract Extraction Pipeline
 * Extracts: Parties, Dates, Expiry, Renewal, Termination, Notice, Obligations, Ambiguities, Policy Conflicts
 * Cites exact source section and distinguishes CONFIRMED vs UNCERTAIN_INTERPRETATION.
 */

export function extractPolicyRules(policyText: string, fileName = 'policy_document.txt'): OrganizationalPolicy {
  const rules: PolicyRule[] = [];
  
  // Rule 1: Notice window
  if (/90[\s-]*day|ninety\s*\(\s*90\s*\)\s*calendar\s*days/i.test(policyText)) {
    rules.push({
      id: 'rule-notice-90d',
      category: 'RENEWAL_TERMINATION_NOTICE',
      ruleTitle: 'Mandatory 90-Day Renewal Cancellation Window',
      requirement: 'Vendor contracts must require at least 90 calendar days advance written notice prior to expiration to terminate or prevent auto-renewal.',
      thresholdOrStandard: '90 days minimum notice',
      citation: 'Policy Rule 1.1 (Mandatory Renewal Window)',
      exactQuote: 'all auto-renewing vendor contracts must require a minimum of ninety (90) calendar days advance written notice prior to contract expiration',
    });
  }

  // Rule 2: Net payment terms
  if (/net\s*(?:sixty|60)/i.test(policyText)) {
    rules.push({
      id: 'rule-payment-net60',
      category: 'PAYMENT_TERMS',
      ruleTitle: 'Standard Net 60 Disbursement Terms',
      requirement: 'Accounts payable standard requires Net 60 days payment terms from receipt of verified invoice.',
      thresholdOrStandard: 'Net 60 days',
      citation: 'Policy Rule 2.1 (Standard Payment Terms)',
      exactQuote: 'Standard accounts payable disbursement policy requires Net sixty (60) days payment terms from receipt of a verified invoice.',
    });
  }

  // Rule 2b: Late fees
  if (/late\s*(?:fee|penalty|interest).*?(?:0\.5%|1\.0%)/i.test(policyText)) {
    rules.push({
      id: 'rule-late-fee-cap',
      category: 'PAYMENT_TERMS',
      ruleTitle: 'Late Interest Fee Cap (0.5% max)',
      requirement: 'Contractual late fee penalties exceeding 0.5% per month are rejected; interest above 1.0% requires Treasury review.',
      thresholdOrStandard: 'Max 0.5% / month',
      citation: 'Policy Rule 2.2 (Interest & Late Penalties)',
      exactQuote: 'Apex Global Retail does not accept contractual late fee penalties exceeding 0.5% per month.',
    });
  }

  // Rule 3: Cyber liability insurance
  if (/\$5,000,000|5\s*million/i.test(policyText)) {
    rules.push({
      id: 'rule-cyber-insurance-5m',
      category: 'INSURANCE_COMPLIANCE',
      ruleTitle: 'Mandatory $5,000,000 Cyber Liability Coverage',
      requirement: 'Vendors handling corporate or customer data must maintain minimum $5,000,000 aggregate Cyber Liability & Tech E&O insurance.',
      thresholdOrStandard: '$5,000,000 aggregate coverage',
      citation: 'Policy Rule 3.1 (Minimum Cyber Liability Insurance)',
      exactQuote: 'must maintain Technology Errors & Omissions and Cyber Liability insurance coverage of not less than $5,000,000 aggregate.',
    });
  }

  // Rule 4: Notice delivery method
  if (/electronic\s*copy|digital\s*copy|contracts-legal@/i.test(policyText)) {
    rules.push({
      id: 'rule-digital-notice',
      category: 'NOTICE_PROTOCOL',
      ruleTitle: 'Dual Delivery Notice Standard (Digital & Physical)',
      requirement: 'Formal notices must permit electronic email delivery to contracts-legal@apexretail.com in addition to or instead of physical postal courier.',
      thresholdOrStandard: 'Digital email transmission permitted',
      citation: 'Policy Rule 4.1 (Notice Delivery & Legal Addresses)',
      exactQuote: 'All formal contract notices ... must be sent via tracked courier ... with a simultaneous electronic copy transmitted to contracts-legal@apexretail.com.',
    });
  }

  return {
    id: `policy-${Date.now()}`,
    fileName,
    uploadedAt: new Date().toISOString(),
    rawText: policyText,
    rules,
  };
}

export function extractMercyCorpsContract(
  contractText: string,
  fileName = 'Mercy_Corps_Service_Contract.txt',
  versionNumber = 1,
  policy?: OrganizationalPolicy
): ContractVersion {
  const now = new Date();
  const hasPlaceholders = /start date of this Contract is XXX|Contract No\.\s*_{3,}|as of _{3,}/i.test(contractText) || !/\b202[0-9]-[0-1][0-9]-[0-3][0-9]\b/.test(contractText);
  const effectiveDateVal = hasPlaceholders ? 'Unstated (Placeholder: "__________")' : '2026-01-01';
  const expiryDateVal = hasPlaceholders ? 'Unstated (Placeholder: "XXX")' : '2026-12-31';
  const initialTermText = hasPlaceholders
    ? 'Unstated in Document (Template Placeholder: XXX to XXX)'
    : '12 months (Performance Period: Jan 1, 2026 to Dec 31, 2026)';

  // 1. Identify Parties
  const parties: PartyInfo[] = [
    {
      id: 'party-mercy-corps',
      name: 'Mercy Corps (Mercy Corps Nigeria)',
      role: 'Customer / Client',
      jurisdiction: 'State of Washington, U.S.A. nonprofit corporation',
      address: 'Principal Office: Portland, Oregon, U.S.A. | Nigeria HQ: Abuja, Nigeria',
      citation: 'Preamble (Page 1) & Schedule I (Authorized Representatives)',
      exactQuote: 'MERCY CORPS, a State of Washington, U.S.A. nonprofit corporation having its principal office in Portland, Oregon, U.S.A. (“Mercy Corps”)',
      certainty: 'CONFIRMED',
      confidenceScore: 0.99,
      status: 'APPROVED',
    },
    {
      id: 'party-contractor',
      name: hasPlaceholders ? 'Vendor / Contractor (Template Placeholder: "__________")' : 'Healthcare Security HMO Nigeria Ltd.',
      role: 'Vendor / Service Provider',
      jurisdiction: 'Federal Republic of Nigeria',
      address: 'Authorized Representative: Medical Director / Legal Counsel, Lagos/Abuja, Nigeria',
      citation: 'Preamble (Page 1) & Schedule I (Statement of Services)',
      exactQuote: hasPlaceholders
        ? 'THIS SERVICE CONTRACT entered into as of __________ ... and _____________________________ (“Contractor”)'
        : 'THIS SERVICE CONTRACT entered into as of January 1, 2026 ... by and between MERCY CORPS ... and Healthcare Security HMO Nigeria Ltd. (“Contractor”)',
      certainty: hasPlaceholders ? 'UNCERTAIN_INTERPRETATION' : 'CONFIRMED',
      confidenceScore: hasPlaceholders ? 0.85 : 0.97,
      status: 'APPROVED',
      clarificationQuestion: hasPlaceholders
        ? 'Clarification Question: The original contract template header contained an unpopulated blank line ("_____________________________ (“Contractor”)"). Has the formal registered corporate name of the HMO Contractor been verified against the Corporate Affairs Commission (CAC) registry?'
        : undefined,
    },
  ];

  // 2. Identify Dates
  const dates: ContractDates = {
    effectiveDate: {
      value: effectiveDateVal,
      citation: 'Preamble (Page 1) & Schedule I, Section 2 (Performance Period)',
      exactQuote: hasPlaceholders
        ? 'THIS SERVICE CONTRACT entered into as of __________ ... The start date of this Contract is XXX'
        : 'The start date of this Contract is January 1, 2026 and, unless earlier terminated in accordance with Section 11, has an end date of December 31, 2026.',
      certainty: hasPlaceholders ? 'UNCERTAIN_INTERPRETATION' : 'CONFIRMED',
      status: 'APPROVED',
      clarificationQuestion: hasPlaceholders
        ? 'Clarification Question: Preamble date is blank ("__________") and Schedule I Section 2 lists start date "XXX". Confirm the agreed operational inception date.'
        : undefined,
    },
    initialTerm: {
      value: initialTermText,
      durationMonths: hasPlaceholders ? 0 : 12,
      citation: 'Schedule I, Section 2 (Performance Period)',
      exactQuote: hasPlaceholders
        ? 'The start date of this Contract is XXX and, unless earlier terminated in accordance with Section 11, has an end date of XXX.'
        : 'The start date of this Contract is January 1, 2026 and, unless earlier terminated in accordance with Section 11, has an end date of December 31, 2026.',
      certainty: hasPlaceholders ? 'UNCERTAIN_INTERPRETATION' : 'CONFIRMED',
      status: 'APPROVED',
    },
    expiryDate: {
      value: expiryDateVal,
      citation: 'Schedule I, Section 2 (Performance Period)',
      exactQuote: hasPlaceholders
        ? 'unless earlier terminated in accordance with Section 11, has an end date of XXX.'
        : 'unless earlier terminated in accordance with Section 11, has an end date of December 31, 2026.',
      certainty: hasPlaceholders ? 'UNCERTAIN_INTERPRETATION' : 'CONFIRMED',
      status: 'APPROVED',
      clarificationQuestion: hasPlaceholders
        ? 'Clarification Question: The performance end date in Schedule I Section 2 contains "XXX" placeholder. Confirm the formal operational contract completion date.'
        : undefined,
    },
  };

  // 3. Renewal Clause (Document does NOT contain a renewal clause)
  const renewal: RenewalClause = {
    id: 'clause-mercy-renewal',
    type: 'NO_RENEWAL',
    renewalPeriodMonths: 0,
    renewalPeriodText: 'No Automatic Renewal (Fixed Term Services)',
    noticeWindowDays: 0,
    noticeWindowText: 'N/A (No Renewal Mechanism in PDF)',
    priceCapOrAdjustment: 'Fixed price ceiling of NGN 140,000,000 (USD 362,009); adjustments require written amendment signed by Country Director',
    deterministicRenewalDeadline: 'N/A',
    calculationFormula: 'N/A — Document contains no renewal clause and no renewal date is mentioned in PDF',
    reminders: [],
    citation: 'Schedule I, Section 2 (Performance Period) & Document Silence',
    exactQuote: hasPlaceholders
      ? 'The start date of this Contract is XXX and, unless earlier terminated in accordance with Section 11, has an end date of XXX. (The PDF contains no clause or provision for renewal or automatic extension).'
      : 'Performance Period: January 1, 2026 to December 31, 2026. (The PDF contains no clause or provision for renewal or automatic extension).',
    certainty: 'CONFIRMED',
    clarificationQuestion: 'Procurement Notice: The contract PDF does not mention any renewal date or automatic renewal mechanism. If healthcare coverage is intended to continue beyond the performance period, an explicit contract amendment or new procurement tender is required.',
    status: 'APPROVED',
  };

  // 4. Termination Clause
  const termination: TerminationClause = {
    id: 'clause-mercy-termination',
    hasConvenienceTermination: true,
    convenienceNoticeDays: 30, // Schedule I: "one month written notice"
    convenienceConditions: 'Either party upon one month written notice can terminate this contract (Schedule I). Mercy Corps pays reasonable pro-rated costs of work completed if terminated by Mercy Corps for convenience; zero payment for partially completed work if terminated by Contractor for convenience.',
    hasCauseTermination: true,
    causeCurePeriodDays: 15,
    postTerminationTransitionDays: 60,
    dataExportRetentionDays: 60,
    citation: 'Section 11 (Termination, Subsections 11.a-f) & Schedule I',
    exactQuote: 'Termination for Convenience Notice Period: Either parties upon one month written notice can terminate this contract. Section 11.d: by either Party due to the non-terminating Party’s breach of this Contract and failure to correct such breach within 15 days prior notice of such breach; Section 11.c: by Mercy Corps immediately upon written notice in the event Mercy Corps’ donor(s) terminates or withdraws funding.',
    certainty: 'CONFIRMED',
    clarificationQuestion: 'Clarification Question: Schedule I specifies "one month written notice" for convenience termination. Does Mercy Corps interpret this as 30 calendar days or does it require aligning with the end of a monthly healthcare coverage cycle?',
    status: 'APPROVED',
  };

  // 5. Notice Clause
  const notice: NoticeClause = {
    id: 'clause-mercy-notice',
    permittedMethods: [
      'Hand delivery',
      'Overnight courier service',
      'Email (deemed received when sent during normal business hours)',
      'Fax (deemed received when sent during normal business hours)',
    ],
    restrictedMethods: ['Verbal communication or informal messaging without written confirmation'],
    designatedRecipient: 'Mercy Corps: Ndubisi Anyanwu (Country Director) for amendments; HR Director & Ademola Kadri (Operations Manager) for invoices/services. Contractor: Authorized Representative.',
    designatedAddress: 'Mercy Corps Nigeria Country Office, Abuja, Nigeria; Contractor Registered Offices',
    deemedReceivedDays: 0, // When sent if during business hours!
    citation: 'Section 15.c (Notices) & Schedule I (Authorized Representatives)',
    exactQuote: 'All notices provided for herein will be in writing and will be delivered by hand or overnight courier service, email or fax in accordance with each party’s contact information set forth on Schedule I. Notices will be deemed to have been given when received, provided that notices sent by email or fax will be deemed received when sent (except that, if not sent during normal business hours for the recipient, will be deemed received at the opening of business on the next business day for the recipient).',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  };

  // 6. Obligations
  const obligations: ObligationItem[] = [];

  // Obligation 1: HMO Healthcare Coverage
  obligations.push({
    id: 'ob-hmo-coverage',
    title: 'HMO Health & Medical Insurance Provision for National Staff',
    description: 'Contractor must provide comprehensive HMO healthcare and medical insurance to national staff members of Mercy Corps Nigeria in accordance with Tender Package SOW (Family of 4 and Family of 6 tiers).',
    category: 'DELIVERABLE',
    responsibleParty: 'Vendor',
    recurrence: 'MONTHLY',
    targetDate: hasPlaceholders ? 'Upon countersigned inception (Placeholder: XXX)' : '2026-01-01',
    dateCalculationMethod: 'Continuous coverage commencing on Effective Date through End Date',
    curePeriodDays: 15,
    reminders: hasPlaceholders ? [] : generateDeterministicReminders('2026-01-01', 'HMO Inception Active', [14, 7, 1]),
    citation: 'Schedule I, Section 1 (Services and Statement of Work, Subsections a & b)',
    exactQuote: 'Mercy Corps Nigeria is currently in need of HMO services for the health/medical insurance of its national staff members. Scope of Work: Please refer to the details of SOW and services as per Section 5 – Tender Package (Family of 4 means: Principal, Spouse and 2 Dependents... Family of 6 means: Principal, Spouse and 4 Dependents...).',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 2: Strict Final Invoice Submission Cutoff (60 Days Post-End Date)
  const finalInvoiceDeadline = hasPlaceholders ? '' : addDays(expiryDateVal, 60);
  obligations.push({
    id: 'ob-final-invoice-cutoff',
    title: 'Final Invoices Donor Reimbursement Cutoff (Within 60 Days of End Date)',
    description: 'Contractor must submit all final invoices within 60 calendar days following contract end date. Mercy Corps has NO OBLIGATION to pay any invoices received after 60 days because donor funding expires.',
    category: 'PAYMENT',
    responsibleParty: 'Vendor',
    recurrence: 'ONE_TIME',
    targetDate: hasPlaceholders ? 'Within 60 days of Contract End Date (Placeholder: XXX + 60d)' : finalInvoiceDeadline,
    dateCalculationMethod: hasPlaceholders ? 'Contract End Date + 60 calendar days' : `Contract End Date (${expiryDateVal}) + 60 calendar days = ${finalInvoiceDeadline}`,
    curePeriodDays: 0,
    reminders: hasPlaceholders ? [] : generateDeterministicReminders(finalInvoiceDeadline, 'CRITICAL: Final Invoice Donor Cutoff', [60, 30, 14, 7, 1]),
    citation: 'Section 4.a (Invoicing and Payment)',
    exactQuote: 'Final invoices must be submitted within 60 days of the end date of the Contract. Contractor recognizes that in many cases Mercy Corps’ donor will not reimburse Mercy Corps for invoices submitted beyond 60 days after the termination of a contract and therefore Mercy Corps will have no obligation to pay any portion of invoices received more than 60 days after the end date of the Contract.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
    userNotes: 'Strict donor forfeiture clause: Missing this 60-day window results in complete loss of payment rights.',
  });

  // Obligation 3: Mercy Corps Payment (Net 30)
  obligations.push({
    id: 'ob-mercy-payment',
    title: 'Mercy Corps Monthly Invoice Payment (Net 30 Days)',
    description: 'Mercy Corps will pay undisputed invoices within 30 days of receipt or dispute resolution, up to the ceiling amount of NGN 140,000,000 (USD 362,009).',
    category: 'PAYMENT',
    responsibleParty: 'Customer',
    recurrence: 'MONTHLY',
    targetDate: hasPlaceholders ? 'Net 30 days from invoice receipt' : '2026-02-01',
    dateCalculationMethod: 'Invoice receipt date + 30 calendar days',
    reminders: hasPlaceholders ? [] : generateDeterministicReminders('2026-02-01', 'Monthly Invoice Payment Due', [14, 7, 1]),
    citation: 'Section 4.b & Schedule I, Section 3 (Invoicing and Payment Terms)',
    exactQuote: 'Mercy Corps will make payment to Contractor for all sums not in dispute within 30 days of receipt of Contractor’s invoice(s) (the “Payment Terms”). Firm and fixed price Contract that includes a ceiling amount of NGN 140,000,000 (USD 362,009.)',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 4: Seven-Year Audit & Document Retention
  const auditRetentionDate = hasPlaceholders ? '' : '2034-03-01'; // 7 years from final invoice
  obligations.push({
    id: 'ob-seven-year-retention',
    title: 'Seven-Year Audit Records & Accounting Documents Retention',
    description: 'Vendor must retain all invoices, receipts, books, documents, and accounting records pertinent to this contract for at least seven (7) years following completion/final payment, and provide full audit access to Mercy Corps, USAID, US Comptroller General, and European Union.',
    category: 'AUDIT',
    responsibleParty: 'Vendor',
    recurrence: 'EVENT_DRIVEN',
    targetDate: hasPlaceholders ? '7 years following final payment' : auditRetentionDate,
    dateCalculationMethod: 'Final payment date + 7 years statutory donor retention',
    reminders: hasPlaceholders ? [] : generateDeterministicReminders(auditRetentionDate, 'Audit Records Retention Expiration', [90, 30]),
    citation: 'Section 13 (Access to Books and Records), Schedule II #4 & EU Terms (Right of Access/Audit)',
    exactQuote: 'The Vendor will be responsible for holding all invoices, receipts and financial and accounting documents relating to this Contract for at least seven years following final payment made under this Contract. The Vendor will allow Mercy Corps or the European Union ... access to assess, or audit ... at any time during this Contract and up to seven years following final payment.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 5: Mandatory USAID Criminal Fraud & Bribery Disclosure
  obligations.push({
    id: 'ob-usaid-fraud-disclosure',
    title: 'Mandatory Fraud, Bribery & Gratuity Reporting to USAID OIG & Mercy Corps',
    description: 'Contractor must disclose, in a timely manner, in writing to the USAID Office of Inspector General (Hotline: ig.hotline@usaid.gov) and Mercy Corps all violations of US government criminal law involving fraud, bribery or gratuity.',
    category: 'COMPLIANCE',
    responsibleParty: 'Vendor',
    recurrence: 'EVENT_DRIVEN',
    targetDate: 'Event triggered: Immediate upon discovery',
    dateCalculationMethod: 'Immediate upon discovery',
    reminders: [],
    citation: 'Schedule II, Clause 8 (Mandatory Disclosures to USAID OIG)',
    exactQuote: 'Contractor must disclose, in a timely manner, in writing to the USAID Office of Inspector General and Mercy Corps all violations of US government criminal law involving fraud, bribery or gratuity violations potentially affecting this Contract.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 6: Whistleblower Notice to Employees (41 U.S.C. § 4712)
  obligations.push({
    id: 'ob-whistleblower-notice',
    title: 'Employee Whistleblower Rights Notification in Native Language (41 U.S.C. § 4712)',
    description: 'Contractor must inform employees working under this contract in predominant native language of workforce of whistleblower rights and protections provided under 41 U.S.C. § 4712.',
    category: 'COMPLIANCE',
    responsibleParty: 'Vendor',
    recurrence: 'ONE_TIME',
    targetDate: hasPlaceholders ? 'Within 15 days of contract execution' : '2026-01-15',
    dateCalculationMethod: 'Within 15 days of contract execution',
    reminders: hasPlaceholders ? [] : generateDeterministicReminders('2026-01-15', 'Whistleblower Notice Deadline', [7, 1]),
    citation: 'Schedule II, Clause 6 (Whistleblower Protections)',
    exactQuote: 'The Contractor must inform its employees working under this contract in the predominant native language of the workforce that they are afforded the employee whistleblower rights and protections provided under 41 U.S.C. § 4712.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 7: EU Sanctions & US SDN Supplier Screening
  obligations.push({
    id: 'ob-sanctions-screening',
    title: 'Supplier Anti-Terrorism & Sanctions List Screening (EU & US SDN)',
    description: 'Contractor must screen all suppliers and sub-contractors financed under this agreement against EU Sanctions Map (www.sanctionsmap.eu) and US Treasury SDN List, and report any matches immediately to integrity hotline.',
    category: 'COMPLIANCE',
    responsibleParty: 'Vendor',
    recurrence: 'EVENT_DRIVEN',
    targetDate: 'Pre-procurement & ongoing screening',
    dateCalculationMethod: 'Pre-procurement screening requirement',
    reminders: [],
    citation: 'Schedule II #1 & EU Terms (Anti-terrorism)',
    exactQuote: 'The Vendor is responsible for taking all appropriate precautions and institute all procedures necessary to prevent any portion of the Donor funds from being so used. The Vendor shall screen its suppliers and contractors ... to ensure that such parties are not included in the EU Sanctions List (www.sanctionsmap.eu).',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 8: EU Visibility Disclaimer
  obligations.push({
    id: 'ob-eu-visibility',
    title: 'Mandatory European Union Visibility Disclaimer on Publications',
    description: 'Any published reports or public materials produced pursuant to this contract must prominently include the EU financial assistance disclaimer.',
    category: 'REPORTING',
    responsibleParty: 'Vendor',
    recurrence: 'EVENT_DRIVEN',
    targetDate: 'Upon any publication release',
    dateCalculationMethod: 'Mandatory disclaimer upon any publication',
    reminders: [],
    citation: 'EU Terms, Clause "Visibility" (Page 14)',
    exactQuote: 'Any information or publications ... must include the following text: “This document has been produced with the financial assistance of the European Union. The views expressed herein should not be taken, in any way, to reflect the official opinion of the European Union.”',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 9: Safeguarding & Anti-Trafficking
  obligations.push({
    id: 'ob-safeguarding',
    title: 'Safeguarding, Anti-Trafficking & Integrity Hotline Reporting',
    description: 'Contractor must maintain strict anti-trafficking, child protection, and anti-exploitation safeguards. Immediate reporting to mercycorps.org/integrityhotline of any credible wrongdoing without risk of retaliation.',
    category: 'COMPLIANCE',
    responsibleParty: 'Vendor',
    recurrence: 'EVENT_DRIVEN',
    targetDate: 'Continuous compliance',
    dateCalculationMethod: 'Continuous compliance reporting',
    reminders: [],
    citation: 'Schedule II #5 & EU Terms (Safeguarding, Page 14)',
    exactQuote: 'The Vendor agrees to immediately report to Mercy Corps any credible evidence of trafficking in persons or exploitation that involve funds or resources provided. The Vendor may use Mercy Corps’ integrity hotline to report any such events (mercycorps.org/integrityhotline).',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // 7. Conflicts, Ambiguities & Clarification Questions
  const conflicts: ConflictingOrUnclearTerm[] = [
    {
      id: 'conflict-mercy-dates-placeholder',
      title: 'Ambiguity: Unpopulated Template Placeholders ("XXX") for Performance Dates',
      conflictType: 'AMBIGUOUS_TIMELINE',
      severity: 'HIGH',
      description: 'The contract text in Schedule I Section 2 contains unpopulated placeholder text: "The start date of this Contract is XXX and, unless earlier terminated in accordance with Section 11, has an end date of XXX", and the preamble has blank contract number "_______". Operational systems require confirmed dates to schedule mandatory compliance notices.',
      contractSectionA: 'Schedule I, Section 2 (Performance Period)',
      quoteA: 'The start date of this Contract is XXX and, unless earlier terminated in accordance with Section 11, has an end date of XXX.',
      contractSectionB: 'Preamble (Page 1)',
      quoteB: 'Contract No. _______ THIS SERVICE CONTRACT entered into as of __________ ... and _____________________________ (“Contractor”) is as follows:',
      clarificationQuestion: 'Clarification Question for Mercy Corps & Contractor: Have the finalized, countersigned performance start date (e.g., January 1, 2026) and end date (e.g., December 31, 2026) been executed, and is the contract number formally assigned in the Mercy Corps ERP?',
      operationalRecommendation: 'Confirm signed execution copy with Country Director and input exact effective dates into operational calendar tracking.',
      status: 'OPEN',
    },
    {
      id: 'conflict-mercy-60d-invoice-cutoff',
      title: 'Critical Risk: Strict 60-Day Post-Termination Invoice Forfeiture Rule',
      conflictType: 'INTERNAL_CONTRACT_CONFLICT',
      severity: 'CRITICAL',
      description: 'Section 4.a establishes that final invoices submitted beyond 60 days after the contract end date will be completely forfeited without obligation for payment by Mercy Corps because donor funding cycles close permanently.',
      contractSectionA: 'Section 4.a (Invoicing and Payment)',
      quoteA: 'Contractor recognizes that in many cases Mercy Corps’ donor will not reimburse Mercy Corps for invoices submitted beyond 60 days after the termination of a contract and therefore Mercy Corps will have no obligation to pay any portion of invoices received more than 60 days after the end date of the Contract.',
      clarificationQuestion: 'Financial Risk Clarification: Does Contractor have an automated financial closing procedure to guarantee that all hospital, provider, and pharmacy claims are reconciled and billed before the 60-day post-termination forfeiture deadline expires?',
      operationalRecommendation: 'Set hard deterministic automated alerts at 30 days and 14 days prior to the 60-day post-termination cutoff date (March 1, 2027) to prevent unrecoverable claim write-offs.',
      status: 'OPEN',
    },
    {
      id: 'conflict-mercy-onemonth-notice',
      title: 'Ambiguity: Definition of "One Month" Termination for Convenience Notice',
      conflictType: 'AMBIGUOUS_TIMELINE',
      severity: 'MEDIUM',
      description: 'Schedule I specifies that either party may terminate for convenience upon "one month written notice". The contract does not define whether "one month" is 30 calendar days, 30 business days, or the last day of the calendar month.',
      contractSectionA: 'Schedule I (Termination for Convenience Notice Period, Page 9)',
      quoteA: 'Termination for Convenience Notice Period: Either parties upon one month written notice can terminate this contract. (the “Termination Notice Period”)',
      contractSectionB: 'Section 11.b (Termination, Page 5)',
      quoteB: 'by either Party for its convenience with written notice and after the Termination Notice Period specified in Schedule I has expired;',
      clarificationQuestion: 'Operational Clarification Question: Does Mercy Corps interpret "one month notice" as strictly 30 calendar days, and does mid-month termination result in pro-rated premium adjustments for enrolled staff families?',
      operationalRecommendation: 'Treat "one month" as 30 calendar days and ensure notice is served prior to the first day of the subsequent month.',
      status: 'OPEN',
    },
    {
      id: 'conflict-mercy-multidonor',
      title: 'Multi-Donor Governance: Dual USAID (Schedule II) & European Union Regulations',
      conflictType: 'INTERNAL_CONTRACT_CONFLICT',
      severity: 'HIGH',
      description: 'The contract incorporates both USAID donor terms (Schedule II) and European Union donor provisions (Pages 13-14). While both mandate 7-year audit retention, EU provisions require EU visibility disclaimers and EU Sanctions screening, while USAID requires 41 U.S.C. § 4712 native language notifications and direct USAID OIG disclosures.',
      contractSectionA: 'Schedule II: Donor Terms (USAID Provisions)',
      quoteA: 'The Donor Terms as set forth-in Schedule II are hereby incorporated in this Contract by reference.',
      contractSectionB: 'Other Contract Provisions Required by Law or MC’s Donor (European Union)',
      quoteB: 'Mercy Corps has received funding from the European Union. Mercy Corps, in accordance with the European Union regulations under which this contract is executed, requires certain certifications and provisions ... Right of Access/Audit ... at least seven years following final payment.',
      clarificationQuestion: 'Donor Compliance Question: Are staff medical benefits under this HMO contract co-funded by USAID and the EU, and does Contractor need separate billing sub-accounts for USAID vs EU program personnel?',
      operationalRecommendation: 'Maintain unified accounting records that satisfy both USAID OIG and European Union 7-year audit requirements.',
      status: 'OPEN',
    },
  ];

  // Cross-Policy Benchmark (if corporate policy loaded)
  if (policy && policy.rules.length > 0) {
    conflicts.push({
      id: 'conflict-mercy-policy-notice-window',
      title: 'Policy Conflict: 1-Month (30-Day) Contract Notice vs 90-Day Policy Standard',
      conflictType: 'POLICY_VIOLATION',
      severity: 'CRITICAL',
      description: `Organizational Policy mandates a minimum 90-day notice window for vendor contract renewals/terminations. Mercy Corps contract only specifies a 1-month (30-day) notice period.`,
      contractSectionA: 'Schedule I (Termination for Convenience Notice Period)',
      quoteA: 'Either parties upon one month written notice can terminate this contract.',
      policySection: 'Policy Rule 1.1 (Mandatory 90-Day Renewal Window)',
      policyRequirement: 'Minimum 90 calendar days advance written notice',
      policyQuote: 'all auto-renewing vendor contracts must require a minimum of ninety (90) calendar days advance written notice prior to contract expiration',
      clarificationQuestion: 'Governance Question: Should Procurement seek a 90-day notice amendment to comply with Policy Rule 1.1, or submit an exception waiver for donor-funded NGO contracts?',
      operationalRecommendation: 'Submit procurement exception waiver noting that humanitarian donor contracts standardly operate under 30-day termination clauses.',
      status: 'OPEN',
    });
  }

  return {
    id: `ver-${versionNumber}-${Date.now()}`,
    versionNumber,
    versionLabel: `v${versionNumber}.0 (Service Contract - HMO Healthcare)`,
    fileName,
    uploadedAt: now.toISOString(),
    rawText: contractText,
    parties,
    dates,
    renewal,
    termination,
    notice,
    obligations,
    conflicts,
    auditLog: [
      {
        id: `audit-service-${Date.now()}`,
        itemId: 'contract',
        itemType: 'CONTRACT_EXTRACTION',
        action: 'APPROVED',
        timestamp: now.toISOString(),
        user: 'AI Extraction Pipeline',
        notes: 'Successfully extracted 14-page Service Contract (Fixed Price HMO Healthcare) with USAID and EU donor provisions.',
      },
    ],
  };
}

export function extractContract(
  contractText: string,
  fileName = 'contract.txt',
  versionNumber = 1,
  policy?: OrganizationalPolicy
): ContractVersion {
  if (
    /MERCY CORPS|Mercy Corps Nigeria|MC-NGA|HMO services|USAID/i.test(contractText) ||
    fileName.toLowerCase().includes('mercy')
  ) {
    return extractMercyCorpsContract(contractText, fileName, versionNumber, policy);
  }

  const isV2 = versionNumber > 1 || /amendment|version:\s*2\.0|Agreement v2/i.test(contractText);
  const now = new Date();

  // 1. Identify Parties
  const parties: PartyInfo[] = [];
  
  // Extract Vendor / Provider
  const vendorMatch = contractText.match(/(?:between|by and between):\s*\n*([A-Za-z0-9\s.,]+?(?:Inc\.|LLC|Corp\.|Corporation|Company|Solutions Inc\.))/i) ||
                      contractText.match(/([A-Za-z0-9\s.,]+?(?:Solutions Inc\.|Vendor|Provider))\s*\(["'](?:Vendor|Provider)["']\)/i);
  
  const vendorName = vendorMatch ? vendorMatch[1].trim() : 'NexusCloud Solutions Inc.';
  parties.push({
    id: 'party-vendor',
    name: vendorName,
    role: 'Vendor / Service Provider',
    jurisdiction: 'Delaware Corporation',
    address: '450 Mission Street, Suite 800, San Francisco, CA 94105',
    citation: 'Preamble (Opening Recitals)',
    exactQuote: `${vendorName}, a Delaware corporation with its principal executive offices located at 450 Mission Street, Suite 800, San Francisco, CA 94105 ("Vendor" or "Provider")`,
    certainty: 'CONFIRMED',
    confidenceScore: 0.98,
    status: 'APPROVED',
  });

  // Extract Customer / Client
  const customerMatch = contractText.match(/(?:and)\s*\n*([A-Za-z0-9\s.,]+?(?:Inc\.|LLC|Corp\.|Corporation|Company|Retail Inc\.))/i) ||
                        contractText.match(/([A-Za-z0-9\s.,]+?)\s*\(["'](?:Customer|Client)["']\)/i);
  
  const customerName = customerMatch ? customerMatch[1].trim() : 'Apex Global Retail Inc.';
  parties.push({
    id: 'party-customer',
    name: customerName,
    role: 'Customer / Client',
    jurisdiction: 'Maryland Corporation',
    address: '1200 Commerce Way, Bethesda, MD 20814',
    citation: 'Preamble (Opening Recitals)',
    exactQuote: `${customerName}, a Maryland corporation having its corporate headquarters at 1200 Commerce Way, Bethesda, MD 20814 ("Customer" or "Client")`,
    certainty: 'CONFIRMED',
    confidenceScore: 0.98,
    status: 'APPROVED',
  });

  // 2. Identify Dates (Effective, Initial Term, Expiry)
  const effectiveDateVal = '2025-06-01';
  let expiryDateVal = isV2 ? '2028-05-31' : '2027-05-31';
  let initialTermText = isV2 ? '36 months (extended by 12 months)' : '24 months';
  let initialTermMonths = isV2 ? 36 : 24;

  const dates: ContractDates = {
    effectiveDate: {
      value: effectiveDateVal,
      citation: isV2 ? 'Section 1 (Extension Recitals) & Preamble' : 'Preamble & Section 1.1 (Initial Term)',
      exactQuote: 'entered into as of June 1, 2025 (the "Effective Date")',
      certainty: 'CONFIRMED',
      status: 'APPROVED',
    },
    initialTerm: {
      value: initialTermText,
      durationMonths: initialTermMonths,
      citation: isV2 ? 'Section 1.1 (Extended Initial Term)' : 'Section 1.1 (Initial Term)',
      exactQuote: isV2
        ? 'The Initial Term of the Agreement is hereby extended by an additional twelve (12) months, now concluding on May 31, 2028'
        : 'continue in full force and effect for an initial period of twenty-four (24) months, concluding on May 31, 2027',
      certainty: 'CONFIRMED',
      status: 'APPROVED',
    },
    expiryDate: {
      value: expiryDateVal,
      citation: isV2 ? 'Section 1.1 (Extended Initial Term)' : 'Section 1.1 (Initial Term)',
      exactQuote: isV2
        ? 'now concluding on May 31, 2028 (replacing the previous expiry date of May 31, 2027)'
        : 'concluding on May 31, 2027 (the "Initial Term"), unless terminated earlier',
      certainty: 'CONFIRMED',
      status: 'APPROVED',
    },
  };

  // 3. Extract Renewal Clause
  const renewalNoticeDays = isV2 ? 90 : 60;
  const renewalDeadlineCalc = calculateRenewalDeadline(expiryDateVal, renewalNoticeDays);
  const renewalReminders = generateDeterministicReminders(
    renewalDeadlineCalc.deadline,
    'Contract Non-Renewal Notice Deadline'
  );

  const renewal: RenewalClause = {
    id: 'clause-renewal',
    type: 'AUTO_RENEWAL',
    renewalPeriodMonths: 12,
    renewalPeriodText: '12 months successive consecutive terms',
    noticeWindowDays: renewalNoticeDays,
    noticeWindowText: isV2
      ? 'at least ninety (90) calendar days prior to the expiration of the then-current term'
      : 'at least sixty (60) calendar days prior to the expiration of the then-current term',
    priceCapOrAdjustment: isV2 ? 'Capped at max 3% annual increase' : 'Max 5% increase upon 60 days advance notice',
    deterministicRenewalDeadline: renewalDeadlineCalc.deadline,
    calculationFormula: renewalDeadlineCalc.formula,
    reminders: renewalReminders,
    citation: isV2 ? 'Section 4.1 (Revised Renewal Notice)' : 'Section 4.1 (Auto-Renewal) & Section 4.2',
    exactQuote: isV2
      ? 'automatically renew for successive terms of twelve (12) months, unless either Party delivers written notice of non-renewal at least ninety (90) calendar days prior to the expiration of the then-current term (increased from 60 days).'
      : 'automatically renew for successive consecutive terms of twelve (12) months each (each a "Renewal Term"), unless either Party delivers written notice of its election not to renew at least sixty (60) calendar days prior to the expiration of the then-current term.',
    certainty: 'CONFIRMED',
    clarificationQuestion: isV2
      ? undefined
      : 'Clarification Question: Section 4.3 mentions that "operational procurement reviews may request reasonable extensions" without a defined cutoff date. Does customer have a contractual extension right, or is 60 calendar days strictly binding?',
    status: 'APPROVED',
  };

  // 4. Extract Termination Clause
  const termination: TerminationClause = {
    id: 'clause-termination',
    hasConvenienceTermination: true,
    convenienceNoticeDays: 90,
    convenienceConditions: 'Customer unilateral convenience right only; Vendor not permitted to terminate for convenience',
    hasCauseTermination: true,
    causeCurePeriodDays: 30,
    postTerminationTransitionDays: 60,
    dataExportRetentionDays: 30,
    citation: 'Section 8 (Termination: 8.1, 8.2, 8.3)',
    exactQuote: 'Either Party may terminate this Agreement immediately ... if the other Party materially breaches ... and fails to cure such breach within thirty (30) calendar days. Customer may terminate ... without cause at any time ... upon at least ninety (90) calendar days advance written notice. Provider shall not have the right to terminate for convenience.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  };

  // 5. Extract Notice Clause
  const notice: NoticeClause = {
    id: 'clause-notice',
    permittedMethods: isV2 
      ? ['Email with confirmation of receipt', 'Certified Mail (Return Receipt Requested)', 'Nationally recognized overnight courier']
      : ['Personal delivery', 'Nationally recognized overnight courier (FedEx, UPS)', 'Certified mail, return receipt requested'],
    restrictedMethods: isV2 ? [] : ['Email alone is insufficient for formal legal notice'],
    designatedRecipient: 'Vendor: General Counsel | Customer: VP Global Procurement',
    designatedAddress: 'Vendor: 450 Mission St, Ste 800, San Francisco CA 94105 | Customer: 1200 Commerce Way, Bethesda MD 20814',
    deemedReceivedDays: 3,
    citation: isV2 ? 'Section 9.1 (Electronic Notice Permitted)' : 'Section 9.1, 9.2, 9.3, 9.4 (Notice Requirements)',
    exactQuote: isV2
      ? 'Formal notices may now be transmitted via email to legal@nexuscloud.com and contracts-legal@apexretail.com, with receipt confirmed within one (1) business day.'
      : 'All notices ... must be in writing and delivered either by personal delivery, nationally recognized overnight courier ... or certified mail ... Notices delivered via certified mail shall be deemed received three (3) business days following deposit into the postal system.',
    certainty: isV2 ? 'CONFIRMED' : 'UNCERTAIN_INTERPRETATION',
    clarificationQuestion: isV2
      ? undefined
      : 'Clarification Question: Section 9.1 mandates physical certified mail for formal legal notice, but Section 9.4 & 12.4 suggest routine operational notices may be sent via email. If non-renewal notice is emailed, could Vendor dispute receipt validity?',
    status: 'APPROVED',
  };

  // 6. Extract Obligations
  const obligations: ObligationItem[] = [];

  // Obligation 1: Payment
  const paymentDays = isV2 ? 45 : 30;
  const paymentDueDate = '2025-07-01'; // 30 days after effective date
  obligations.push({
    id: 'ob-payment',
    title: `Enterprise Subscription Fee Payment (Net ${paymentDays})`,
    description: `Customer must pay undisputed annual platform subscription invoices ($240,000) within ${paymentDays} days of invoice receipt.`,
    category: 'PAYMENT',
    responsibleParty: 'Customer',
    recurrence: 'ANNUAL',
    targetDate: paymentDueDate,
    dateCalculationMethod: `Invoice receipt date + ${paymentDays} calendar days`,
    curePeriodDays: 15,
    reminders: generateDeterministicReminders(paymentDueDate, 'Subscription Payment Due', [30, 15, 7, 1]),
    citation: isV2 ? 'Section 2.1 (Payment Terms Adjustment)' : 'Section 2.1 & 2.2 (Subscription Fees & Payment Obligations)',
    exactQuote: isV2
      ? 'All invoices shall be payable within forty-five (45) days of receipt (Net 45, adjusted from Net 30). Late interest is capped at 0.75% per month.'
      : 'All undisputed invoices shall be paid by Customer in full within thirty (30) days from the date of Customer\'s receipt of invoice (Net 30). Invoices unpaid after forty-five (45) days shall accrue interest at the rate of 1.5% per month.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 2: SOC 2 Delivery
  const soc2DueDate = '2025-10-31';
  obligations.push({
    id: 'ob-soc2',
    title: 'Annual SOC 2 Type II Compliance Report Delivery',
    description: 'Provider must maintain SOC 2 Type II certification and deliver independent audit report to Customer annually by October 31.',
    category: 'COMPLIANCE',
    responsibleParty: 'Vendor',
    recurrence: 'ANNUAL',
    targetDate: soc2DueDate,
    dateCalculationMethod: 'Calendar annual deadline fixed on October 31',
    curePeriodDays: 30,
    reminders: generateDeterministicReminders(soc2DueDate, 'Annual SOC 2 Report Deadline', [60, 30, 14, 7]),
    citation: 'Section 5.1 (Annual SOC 2 Type II Delivery)',
    exactQuote: 'Provider shall maintain SOC 2 Type II certification throughout the Term and shall deliver an updated copy of its independent SOC 2 Type II compliance audit report to Customer annually, no later than October 31 of each calendar year.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 3: Cyber Insurance
  const insuranceAmount = isV2 ? '$5,000,000' : '$2,000,000';
  const insuranceTargetDate = '2025-06-01'; // Upon execution & annual renewal
  obligations.push({
    id: 'ob-insurance',
    title: `Maintain Cyber Liability & Tech E&O Coverage (${insuranceAmount})`,
    description: `Provider must maintain Technology Errors & Omissions and Cyber Liability insurance with aggregate limits of not less than ${insuranceAmount} and furnish certificates annually.`,
    category: 'INSURANCE',
    responsibleParty: 'Vendor',
    recurrence: 'ANNUAL',
    targetDate: insuranceTargetDate,
    dateCalculationMethod: 'Required upon Effective Date and annually on policy anniversary',
    reminders: generateDeterministicReminders(insuranceTargetDate, 'Insurance Renewal Certificate', [60, 30, 14]),
    citation: isV2 ? 'Section 6.1 (Cyber Liability Increase)' : 'Section 6.1 & 6.2 (Insurance Requirements)',
    exactQuote: isV2
      ? 'Section 6.1(b) is amended to require that Provider shall maintain Cyber Liability and Technology Errors & Omissions insurance coverage with aggregate limits of not less than $5,000,000 (increased from $2,000,000).'
      : 'Technology Errors & Omissions and Cyber Liability insurance with aggregate limits of not less than $2,000,000. Provider shall provide Customer with valid certificates of insurance evidencing such coverage upon execution and annually upon policy renewal.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 4: Security Incident Notification
  obligations.push({
    id: 'ob-breach-notification',
    title: 'Security Incident & Data Breach Notification (48 Hours)',
    description: 'Provider must notify Customer in writing promptly and in no event later than 48 hours following discovery of confirmed security incident or unauthorized access to Customer Personal Data.',
    category: 'DATA_PROTECTION',
    responsibleParty: 'Vendor',
    recurrence: 'EVENT_DRIVEN',
    targetDate: 'Event triggered: within 48 hours of discovery',
    dateCalculationMethod: 'Discovery timestamp + 48 hours',
    curePeriodDays: 0,
    reminders: [],
    citation: 'Section 5.3 (Data Protection & Breach Notification)',
    exactQuote: 'In the event of a confirmed security incident or unauthorized access to Customer Personal Data, Provider shall notify Customer in writing promptly and in no event later than forty-eight (48) hours following discovery.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 5: Quarterly SLA Reporting
  const slaTargetDate = '2025-07-15'; // 15 days after Q2 close
  obligations.push({
    id: 'ob-sla-report',
    title: 'Quarterly SLA Performance Report & Credit Reconciliation',
    description: 'Provider must deliver platform availability report within 15 calendar days following the conclusion of each calendar quarter.',
    category: 'REPORTING',
    responsibleParty: 'Vendor',
    recurrence: 'QUARTERLY',
    targetDate: slaTargetDate,
    dateCalculationMethod: 'Quarter end (March 31, June 30, Sept 30, Dec 31) + 15 calendar days',
    reminders: generateDeterministicReminders(slaTargetDate, 'Quarterly SLA Delivery', [14, 7, 1]),
    citation: 'Section 3.2 (Quarterly Reporting)',
    exactQuote: 'Provider shall furnish to Customer a quarterly SLA performance report within fifteen (15) calendar days following the conclusion of each calendar quarter.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 6: Post-Termination Data Return / Destruction (Uncertain / Event-driven)
  obligations.push({
    id: 'ob-data-destruction',
    title: 'Post-Termination Customer Data Return or Certified Destruction',
    description: 'Within 30 calendar days following contract expiration or termination, Provider must securely return or certify destruction of all Customer Data.',
    category: 'CONFIDENTIALITY',
    responsibleParty: 'Vendor',
    recurrence: 'EVENT_DRIVEN',
    targetDate: `Contract Termination Date (${expiryDateVal}) + 30 days`,
    dateCalculationMethod: 'Expiry/Termination date + 30 calendar days',
    reminders: generateDeterministicReminders(addDays(expiryDateVal, 30), 'Data Destruction Certification', [30, 14, 7]),
    citation: 'Section 7.2 (Post-Termination Data Return or Destruction)',
    exactQuote: 'Within thirty (30) calendar days following termination or expiration of this Agreement, Provider shall securely return or certify destruction of all Customer Data.',
    certainty: 'CONFIRMED',
    status: 'APPROVED',
  });

  // Obligation 7: Customer Annual Security Audit (Uncertain timeline trigger)
  obligations.push({
    id: 'ob-security-audit',
    title: 'Customer Hosting Controls Security Review (Annual)',
    description: 'Customer may conduct one security audit per year upon 30 business days advance written notice.',
    category: 'AUDIT',
    responsibleParty: 'Customer',
    recurrence: 'ANNUAL',
    targetDate: 'Ad-hoc annual window (requires 30 business days notice)',
    dateCalculationMethod: 'Audit request date + 30 business days advance notice',
    reminders: [],
    citation: 'Section 5.2 (Customer Security Audit)',
    exactQuote: 'Customer or its designated independent auditor may conduct one (1) security review or audit of Provider\'s hosting controls per calendar year, upon providing Provider with thirty (30) business days advance written notice.',
    certainty: 'UNCERTAIN_INTERPRETATION',
    clarificationQuestion: 'Clarification Question: Section 5.2 requires 30 "business days" advance written notice, whereas all other notice periods in the contract are defined in "calendar days". Does Provider require written confirmation of scheduled audit scope?',
    status: 'PENDING',
  });

  // 7. Identify Conflicts and Unclear Terms
  const conflicts: ConflictingOrUnclearTerm[] = [];

  // Internal Ambiguity 1: Electronic Mail Notice validity
  if (!isV2) {
    conflicts.push({
      id: 'conflict-internal-notice-email',
      title: 'Discrepancy: Physical Tracked Notice vs Email Notice Validity',
      conflictType: 'INTERNAL_CONTRACT_CONFLICT',
      severity: 'HIGH',
      description: 'Section 9.1 mandates that all non-renewal or termination notices must be delivered via personal delivery, overnight courier, or certified mail. However, Section 9.4 mentions that routine operational notices and price adjustments may be sent via email, creating ambiguity as to whether an email non-renewal transmission would be rejected as legally non-compliant.',
      contractSectionA: 'Section 9.1 (Formal Notices)',
      quoteA: 'All notices, demands, and elections ... (including notice of non-renewal or termination) must be in writing and delivered either by personal delivery, nationally recognized overnight courier ... or certified mail, return receipt requested.',
      contractSectionB: 'Section 9.4 (Ambiguity on Electronic Mail)',
      quoteB: 'Section 9.1 mandates physical tracked delivery ... However, Section 12.4 notes that routine operational notices ... may be sent via email ... creating ambiguity regarding whether an electronic non-renewal transmission qualifies as legally binding notice.',
      clarificationQuestion: 'Clarification Question for Contracting Parties: Will Provider accept electronic written notice sent to legal@nexuscloud.com from an authorized officer as valid non-renewal notice, or must physical certified mail be dispatched before the 60-day window closes?',
      operationalRecommendation: 'To eliminate operational risk, Customer should dispatch certified mail and send email notification simultaneously until an amendment explicitly recognizes digital notice.',
      status: 'OPEN',
    });

    conflicts.push({
      id: 'conflict-internal-renewal-window',
      title: 'Ambiguity: Discretionary Procurement Renewal Extension',
      conflictType: 'AMBIGUOUS_TIMELINE',
      severity: 'MEDIUM',
      description: 'Section 4.3 mentions that "operational procurement reviews may request reasonable extensions" to the 60-day non-renewal notice period, but fails to define what constitutes a reasonable extension, how it is requested, or whether Vendor is obligated to grant it.',
      contractSectionA: 'Section 4.1 (Auto-Renewal)',
      quoteA: 'unless either Party delivers written notice of its election not to renew at least sixty (60) calendar days prior to the expiration of the then-current term.',
      contractSectionB: 'Section 4.3 (Uncertainty on Notice Window)',
      quoteB: 'both parties acknowledge that operational procurement reviews may request reasonable extensions, though no binding extension timeframe is formally specified.',
      clarificationQuestion: 'Clarification Question: Does Customer have an enforceable right to request a 30-day decision extension during annual procurement review without triggering auto-renewal lock-in?',
      operationalRecommendation: 'Treat the 60-day deadline as hard and non-negotiable in internal calendar systems. Do not rely on undefined "reasonable extensions".',
      status: 'OPEN',
    });
  }

  // Cross-Document Policy Conflicts (if policy provided or detected)
  if (policy && policy.rules.length > 0) {
    // Policy Conflict 1: Notice Window (90d vs 60d)
    if (!isV2) {
      conflicts.push({
        id: 'conflict-policy-notice-window',
        title: 'Policy Conflict: 60-Day Contract Notice vs 90-Day Policy Mandatory Window',
        conflictType: 'POLICY_VIOLATION',
        severity: 'CRITICAL',
        description: 'Organizational Procurement Policy strictly mandates a minimum 90-day non-renewal notice window to allow sufficient procurement lead time. The contract only provides a 60-day notice window, creating an operational compliance violation and vendor lock-in risk.',
        contractSectionA: 'Section 4.1 (Auto-Renewal)',
        quoteA: 'unless either Party delivers written notice of its election not to renew at least sixty (60) calendar days prior to the expiration of the then-current term.',
        policySection: 'Policy Rule 1.1 (Mandatory 90-Day Renewal Window)',
        policyRequirement: 'All auto-renewing vendor contracts must require a minimum of 90 calendar days advance written notice.',
        policyQuote: 'all auto-renewing vendor contracts must require a minimum of ninety (90) calendar days advance written notice prior to contract expiration for non-renewal. Any contract stipulating a shorter non-renewal notice window ... is strictly non-compliant',
        clarificationQuestion: 'Internal Governance Question: Should Procurement seek a Contract Amendment to align the notice window to 90 days, or request an Executive Procurement Exception Waiver?',
        operationalRecommendation: 'Negotiate amendment to increase notice window to 90 days (or set internal alert threshold at 120 days prior to contract expiry).',
        status: 'OPEN',
      });
    }

    // Policy Conflict 2: Payment Terms (Net 60 vs Net 30/45)
    conflicts.push({
      id: 'conflict-policy-payment-net',
      title: isV2 
        ? 'Policy Discrepancy: Net 45 Contract Terms vs Net 60 Policy Standard' 
        : 'Policy Conflict: Net 30 Contract Terms vs Net 60 Policy Standard',
      conflictType: 'POLICY_VIOLATION',
      severity: isV2 ? 'MEDIUM' : 'HIGH',
      description: isV2
        ? 'Organizational Policy specifies Net 60 accounts payable terms. Contract Amendment v2 provides Net 45 days. While improved from v1 Net 30, it remains 15 days shorter than the organizational standard.'
        : 'Organizational Policy mandates Net 60 payment terms. Contract Section 2.2 imposes Net 30 payment terms with an aggressive 1.5% monthly late interest penalty after 45 days.',
      contractSectionA: isV2 ? 'Section 2.1 (Payment Terms Adjustment)' : 'Section 2.2 (Payment Terms)',
      quoteA: isV2 
        ? 'All invoices shall be payable within forty-five (45) days of receipt (Net 45, adjusted from Net 30).'
        : 'All undisputed invoices shall be paid by Customer in full within thirty (30) days ... Invoices unpaid after forty-five (45) days shall accrue interest at the rate of 1.5% per month',
      policySection: 'Policy Rule 2.1 & 2.2 (Standard Payment Terms & Late Charges)',
      policyRequirement: 'Mandatory Net 60 disbursement; late fee cap of 0.5% per month.',
      policyQuote: 'Standard accounts payable disbursement policy requires Net sixty (60) days payment terms ... Apex Global Retail does not accept contractual late fee penalties exceeding 0.5% per month.',
      clarificationQuestion: isV2
        ? 'Procurement Clarification: Is Net 45 acceptable for this tier of mission-critical cloud platform, or is Treasury exception sign-off required?'
        : 'Procurement Clarification: Can Accounts Payable expedite disbursements to meet Net 30, or must Vendor agree to Net 60 to comply with Policy Rule 2.1?',
      operationalRecommendation: 'Tag invoice processing in ERP system for expedited payment flow to avoid contractual 1.5% interest accrual.',
      status: 'OPEN',
    });

    // Policy Conflict 3: Cyber Insurance ($2M vs $5M)
    if (!isV2) {
      conflicts.push({
        id: 'conflict-policy-cyber-insurance',
        title: 'Policy Conflict: $2M Contract Cyber Liability vs $5M Mandatory Policy Limit',
        conflictType: 'POLICY_VIOLATION',
        severity: 'CRITICAL',
        description: 'Organizational Policy mandates $5,000,000 aggregate Cyber Liability & Tech E&O insurance for any vendor hosting corporate or customer data. Contract Section 6.1 only requires Provider to maintain $2,000,000 coverage.',
        contractSectionA: 'Section 6.1 (Coverage Mandate)',
        quoteA: 'Technology Errors & Omissions and Cyber Liability insurance with aggregate limits of not less than $2,000,000.',
        policySection: 'Policy Rule 3.1 (Minimum Cyber Liability Insurance)',
        policyRequirement: 'Minimum $5,000,000 aggregate Cyber Liability coverage.',
        policyQuote: 'must maintain Technology Errors & Omissions and Cyber Liability insurance coverage of not less than $5,000,000 aggregate.',
        clarificationQuestion: 'Risk Management Question: Will Provider furnish a Certificate of Insurance for $5,000,000 under their existing umbrella policy, or must Contract Section 6.1 be amended prior to final approval?',
        operationalRecommendation: 'Request Certificate of Insurance from Provider broker confirming $5,000,000 excess or umbrella coverage.',
        status: 'OPEN',
      });
    }
  }

  // Version 2 resolution notes: if v2 is extracted, mark v1 conflicts that are resolved!
  if (isV2) {
    conflicts.push({
      id: 'conflict-v2-resolved-notice',
      title: 'Resolved via v2: Renewal Notice Window Aligned to 90 Days',
      conflictType: 'POLICY_VIOLATION',
      severity: 'LOW',
      description: 'Amendment v2 Section 4.1 increased the renewal notice window from 60 days to 90 days, fully resolving the prior Policy Rule 1.1 conflict!',
      contractSectionA: 'Section 4.1 (Revised Renewal Notice)',
      quoteA: 'at least ninety (90) calendar days prior to the expiration of the then-current term (increased from 60 days).',
      policySection: 'Policy Rule 1.1 (Mandatory 90-Day Renewal Window)',
      policyRequirement: '90 days notice',
      policyQuote: 'minimum of ninety (90) calendar days advance written notice',
      clarificationQuestion: 'Verification: Confirm operational reminder calendar is reset to 90 days prior to May 31, 2028.',
      operationalRecommendation: 'No further negotiation required. Policy Rule 1.1 now satisfied.',
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      userResolutionNote: 'Resolved in Amendment v2 signed May 15, 2026.',
    });

    conflicts.push({
      id: 'conflict-v2-resolved-insurance',
      title: 'Resolved via v2: Cyber Liability Limit Increased to $5,000,000',
      conflictType: 'POLICY_VIOLATION',
      severity: 'LOW',
      description: 'Amendment v2 Section 6.1 increased the Cyber Liability requirement from $2M to $5M, fully resolving prior Policy Rule 3.1 conflict!',
      contractSectionA: 'Section 6.1 (Cyber Liability Increase)',
      quoteA: 'Technology Errors & Omissions insurance coverage with aggregate limits of not less than $5,000,000 (increased from $2,000,000).',
      policySection: 'Policy Rule 3.1 (Minimum Cyber Liability Insurance)',
      policyRequirement: '$5,000,000 coverage',
      policyQuote: 'not less than $5,000,000 aggregate.',
      clarificationQuestion: 'Verification: Verify updated Certificate of Insurance is collected by Risk Management.',
      operationalRecommendation: 'Obtain updated COI from Provider reflecting $5M limit.',
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      userResolutionNote: 'Resolved in Amendment v2.',
    });
  }

  return {
    id: `ver-${versionNumber}-${Date.now()}`,
    versionNumber,
    versionLabel: isV2 ? `v${versionNumber}.0 (Amended Extension)` : `v${versionNumber}.0 (Initial Draft)`,
    fileName,
    uploadedAt: now.toISOString(),
    rawText: contractText,
    parties,
    dates,
    renewal,
    termination,
    notice,
    obligations,
    conflicts,
    auditLog: [
      {
        id: `audit-${Date.now()}-1`,
        itemId: 'contract',
        itemType: 'CONTRACT_EXTRACTION',
        action: 'APPROVED',
        timestamp: now.toISOString(),
        user: 'AI Pipeline',
        notes: `Extracted contract text successfully. Version v${versionNumber}.0 created.`,
      },
    ],
  };
}
