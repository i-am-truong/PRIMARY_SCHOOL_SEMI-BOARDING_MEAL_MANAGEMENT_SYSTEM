import { NotFoundException } from '@nestjs/common';
import { EligibilityService } from './eligibility.service';
import { EligibilityRepository } from '../repositories/eligibility.repository';
import { MealEligibilityCriteria, StudentEligibilityRecord } from '../entities/eligibility.entity';

describe('EligibilityService (Domain 1 - F-PAR-01) - Unit Tests', () => {
  let eligibilityRepository: EligibilityRepository;
  let eligibilityService: EligibilityService;

  beforeEach(() => {
    // Isolated repository for each test
    eligibilityRepository = new EligibilityRepository();
    eligibilityService = new EligibilityService(eligibilityRepository);
  });

  describe('Criteria Configuration & Inspection', () => {
    it('returns default active statutory criteria for current academic year', () => {
      // Act
      const criteria = eligibilityService.getCriteria();

      // Assert
      expect(criteria).toBeDefined();
      expect(criteria.schoolYear).toBe('2026-2027');
      expect(criteria.minGrade).toBe(1);
      expect(criteria.maxGrade).toBe(5);
      expect(criteria.requiresHealthClearance).toBe(true);
      expect(criteria.requiresActiveEnrollment).toBe(true);
      expect(criteria.requiresSevereAllergySafe).toBe(true);
      expect(criteria.isActive).toBe(true);
    });

    it('updates criteria configuration when valid fields are provided', () => {
      // Arrange
      const updatePayload = {
        name: 'Tiêu chuẩn Bán trú Cập nhật 2026',
        minGrade: 1,
        maxGrade: 4,
        requiresHealthClearance: false,
        requiresActiveEnrollment: true,
        requiresSevereAllergySafe: true,
      };

      // Act
      const updated = eligibilityService.updateCriteria(updatePayload);

      // Assert
      expect(updated.name).toBe('Tiêu chuẩn Bán trú Cập nhật 2026');
      expect(updated.maxGrade).toBe(4);
      expect(updated.requiresHealthClearance).toBe(false);

      // Verify persisted in repository
      const refetched = eligibilityService.getCriteria();
      expect(refetched.maxGrade).toBe(4);
      expect(refetched.requiresHealthClearance).toBe(false);
    });
  });

  describe('List Students & Summary Statistics', () => {
    it('returns all student records with computed summary rates', () => {
      // Act
      const result = eligibilityService.listStudents();

      // Assert: Initial seed contains 10 students (7 ELIGIBLE, 3 INELIGIBLE)
      expect(result.records.length).toBe(10);
      expect(result.summary.total).toBe(10);
      expect(result.summary.eligible).toBe(7);
      expect(result.summary.ineligible).toBe(3);
      expect(result.summary.pendingReview).toBe(0);
      expect(result.summary.eligibleRatePct).toBe(70);
    });

    it('filters student records by specific classroom', () => {
      // Act: Filter only class 1A (5 seeded students in class 1A)
      const result = eligibilityService.listStudents({ className: '1A' });

      // Assert
      expect(result.records.length).toBe(5);
      expect(result.records.every((r) => r.className === '1A')).toBe(true);
      expect(result.summary.total).toBe(5);
    });

    it('filters student records by status ELIGIBLE', () => {
      // Act
      const result = eligibilityService.listStudents({ status: 'ELIGIBLE' });

      // Assert
      expect(result.records.length).toBe(7);
      expect(result.records.every((r) => r.status === 'ELIGIBLE')).toBe(true);
      expect(result.summary.eligible).toBe(7);
    });

    it('filters student records by status INELIGIBLE', () => {
      // Act
      const result = eligibilityService.listStudents({ status: 'INELIGIBLE' });

      // Assert
      expect(result.records.length).toBe(3);
      expect(result.records.every((r) => r.status === 'INELIGIBLE')).toBe(true);
      expect(result.summary.ineligible).toBe(3);
    });
  });

  describe('Automated Batch Evaluation Engine (4 Core Criteria)', () => {
    it('marks a student ELIGIBLE when all 4 core criteria are satisfied', () => {
      // Arrange: Seed clean student meeting all criteria
      const testStudent: StudentEligibilityRecord = {
        id: 'elig-test-pass',
        studentId: 'hs-test-01',
        studentCode: 'HS-T01',
        fullName: 'Nguyễn Văn Chuẩn',
        className: '3A',
        grade: 3,
        allergies: [],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: false,
        status: 'PENDING_REVIEW',
        criteriaBreakdown: {
          gradeCheck: { passed: false, message: '' },
          healthClearanceCheck: { passed: false, message: '' },
          activeEnrollmentCheck: { passed: false, message: '' },
          allergySafetyCheck: { passed: false, message: '' },
        },
        ineligibilityReasons: [],
        isManualOverride: false,
      };
      eligibilityRepository.saveRecord(testStudent);

      // Act
      const batchResult = eligibilityService.runBatchEvaluation('3A');
      const evaluated = batchResult.updatedRecords.find((r) => r.studentId === 'hs-test-01');

      // Assert
      expect(evaluated).toBeDefined();
      expect(evaluated!.status).toBe('ELIGIBLE');
      expect(evaluated!.criteriaBreakdown.gradeCheck.passed).toBe(true);
      expect(evaluated!.criteriaBreakdown.healthClearanceCheck.passed).toBe(true);
      expect(evaluated!.criteriaBreakdown.activeEnrollmentCheck.passed).toBe(true);
      expect(evaluated!.criteriaBreakdown.allergySafetyCheck.passed).toBe(true);
      expect(evaluated!.ineligibilityReasons.length).toBe(0);
    });

    it('marks a student INELIGIBLE when missing health clearance documentation', () => {
      // Act: Class 1A has HS-00105 who lacks health clearance
      const batchResult = eligibilityService.runBatchEvaluation('1A');
      const studentWithoutHealth = batchResult.updatedRecords.find((r) => r.studentCode === 'HS-00105');

      // Assert
      expect(studentWithoutHealth).toBeDefined();
      expect(studentWithoutHealth!.status).toBe('INELIGIBLE');
      expect(studentWithoutHealth!.hasHealthClearance).toBe(false);
      expect(studentWithoutHealth!.criteriaBreakdown.healthClearanceCheck.passed).toBe(false);
      expect(studentWithoutHealth!.ineligibilityReasons).toContain(
        'Chưa có phiếu khám sức khỏe hoặc cam kết y tế',
      );
    });

    it('marks a student INELIGIBLE when an unaddressed severe allergy warning exists', () => {
      // Act: Class 1A has HS-00109 with severe anaphylaxis warning
      const batchResult = eligibilityService.runBatchEvaluation('1A');
      const severeAllergyStudent = batchResult.updatedRecords.find((r) => r.studentCode === 'HS-00109');

      // Assert
      expect(severeAllergyStudent).toBeDefined();
      expect(severeAllergyStudent!.status).toBe('INELIGIBLE');
      expect(severeAllergyStudent!.hasSevereAllergyWarning).toBe(true);
      expect(severeAllergyStudent!.criteriaBreakdown.allergySafetyCheck.passed).toBe(false);
      expect(severeAllergyStudent!.ineligibilityReasons).toContain(
        'Phát hiện nguy cơ dị ứng nặng chưa hoàn tất cam kết',
      );
    });

    it('marks a student INELIGIBLE when enrollment status is inactive or suspended', () => {
      // Act: Class 2A has HS-00201 with isActive: false
      const batchResult = eligibilityService.runBatchEvaluation('2A');
      const inactiveStudent = batchResult.updatedRecords.find((r) => r.studentCode === 'HS-00201');

      // Assert
      expect(inactiveStudent).toBeDefined();
      expect(inactiveStudent!.status).toBe('INELIGIBLE');
      expect(inactiveStudent!.isActive).toBe(false);
      expect(inactiveStudent!.criteriaBreakdown.activeEnrollmentCheck.passed).toBe(false);
      expect(inactiveStudent!.ineligibilityReasons).toContain(
        'Hồ sơ tạm hoãn hoặc chưa kích hoạt',
      );
    });

    it('marks a student INELIGIBLE when grade falls outside allowed range', () => {
      // Arrange: Student in Grade 6 (Middle School)
      const outOfGradeStudent: StudentEligibilityRecord = {
        id: 'elig-test-grade6',
        studentId: 'hs-test-06',
        studentCode: 'HS-T06',
        fullName: 'Trần Văn Lớp 6',
        className: '6A',
        grade: 6,
        allergies: [],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: false,
        status: 'PENDING_REVIEW',
        criteriaBreakdown: {
          gradeCheck: { passed: false, message: '' },
          healthClearanceCheck: { passed: false, message: '' },
          activeEnrollmentCheck: { passed: false, message: '' },
          allergySafetyCheck: { passed: false, message: '' },
        },
        ineligibilityReasons: [],
        isManualOverride: false,
      };
      eligibilityRepository.saveRecord(outOfGradeStudent);

      // Act
      const batchResult = eligibilityService.runBatchEvaluation('6A');
      const evaluated = batchResult.updatedRecords.find((r) => r.studentId === 'hs-test-06');

      // Assert
      expect(evaluated).toBeDefined();
      expect(evaluated!.status).toBe('INELIGIBLE');
      expect(evaluated!.criteriaBreakdown.gradeCheck.passed).toBe(false);
      expect(evaluated!.ineligibilityReasons).toContain('Khối 6 nằm ngoài phạm vi cho phép');
    });
  });

  describe('Manual Override Capability', () => {
    it('allows coordinator to manually override status to ELIGIBLE with required audit justification', () => {
      // Arrange: Target student currently INELIGIBLE (HS-00105 missing health clearance)
      const studentId = 'hs-1054';
      const initialRecord = eligibilityRepository.getRecordByStudentId(studentId);
      expect(initialRecord?.status).toBe('INELIGIBLE');

      const overridePayload = {
        studentId,
        status: 'ELIGIBLE' as const,
        reason: 'Phụ huynh đã nộp cam kết bổ sung giấy khám sức khỏe vào thứ Hai',
      };
      const reviewer = 'Cô Nguyễn Thị Lan (Điều Phối Viên MGR)';

      // Act
      const overridden = eligibilityService.manualOverride(overridePayload, reviewer);

      // Assert
      expect(overridden.status).toBe('ELIGIBLE');
      expect(overridden.isManualOverride).toBe(true);
      expect(overridden.overrideReason).toBe('Phụ huynh đã nộp cam kết bổ sung giấy khám sức khỏe vào thứ Hai');
      expect(overridden.verifiedBy).toBe(reviewer);
      expect(overridden.verifiedAt).toBeDefined();

      // Verify persistence in repository
      const stored = eligibilityRepository.getRecordByStudentId(studentId);
      expect(stored?.status).toBe('ELIGIBLE');
      expect(stored?.isManualOverride).toBe(true);
    });

    it('throws NotFoundException when overriding a non-existent student', () => {
      // Arrange
      const nonExistentPayload = {
        studentId: 'hs-non-existent-9999',
        status: 'ELIGIBLE' as const,
        reason: 'Học sinh không tồn tại',
      };

      // Act & Assert
      expect(() => eligibilityService.manualOverride(nonExistentPayload)).toThrow(NotFoundException);
    });
  });
});
