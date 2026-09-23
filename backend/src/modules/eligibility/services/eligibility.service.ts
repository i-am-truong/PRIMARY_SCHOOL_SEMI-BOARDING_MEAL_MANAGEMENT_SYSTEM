import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EligibilityRepository } from '../repositories/eligibility.repository';
import {
  MealEligibilityCriteria,
  StudentEligibilityRecord,
  StudentEvaluationCriteriaBreakdown,
} from '../entities/eligibility.entity';
import { ManualOverrideDto, UpdateCriteriaDto } from '../dto/eligibility.dto';

@Injectable()
export class EligibilityService {
  private readonly logger = new Logger(EligibilityService.name);

  constructor(private readonly eligibilityRepository: EligibilityRepository) {}

  public getCriteria(): MealEligibilityCriteria {
    return this.eligibilityRepository.getCriteria();
  }

  public updateCriteria(dto: UpdateCriteriaDto): MealEligibilityCriteria {
    this.logger.log(`Updating eligibility criteria: ${dto.name}`);
    return this.eligibilityRepository.updateCriteria(dto);
  }

  public listStudents(filter?: { className?: string; status?: string }): {
    records: StudentEligibilityRecord[];
    summary: {
      total: number;
      eligible: number;
      ineligible: number;
      pendingReview: number;
      eligibleRatePct: number;
    };
  } {
    let records = this.eligibilityRepository.getAllRecords();

    if (filter?.className && filter.className !== 'ALL') {
      records = records.filter((r) => r.className.toUpperCase() === filter.className!.toUpperCase());
    }

    if (filter?.status && filter.status !== 'ALL') {
      records = records.filter((r) => r.status === filter.status);
    }

    const total = records.length;
    const eligible = records.filter((r) => r.status === 'ELIGIBLE').length;
    const ineligible = records.filter((r) => r.status === 'INELIGIBLE').length;
    const pendingReview = records.filter((r) => r.status === 'PENDING_REVIEW').length;
    const eligibleRatePct = total > 0 ? Math.round((eligible / total) * 100) : 0;

    return {
      records,
      summary: {
        total,
        eligible,
        ineligible,
        pendingReview,
        eligibleRatePct,
      },
    };
  }

  /**
   * Run automated batch evaluation across students based on active criteria
   */
  public runBatchEvaluation(className?: string): {
    evaluatedCount: number;
    eligibleCount: number;
    ineligibleCount: number;
    updatedRecords: StudentEligibilityRecord[];
  } {
    const criteria = this.eligibilityRepository.getCriteria();
    const allRecords = this.eligibilityRepository.getAllRecords();
    const targets = className && className !== 'ALL'
      ? allRecords.filter((r) => r.className.toUpperCase() === className.toUpperCase())
      : allRecords;

    const updatedRecords: StudentEligibilityRecord[] = [];
    let eligibleCount = 0;
    let ineligibleCount = 0;

    for (const record of targets) {
      // If manually overridden and marked pending review or coordinator locked, keep unless re-evaluated
      const breakdown: StudentEvaluationCriteriaBreakdown = {
        gradeCheck: {
          passed: record.grade >= criteria.minGrade && record.grade <= criteria.maxGrade,
          message:
            record.grade >= criteria.minGrade && record.grade <= criteria.maxGrade
              ? `Khối ${record.grade} đạt tiêu chuẩn [Khối ${criteria.minGrade}-${criteria.maxGrade}]`
              : `Khối ${record.grade} nằm ngoài phạm vi cho phép`,
        },
        healthClearanceCheck: {
          passed: !criteria.requiresHealthClearance || record.hasHealthClearance,
          message: record.hasHealthClearance
            ? 'Đã nộp phiếu y tế và khám sức khỏe'
            : 'Chưa có phiếu khám sức khỏe hoặc cam kết y tế',
        },
        activeEnrollmentCheck: {
          passed: !criteria.requiresActiveEnrollment || record.isActive,
          message: record.isActive ? 'Học sinh đang theo học chính thức' : 'Hồ sơ tạm hoãn hoặc chưa kích hoạt',
        },
        allergySafetyCheck: {
          passed: !criteria.requiresSevereAllergySafe || !record.hasSevereAllergyWarning,
          message: !record.hasSevereAllergyWarning
            ? 'An toàn dinh dưỡng / Đã có kế hoạch suất ăn riêng'
            : 'Phát hiện nguy cơ dị ứng nặng chưa hoàn tất cam kết',
        },
      };

      const reasons: string[] = [];
      if (!breakdown.gradeCheck.passed) reasons.push(breakdown.gradeCheck.message);
      if (!breakdown.healthClearanceCheck.passed) reasons.push(breakdown.healthClearanceCheck.message);
      if (!breakdown.activeEnrollmentCheck.passed) reasons.push(breakdown.activeEnrollmentCheck.message);
      if (!breakdown.allergySafetyCheck.passed) reasons.push(breakdown.allergySafetyCheck.message);

      const status = reasons.length === 0 ? 'ELIGIBLE' : 'INELIGIBLE';
      if (status === 'ELIGIBLE') eligibleCount++;
      else ineligibleCount++;

      const updated: StudentEligibilityRecord = {
        ...record,
        status,
        criteriaBreakdown: breakdown,
        ineligibilityReasons: reasons,
        isManualOverride: false,
        overrideReason: undefined,
        verifiedAt: new Date().toISOString(),
      };

      this.eligibilityRepository.saveRecord(updated);
      updatedRecords.push(updated);
    }

    this.logger.log(`Batch evaluation completed for ${targets.length} students. Eligible: ${eligibleCount}, Ineligible: ${ineligibleCount}`);

    return {
      evaluatedCount: targets.length,
      eligibleCount,
      ineligibleCount,
      updatedRecords,
    };
  }

  /**
   * Manual override of eligibility decision with audit reason
   */
  public manualOverride(dto: ManualOverrideDto, reviewerName = 'Quản lý Bán trú (MGR)'): StudentEligibilityRecord {
    const record = this.eligibilityRepository.getRecordByStudentId(dto.studentId);
    if (!record) {
      throw new NotFoundException(`Không tìm thấy hồ sơ học sinh với mã ${dto.studentId}`);
    }

    const updated: StudentEligibilityRecord = {
      ...record,
      status: dto.status,
      isManualOverride: true,
      overrideReason: dto.reason,
      verifiedBy: reviewerName,
      verifiedAt: new Date().toISOString(),
    };

    this.logger.log(`Manual override applied for student ${record.fullName} (${record.studentCode}): -> ${dto.status}. Reason: ${dto.reason}`);
    return this.eligibilityRepository.saveRecord(updated);
  }
}
