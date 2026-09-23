import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EligibilityScreen from './index';
import { ApiClient } from '../../../services/apiClient';

vi.mock('../../../services/apiClient', () => ({
  ApiClient: {
    getEligibilityCriteria: vi.fn(),
    getEligibilityStudents: vi.fn(),
    runEligibilityBatch: vi.fn(),
    overrideEligibility: vi.fn(),
  },
}));

describe('EligibilityScreen (SCR-PAR-01: Eligibility Determination & Evaluation)', () => {
  const mockCriteria = {
    id: 1,
    schoolYear: '2026-2027',
    name: 'Quy Chuẩn Xét Duyệt Bán Trú Học Đường',
    minGrade: 1,
    maxGrade: 5,
    requiresHealthClearance: true,
    requiresActiveEnrollment: true,
    requiresSevereAllergySafe: true,
    isActive: true,
  };

  const mockStudentsData = {
    records: [
      {
        id: 'elig-01',
        studentId: 'hs-1052',
        studentCode: 'HS-00101',
        fullName: 'Nguyễn Hoàng An',
        className: '1A',
        grade: 1,
        allergies: ['Hải sản'],
        hasHealthClearance: true,
        isActive: true,
        hasSevereAllergyWarning: false,
        status: 'ELIGIBLE',
        criteriaBreakdown: {
          gradeCheck: { passed: true, message: 'Đạt' },
          healthClearanceCheck: { passed: true, message: 'Đạt' },
          activeEnrollmentCheck: { passed: true, message: 'Đạt' },
          allergySafetyCheck: { passed: true, message: 'Đạt' },
        },
        ineligibilityReasons: [],
        isManualOverride: false,
      },
      {
        id: 'elig-03',
        studentId: 'hs-1054',
        studentCode: 'HS-00105',
        fullName: 'Trần Gia Hưng',
        className: '1A',
        grade: 1,
        allergies: [],
        hasHealthClearance: false,
        isActive: true,
        hasSevereAllergyWarning: false,
        status: 'INELIGIBLE',
        criteriaBreakdown: {
          gradeCheck: { passed: true, message: 'Đạt' },
          healthClearanceCheck: { passed: false, message: 'Chưa nộp phiếu' },
          activeEnrollmentCheck: { passed: true, message: 'Đạt' },
          allergySafetyCheck: { passed: true, message: 'Đạt' },
        },
        ineligibilityReasons: ['Thiếu giấy khám sức khỏe'],
        isManualOverride: false,
      },
    ],
    summary: {
      total: 2,
      eligible: 1,
      ineligible: 1,
      pendingReview: 0,
      eligibleRatePct: 50,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ApiClient.getEligibilityCriteria.mockResolvedValue({
      success: true,
      data: mockCriteria,
    });
    ApiClient.getEligibilityStudents.mockResolvedValue({
      success: true,
      data: mockStudentsData,
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <EligibilityScreen />
      </MemoryRouter>
    );
  };

  it('renders page header, core criteria metrics cards, and student records', async () => {
    renderComponent();

    expect(screen.getByText('Xét Duyệt Tư Cách Ăn Bán Trú Tự Động')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Hoàng An')).toBeInTheDocument();
      expect(screen.getByText('Trần Gia Hưng')).toBeInTheDocument();
      expect(screen.getByText('ĐỦ ĐIỀU KIỆN')).toBeInTheDocument();
      expect(screen.getByText('KHÔNG ĐỦ ĐK')).toBeInTheDocument();
    });
  });

  it('triggers automated batch evaluation when clicking batch evaluation button', async () => {
    ApiClient.runEligibilityBatch.mockResolvedValue({
      success: true,
      data: { evaluatedCount: 2, eligibleCount: 1, ineligibleCount: 1, updatedRecords: [] },
    });

    renderComponent();

    // Wait for initial load to finish so button is not disabled
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Hoàng An')).toBeInTheDocument();
    });

    const batchBtn = screen.getByRole('button', { name: /Chạy Đánh Giá Tự Động/i });
    expect(batchBtn).not.toBeDisabled();
    fireEvent.click(batchBtn);

    await waitFor(() => {
      expect(ApiClient.runEligibilityBatch).toHaveBeenCalledWith(undefined);
    });
  });

  it('opens manual override modal and submits coordinator override decision', async () => {
    ApiClient.overrideEligibility.mockResolvedValue({
      success: true,
      data: { studentId: 'hs-1054', status: 'ELIGIBLE' },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Trần Gia Hưng')).toBeInTheDocument();
    });

    const overrideBtns = screen.getAllByRole('button', { name: 'Duyệt tay / Ghi đè' });
    fireEvent.click(overrideBtns[1]); // Student Trần Gia Hưng

    expect(screen.getByText('Can Thiệp Thủ Công Tư Cách Bán Trú')).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/Ví dụ: Phụ huynh đã ký cam kết/i);
    fireEvent.change(reasonInput, {
      target: { value: 'Phụ huynh đã nộp cam kết bổ sung giấy y tế' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Lưu Quyết Định' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(ApiClient.overrideEligibility).toHaveBeenCalledWith({
        studentId: 'hs-1054',
        status: 'INELIGIBLE', // default selected option in modal is student current status
        reason: 'Phụ huynh đã nộp cam kết bổ sung giấy y tế',
      });
    });
  });
});
