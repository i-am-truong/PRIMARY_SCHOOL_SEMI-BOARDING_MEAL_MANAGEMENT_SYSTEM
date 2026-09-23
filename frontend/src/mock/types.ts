/**
 * Data models and interfaces for Semi-Boarding Meal Management System
 * Based on OpenAPI 3.0 and DBML specs in /docs
 */

export interface Student {
  id: string;
  code: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  grade: number;
  className: string;
  allergies: string[];
  dietaryNote?: string;
  isRegisteredBoarding: boolean;
  status: 'EATING' | 'ABSENT_EXCUSED' | 'ABSENT_UNEXCUSED';
  absenceReason?: string;
}

export interface ClassRoster {
  className: string;
  grade: number;
  teacherName: string;
  room: string;
  totalStudents: number;
  registeredBoarding: number;
  isLocked: boolean;
  lockedAt?: string;
  students: Student[];
}

export interface Dish {
  id: string;
  name: string;
  category: 'MAIN' | 'SOUP' | 'SIDE' | 'DESSERT';
  targetTemp: number; // in Celsius e.g. 65°C
  allergens: string[];
  unit: string;
}

export interface ElectronicPODispatchReceipt {
  orderCode: string;
  vendorTrackingRef: string;
  dispatchedAt: string;
  apiStatus: number;
  apiEndpoint: string;
  emailTo: string;
  emailSubject: string;
  emailHtmlPreview?: string;
  targetDeliveryTime: string;
}

export interface MealDemand {
  date: string;
  session: 'LUNCH';
  cutoffTime: string;
  isCutoffLocked: boolean;
  totalPresentStudents: number;
  staffPortions: number;
  bufferPercentage: number; // e.g. 3% (0 - 10%)
  calculatedBufferPortions: number;
  totalOrderedPortions: number;
  specialDietPortions: number;
  status: 'DRAFT' | 'ORDER_SENT' | 'DELIVERY_RECEIVED' | 'RECONCILED';
  poDispatchReceipt?: ElectronicPODispatchReceipt;
  cateringVendor: {
    id: string;
    name: string;
    contactPhone: string;
    contractPricePerMeal: number; // e.g. 35000 VND
  };
  dishes: {
    dish: Dish;
    requiredQty: number;
  }[];
}

export interface InspectionRecord {
  id: string;
  inspectionTime: string;
  inspectorName: string;
  sealIntact: boolean;
  temperatureProbeCelsius: number; // >= 65 is pass
  sensoryColorSmellTastePassed: boolean;
  sampleRetained24h: boolean;
  deliveredContainersCount: number;
  expectedContainersCount: number;
  overallPassed: boolean;
  notes: string;
}

export interface TrayDistribution {
  className: string;
  trolleyId: string;
  allocatedTrays: number;
  specialAllergyTrays: number;
  dispatchedTime: string;
  receivedBy: string;
  status: 'PENDING' | 'DISPATCHED' | 'CONFIRMED';
}

export interface ReconciliationReport {
  date: string;
  totalOrdered: number;
  totalDelivered: number;
  totalConsumed: number;
  bufferUsed: number;
  surplusDeficit: number;
  reasons: string[];
  accountantNotified: boolean;
}
