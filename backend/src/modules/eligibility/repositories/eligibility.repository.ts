import { Injectable, Logger } from '@nestjs/common';
import { MealEligibilityCriteria, StudentEligibilityRecord } from '../entities/eligibility.entity';

@Injectable()
export class EligibilityRepository {
  private readonly logger = new Logger(EligibilityRepository.name);

  private criteria: MealEligibilityCriteria = {
    id: 1,
    schoolYear: '2026-2027',
    name: 'Quy Chuẩn Xét Duyệt Bán Trú Học Đường Tiểu Học',
    minGrade: 1,
    maxGrade: 5,
    requiresHealthClearance: true,
    requiresActiveEnrollment: true,
    requiresSevereAllergySafe: true,
    isActive: true,
    description: 'Bộ tiêu chuẩn 4 điều kiện cốt lõi xác nhận học sinh đủ tư cách tham gia chương trình ăn bán trú.',
  };

  private studentRecords: Map<string, StudentEligibilityRecord> = new Map();

  constructor() {
    this.seedDefaultRecords();
  }

  public getCriteria(): MealEligibilityCriteria {
    return { ...this.criteria };
  }

  public updateCriteria(update: Partial<MealEligibilityCriteria>): MealEligibilityCriteria {
    this.criteria = {
      ...this.criteria,
      ...update,
    };
    return { ...this.criteria };
  }

  public getAllRecords(): StudentEligibilityRecord[] {
    return Array.from(this.studentRecords.values());
  }

  public getRecordByStudentId(studentId: string): StudentEligibilityRecord | undefined {
    return this.studentRecords.get(studentId);
  }

  public saveRecord(record: StudentEligibilityRecord): StudentEligibilityRecord {
    this.studentRecords.set(record.studentId, record);
    return record;
  }

  private seedDefaultRecords() {
    const seedData: Omit<StudentEligibilityRecord, 'criteriaBreakdown' | 'status' | 'ineligibilityReasons' | 'isManualOverride'>[] = [
      {
        id: 'elig-01',
        studentId: 'hs-1052',
        studentCode: 'HS-00101',
        fullName: 'Nguyễn Hoàng An',
        className: '1A',
        grade: 1,
        allergies: ['Hải sản (Tôm, Cua)'],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: false,
      },
      {
        id: 'elig-02',
        studentId: 'hs-1053',
        studentCode: 'HS-00103',
        fullName: 'Nguyễn Minh Khôi',
        className: '1A',
        grade: 1,
        allergies: ['Đậu phộng / Lạc'],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: false,
      },
      {
        id: 'elig-03',
        studentId: 'hs-1054',
        studentCode: 'HS-00105',
        fullName: 'Trần Gia Hưng',
        className: '1A',
        grade: 1,
        allergies: [],
        hasHealthClearance: false, // Thiếu giấy khám sức khỏe
        isActive: true,
        hasSevereAllergyWarning: false,
      },
      {
        id: 'elig-04',
        studentId: 'hs-1055',
        studentCode: 'HS-00107',
        fullName: 'Lê Thảo My',
        className: '1A',
        grade: 1,
        allergies: [],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: false,
      },
      {
        id: 'elig-05',
        studentId: 'hs-1056',
        studentCode: 'HS-00109',
        fullName: 'Phạm Đăng Khoa',
        className: '1A',
        grade: 1,
        allergies: ['Sốc phản vệ lòng trắng trứng (chưa có thuốc cấp cứu)'],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: true, // Cảnh báo sốc phản vệ chưa xử lý
      },
      {
        id: 'elig-06',
        studentId: 'hs-2011',
        studentCode: 'HS-00201',
        fullName: 'Bùi Tuấn Kiệt',
        className: '2A',
        grade: 2,
        allergies: [],
        hasHealthClearance: true,
        isActive: false, // Học sinh đang bảo lưu hồ sơ
        hasSevereAllergyWarning: false,
      },
      {
        id: 'elig-07',
        studentId: 'hs-2012',
        studentCode: 'HS-00203',
        fullName: 'Vũ Hải Yến',
        className: '2A',
        grade: 2,
        allergies: [],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: false,
      },
      {
        id: 'elig-08',
        studentId: 'hs-3011',
        studentCode: 'HS-00301',
        fullName: 'Đặng Ngọc Mai',
        className: '3A',
        grade: 3,
        allergies: [],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: false,
      },
      {
        id: 'elig-09',
        studentId: 'hs-4011',
        studentCode: 'HS-00401',
        fullName: 'Vũ Đức Nam',
        className: '4A',
        grade: 4,
        allergies: [],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: false,
      },
      {
        id: 'elig-10',
        studentId: 'hs-5011',
        studentCode: 'HS-00501',
        fullName: 'Cao Văn Thành',
        className: '5A',
        grade: 5,
        allergies: [],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: false,
      },
    ];

    seedData.forEach((s) => {
      const breakdown = {
        gradeCheck: {
          passed: s.grade >= this.criteria.minGrade && s.grade <= this.criteria.maxGrade,
          message: s.grade >= this.criteria.minGrade && s.grade <= this.criteria.maxGrade ? 'Đạt tiêu chuẩn khối lớp' : 'Ngoài phạm vi khối lớp hợp lệ',
        },
        healthClearanceCheck: {
          passed: s.hasHealthClearance,
          message: s.hasHealthClearance ? 'Đã nộp phiếu y tế hợp lệ' : 'Chưa nộp phiếu khám sức khỏe',
        },
        activeEnrollmentCheck: {
          passed: s.isActive,
          message: s.isActive ? 'Hồ sơ học sinh đang học' : 'Hồ sơ học sinh không hoạt động',
        },
        allergySafetyCheck: {
          passed: !s.hasSevereAllergyWarning,
          message: !s.hasSevereAllergyWarning ? 'An toàn / Đã có phác đồ phục vụ' : 'Cảnh báo nguy cơ dị ứng nghiêm trọng chưa kiểm soát',
        },
      };

      const reasons: string[] = [];
      if (!breakdown.gradeCheck.passed) reasons.push('Khối lớp không hợp lệ');
      if (!breakdown.healthClearanceCheck.passed) reasons.push('Thiếu giấy khám sức khỏe');
      if (!breakdown.activeEnrollmentCheck.passed) reasons.push('Hồ sơ học sinh đang tạm ngừng');
      if (!breakdown.allergySafetyCheck.passed) reasons.push('Nguy cơ sốc dị ứng chưa có cam kết');

      const status = reasons.length === 0 ? 'ELIGIBLE' : 'INELIGIBLE';

      this.studentRecords.set(s.studentId, {
        ...s,
        status,
        criteriaBreakdown: breakdown,
        ineligibilityReasons: reasons,
        isManualOverride: false,
        verifiedAt: new Date().toISOString(),
      });
    });
  }
}
