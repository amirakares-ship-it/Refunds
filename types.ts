export type RefundType = 'default' | 'Request';

export type RefundStatus = 
  | 'Cancelled' 
  | 'Cheque pending' 
  | 'Retained' 
  | 'Pending' 
  | 'Sent to company' 
  | 'Sent to finance' 
  | string;

export interface RefundRecord {
  no: number;
  company: string; // Ollin, Premium, Aman, Contact
  clientName: string;
  nationalId: string;
  membershipId: string;
  customerId: string;
  acceptanceDate: string; // YYYY-MM-DD
  acceptanceYear: number;
  amount: number;
  type: RefundType;
  requestDate: string; // YYYY-MM-DD
  requestMonth: string; // YYYY-MM
  sendDate: string;
  csFeedback: string;
  feedbackCategory: string;
  reachable: boolean;
  csDate: string;
  action: string;
  actionDate: string;
  status: RefundStatus;
  isCancellationOutcome: boolean;
  cancellationDate: string;
  reactive: boolean;
  days: number;
  willPay?: string;
  reminderFromCom?: string;
  year?: number;
  refundYear?: number;
}

export interface MonthlyFinancedFund {
  company: string;
  month: string; // e.g. "2025-01" or "Jan"
  financedAmount: number;
}

export interface DashboardFilters {
  company: string; // "ALL" or specific company
  requestMonth: string; // "ALL" or YYYY-MM / Month name
  type: string; // "ALL", "default", "Request"
  status: string; // "ALL", "Cancelled & Cheque Pending", "Cancelled", "Cheque pending", etc.
  acceptanceYear: string; // "ALL" or year string
}

export interface ManualInputs {
  manualTotalCancellationCount: number | null; // Null means auto-calculate
  financedFunds: Record<string, Record<string, number>>; // company -> month -> amount
}

export interface ChartModalState {
  isOpen: boolean;
  title: string;
  chartId: string;
  description?: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  description: string;
  visible: boolean;
  dataType: 'ALL' | 'default' | 'Request' | 'Cancelled' | 'Retained';
  metricType: 'amount' | 'count';
  chartType: 'donut' | 'pie' | 'funnel' | 'bar' | 'timeline' | 'waterfall' | 'table';
  gridSpan: 'half' | 'full';
  companyFilter?: string; // ALL or specific company
}

export interface KpiCardConfig {
  id: string;
  title: string;
  badgeText: string;
  visible: boolean;
}

export interface DashboardCustomization {
  theme: 'slate-dark' | 'zinc-dark' | 'obsidian' | 'navy-midnight' | 'clean-light' | 'soft-warm';
  isLightMode?: boolean; // Toggle for light mode
  accentColor: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan';
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  headerTitle: string;
  headerSubtitle: string;
  
  // Customizable Typography & Colors
  headerTitleColor?: string;
  headerSubtitleColor?: string;
  headerTitleSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  
  kpiTitleColor?: string;
  kpiValueColor?: string;
  kpiValueSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  
  chartTitleColor?: string;
  chartTitleSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  bodyTextColor?: string;

  kpiConfigs: Record<string, KpiCardConfig>;
  chartConfigs: ChartConfig[];
  textOverrides: Record<string, string>;
}
