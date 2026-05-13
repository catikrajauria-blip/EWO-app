export type UserRole = 'production' | 'maintenance' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isApproved: boolean;
  createdAt: any;
}

export type EWOStatus = 'open' | 'acknowledged' | 'resolved' | 'closed' | 'reopened';

export interface WhyWhyAnalysis {
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
}

export interface EWO {
  id: string;
  line: string;
  opNo: string;
  shift: 'A' | 'B' | 'C';
  problemDescription: string;
  imageUrl?: string;
  status: EWOStatus;
  startTime: any;
  acknowledgeTime?: any;
  resolvedTime?: any;
  closedTime?: any;
  maintenanceUser?: string;
  maintenanceUserName?: string;
  actionTaken?: string;
  sparePartsUsed?: string;
  whyWhy?: WhyWhyAnalysis;
  countermeasure?: string;
  targetDate?: string;
  createdBy: string;
  createdByName: string;
  totalLossMinutes?: number;
}

export interface SparePart {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  isCritical: boolean;
  updatedAt: any;
}
