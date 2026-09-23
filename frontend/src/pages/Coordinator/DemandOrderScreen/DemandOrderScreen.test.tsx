import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import DemandOrderScreen from './index';
import { useMealOperations } from '../../../hooks/useMealOperations';

vi.mock('../../../hooks/useMealOperations', () => ({
  useMealOperations: vi.fn(),
}));

describe('DemandOrderScreen (08:45 AM Cutoff & Dual-Channel Electronic PO Dispatch)', () => {
  const mockSubmitOrderToCatering = vi.fn();
  const mockTriggerAutoCutoff = vi.fn();
  const mockSetBufferPercentage = vi.fn();

  const mockDraftDemand = {
    date: '2026-09-23',
    session: 'LUNCH',
    cutoffTime: '08:45 AM',
    isCutoffLocked: true,
    totalPresentStudents: 1200,
    staffPortions: 38,
    bufferPercentage: 5,
    calculatedBufferPortions: 62,
    totalOrderedPortions: 1300,
    specialDietPortions: 18,
    status: 'DRAFT',
    cateringVendor: {
      id: 'CAT-01',
      name: 'Công Ty CP Suất Ăn Học Đường VinaCatering',
      contactPhone: '0908.123.456',
      contractPricePerMeal: 35000,
    },
    dishes: [
      {
        dish: { id: 'D-01', name: 'Thịt heo kho trứng cút', category: 'MAIN', targetTemp: 65, allergens: ['Trứng'], unit: 'kg' },
        requiredQty: 130,
      },
      {
        dish: { id: 'D-02', name: 'Canh bí xanh thịt bằm', category: 'SOUP', targetTemp: 70, allergens: [], unit: 'liters' },
        requiredQty: 195,
      },
    ],
  };

  const mockDispatchedDemand = {
    ...mockDraftDemand,
    status: 'ORDER_SENT',
    poDispatchReceipt: {
      orderCode: 'PO-20260923-51',
      vendorTrackingRef: 'SF-VN-94542',
      dispatchedAt: '08:45:02 AM',
      apiStatus: 200,
      apiEndpoint: 'https://api.vincatering.vn/v2/purchase-orders/webhook',
      emailTo: 'orders@vincatering.vn',
      emailSubject: '[PO-ELECTRONIC] Đơn Đặt Hàng Bán Trú PO-20260923-51 - Giao 10:30 AM',
      targetDeliveryTime: '10:30 AM',
      emailHtmlPreview: '<div>Nội dung thư PO điện tử</div>',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <DemandOrderScreen />
      </MemoryRouter>
    );
  };

  it('renders 08:45 AM cutoff banner and simulation trigger button in DRAFT mode', () => {
    useMealOperations.mockReturnValue({
      demand: mockDraftDemand,
      setBufferPercentage: mockSetBufferPercentage,
      submitOrderToCatering: mockSubmitOrderToCatering,
      triggerAutoCutoff: mockTriggerAutoCutoff,
    });

    renderComponent();

    // Verify 08:45 AM statutory cutoff title and banner
    expect(screen.getByText(/08:45 AM Cutoff & Automated PO/i)).toBeInTheDocument();
    expect(screen.getByText('Chế độ Chốt Sĩ Số Tự Động: 08:45 AM')).toBeInTheDocument();
    expect(screen.getByText('CHỜ TỰ ĐỘNG CHỐT')).toBeInTheDocument();

    // Verify trigger simulation button
    const triggerBtn = screen.getByRole('button', { name: /Kích hoạt chốt & Bắn PO ngay/i });
    expect(triggerBtn).toBeInTheDocument();
    expect(triggerBtn).not.toBeDisabled();
  });

  it('calls triggerAutoCutoff when clicking simulation button in draft mode', async () => {
    mockTriggerAutoCutoff.mockResolvedValue({
      orderDispatch: { orderCode: 'PO-20260923-51' },
    });

    useMealOperations.mockReturnValue({
      demand: mockDraftDemand,
      setBufferPercentage: mockSetBufferPercentage,
      submitOrderToCatering: mockSubmitOrderToCatering,
      triggerAutoCutoff: mockTriggerAutoCutoff,
    });

    renderComponent();

    const triggerBtn = screen.getByRole('button', { name: /Kích hoạt chốt & Bắn PO ngay/i });
    fireEvent.click(triggerBtn);

    await waitFor(() => {
      expect(mockTriggerAutoCutoff).toHaveBeenCalledWith(0.05);
    });
  });

  it('renders dual-channel transmission receipts (Webhook API & Email PO) when order is dispatched', () => {
    useMealOperations.mockReturnValue({
      demand: mockDispatchedDemand,
      setBufferPercentage: mockSetBufferPercentage,
      submitOrderToCatering: mockSubmitOrderToCatering,
      triggerAutoCutoff: mockTriggerAutoCutoff,
    });

    renderComponent();

    // Verify banner updated to successful dispatch
    expect(screen.getByText('Đã Tự Động Chốt & Bắn PO Điện Tử Thành Công (08:45 AM)')).toBeInTheDocument();
    expect(screen.getByText('ĐÃ PHÁT HÀNH PO')).toBeInTheDocument();
    expect(screen.getByText('PO-20260923-51')).toBeInTheDocument();
    
    // Tracking ref appears both in the top summary banner and inside the Webhook receipt card
    const trackingInstances = screen.getAllByText('SF-VN-94542');
    expect(trackingInstances.length).toBe(2);

    // Verify Channel 1: Webhook API Audit
    expect(screen.getByText('Webhook API Đối Tác Catering')).toBeInTheDocument();
    expect(screen.getByText('HTTP 200 OK')).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/api.vincatering.vn\/v2\/purchase-orders\/webhook/i)).toBeInTheDocument();

    // Verify Channel 2: Email PO Audit
    expect(screen.getByText('Thư Điện Tử Chính Thức (Email PO)')).toBeInTheDocument();
    expect(screen.getByText('ĐÃ GỬI (SENT)')).toBeInTheDocument();
    expect(screen.getByText('orders@vincatering.vn')).toBeInTheDocument();
  });

  it('opens and displays email PO preview modal when clicking view email button', async () => {
    useMealOperations.mockReturnValue({
      demand: mockDispatchedDemand,
      setBufferPercentage: mockSetBufferPercentage,
      submitOrderToCatering: mockSubmitOrderToCatering,
      triggerAutoCutoff: mockTriggerAutoCutoff,
    });

    renderComponent();

    const viewEmailBtn = screen.getByRole('button', { name: /Xem Email PO Đã Gửi/i });
    fireEvent.click(viewEmailBtn);

    await waitFor(() => {
      expect(screen.getByText('Biên Nhận Thư Điện Tử Đặt Hàng Bán Trú (Electronic PO Email)')).toBeInTheDocument();
      expect(screen.getByText('Nội dung thư PO điện tử')).toBeInTheDocument();
    });
  });
});
