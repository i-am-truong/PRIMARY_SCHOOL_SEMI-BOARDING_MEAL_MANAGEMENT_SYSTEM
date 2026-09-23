export type EligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING_REVIEW';

export interface MealEligibilityCriteria {
  id: number;
  schoolYear: string;
  name: string;
  minGrade: number;
  maxGrade: number;
  requiresHealthClearance: boolean;
  requiresActiveEnrollment: boolean;
  requiresSevereAllergySafe: boolean;
  isActive: boolean;
  description: string;
}

export interface StudentEvaluationCriteriaBreakdown {
  gradeCheck: { passed: boolean; message: string };
  healthClearanceCheck: { passed: boolean; message: string };
  activeEnrollmentCheck: { passed: boolean; message: string };
  allergySafetyCheck: { passed: boolean; message: string };
}

export interface StudentEligibilityRecord {
  id: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  className: string;
  grade: number;
  allergies: string[];
  hasHealthClearance: boolean;
  isActive: boolean;
  hasSevereAllergyWarning: boolean;
  status: EligibilityStatus;
  criteriaBreakdown: StudentEvaluationCriteriaBreakdown;
  ineligibilityReasons: string[];
  isManualOverride: boolean;
  overrideReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}
