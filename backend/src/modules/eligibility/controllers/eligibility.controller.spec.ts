import { Test, TestingModule } from '@nestjs/testing';
import { EligibilityController } from './eligibility.controller';
import { EligibilityService } from '../services/eligibility.service';
import { EligibilityRepository } from '../repositories/eligibility.repository';

describe('EligibilityController (Domain 1 - F-PAR-01) - Unit Tests', () => {
  let controller: EligibilityController;
  let service: EligibilityService;
  let repository: EligibilityRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EligibilityController],
      providers: [EligibilityRepository, EligibilityService],
    }).compile();

    controller = module.get<EligibilityController>(EligibilityController);
    service = module.get<EligibilityService>(EligibilityService);
    repository = module.get<EligibilityRepository>(EligibilityRepository);
  });

  it('GET /eligibility/criteria returns standard response wrapping criteria data', () => {
    // Act
    const res = controller.getCriteria();

    // Assert
    expect(res.success).toBe(true);
    expect(res.data.schoolYear).toBe('2026-2027');
    expect(res.data.minGrade).toBe(1);
    expect(res.data.maxGrade).toBe(5);
  });

  it('PUT /eligibility/criteria updates and returns updated criteria configuration', () => {
    // Arrange
    const updateDto = {
      name: 'Tiêu chí Khối 1-4',
      minGrade: 1,
      maxGrade: 4,
      requiresHealthClearance: true,
      requiresActiveEnrollment: true,
      requiresSevereAllergySafe: true,
    };

    // Act
    const res = controller.updateCriteria(updateDto);

    // Assert
    expect(res.success).toBe(true);
    expect(res.data.maxGrade).toBe(4);
    expect(res.message).toContain('Cập nhật tiêu chí xét duyệt thành công');
  });

  it('GET /eligibility/students returns filtered records and statistics summary', () => {
    // Act
    const res = controller.listStudents('1A', 'ELIGIBLE');

    // Assert
    expect(res.success).toBe(true);
    expect(res.data.records.length).toBeGreaterThan(0);
    expect(res.data.records.every((r) => r.className === '1A' && r.status === 'ELIGIBLE')).toBe(true);
    expect(res.data.summary).toBeDefined();
    expect(res.data.summary.total).toBe(res.data.records.length);
  });

  it('POST /eligibility/evaluate-batch triggers automated evaluation and returns count metrics', () => {
    // Act
    const res = controller.runBatchEvaluation({ className: '1A' });

    // Assert
    expect(res.success).toBe(true);
    expect(res.data.evaluatedCount).toBe(5); // 5 students in class 1A
    expect(res.data.updatedRecords.length).toBe(5);
    expect(res.message).toContain('Đã hoàn tất đánh giá tự động cho 5 học sinh');
  });

  it('POST /eligibility/override updates student eligibility with manual reviewer identity', () => {
    // Arrange
    const mockRequest = {
      user: {
        id: 'usr-mgr-001',
        fullName: 'Nguyễn Văn Quản Lý (MGR)',
      },
    };

    const overrideDto = {
      studentId: 'hs-1054',
      status: 'ELIGIBLE' as const,
      reason: 'Đã nộp phiếu y tế trực tiếp tại phòng y tế sáng nay',
    };

    // Act
    const res = controller.manualOverride(overrideDto, mockRequest);

    // Assert
    expect(res.success).toBe(true);
    expect(res.data.studentId).toBe('hs-1054');
    expect(res.data.status).toBe('ELIGIBLE');
    expect(res.data.isManualOverride).toBe(true);
    expect(res.data.overrideReason).toBe('Đã nộp phiếu y tế trực tiếp tại phòng y tế sáng nay');
    expect(res.data.verifiedBy).toBe('Nguyễn Văn Quản Lý (MGR)');
  });
});
