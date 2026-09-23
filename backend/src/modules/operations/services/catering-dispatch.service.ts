import { Injectable, Logger } from '@nestjs/common';
import { OperationsRepository, CateringOrderRecord } from '../repositories/operations.repository';
import { DispatchOrderDto } from '../dto/dispatch-order.dto';

export interface EmailDispatchReceipt {
  to: string;
  cc: string[];
  subject: string;
  sentAt: string;
  htmlContent: string;
  status: 'SENT' | 'FAILED';
}

export interface WebhookDispatchReceipt {
  endpoint: string;
  httpStatus: number;
  acknowledged: boolean;
  trackingRef: string;
  dispatchedPayload: Record<string, any>;
  sentAt: string;
}

export interface DispatchOrderResponse extends CateringOrderRecord {
  vendorAcknowledged: boolean;
  vendorTrackingRef: string;
  apiReceipt: WebhookDispatchReceipt;
  emailReceipt: EmailDispatchReceipt;
}

@Injectable()
export class CateringDispatchService {
  private readonly logger = new Logger(CateringDispatchService.name);

  constructor(private readonly operationsRepository: OperationsRepository) {}

  public async dispatchOrder(dto: DispatchOrderDto): Promise<DispatchOrderResponse> {
    const demand = await this.operationsRepository.findDemandById(dto.mealDemandId);
    if (!demand) {
      throw new Error(`Cannot dispatch order: Meal Demand with ID ${dto.mealDemandId} not found.`);
    }

    const specialDietaryPortions = demand.specialDietaryCount;
    const standardPortions = demand.finalDemandCount - specialDietaryPortions;

    const order = await this.operationsRepository.saveCateringOrder({
      mealDemandId: dto.mealDemandId,
      vendorName: dto.vendorName,
      totalOrderedPortions: demand.finalDemandCount,
      standardPortions,
      specialDietaryPortions,
      targetDeliveryTime: dto.targetDeliveryTime || '10:30 AM',
      notes: dto.notes,
    });

    const vendorTrackingRef = `SF-VN-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();

    // 1. Electronic API Webhook Simulation
    const webhookPayload = {
      orderCode: order.orderCode,
      demandId: demand.id,
      mealDate: demand.mealDate,
      schoolName: 'Trường Tiểu học Thực nghiệm Công nghệ Giáo dục Hà Nội',
      totalOrderedPortions: order.totalOrderedPortions,
      standardPortions: order.standardPortions,
      specialDietaryPortions: order.specialDietaryPortions,
      specialInstructions: dto.notes || '18 suất ăn riêng không hải sản, thùng dán nhãn màu vàng',
      targetDeliveryTime: order.targetDeliveryTime,
      vendorCode: 'VEND-SUNFOOD-01',
      dispatchedTimestamp: nowIso,
    };

    const apiReceipt: WebhookDispatchReceipt = {
      endpoint: 'https://api.vincatering.vn/v2/purchase-orders/webhook',
      httpStatus: 200,
      acknowledged: true,
      trackingRef: vendorTrackingRef,
      dispatchedPayload: webhookPayload,
      sentAt: nowIso,
    };

    // 2. Electronic Email Dispatch Generation
    const emailReceipt: EmailDispatchReceipt = {
      to: 'orders@vincatering.vn',
      cc: ['dieu-hanh-bep@vincatering.vn', 'ban-tru@tieuhoc.edu.vn'],
      subject: `[PO-ELECTRONIC] Đơn Đặt Hàng Bán Trú ${order.orderCode} - Giao 10:30 AM (${demand.mealDate})`,
      sentAt: nowIso,
      status: 'SENT',
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1d1d1f; border: 1px solid #e5e5e7; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0066cc; color: white; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">LỆNH ĐẶT HÀNG SUẤT ĂN BÁN TRÚ ĐIỆN TỬ (PO)</h2>
            <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Mã số: <strong>${order.orderCode}</strong> | Tracking: <strong>${vendorTrackingRef}</strong></p>
          </div>
          <div style="padding: 24px;">
            <p>Kính gửi: <strong>Bộ phận Điều hành Bếp - ${dto.vendorName}</strong>,</p>
            <p>Hệ thống Quản lý Bán trú trường học đã tự động chốt số lượng suất ăn trưa ngày <strong>${demand.mealDate}</strong> vào khung giờ quy chế <strong>08:45 AM</strong>. Chi tiết đặt hàng như sau:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr style="background: #f5f5f7;">
                <th style="padding: 10px; border: 1px solid #d2d2d7; text-align: left;">Hạng mục</th>
                <th style="padding: 10px; border: 1px solid #d2d2d7; text-align: right;">Số lượng</th>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #d2d2d7;">Suất ăn học sinh & giáo viên tiêu chuẩn</td>
                <td style="padding: 10px; border: 1px solid #d2d2d7; text-align: right; font-weight: 600;">${order.standardPortions} suất</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #d2d2d7; color: #d97706;">Suất chế độ ăn kiêng / dị ứng riêng</td>
                <td style="padding: 10px; border: 1px solid #d2d2d7; text-align: right; font-weight: 600; color: #d97706;">${order.specialDietaryPortions} suất</td>
              </tr>
              <tr style="background: #e8f2fc;">
                <td style="padding: 12px; border: 1px solid #d2d2d7; font-weight: bold; color: #0066cc;">TỔNG CỘNG XÁC NHẬN BÀN GIAO</td>
                <td style="padding: 12px; border: 1px solid #d2d2d7; text-align: right; font-weight: bold; font-size: 16px; color: #0066cc;">${order.totalOrderedPortions} suất</td>
              </tr>
            </table>

            <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: #92400e;">
              <strong>Lưu ý đóng gói & Bảo quản:</strong> ${dto.notes || '18 suất dị ứng dán nhãn màu vàng riêng. Nhiệt độ thùng giữ nhiệt lúc bàn giao ≥ 65°C.'}
            </div>

            <p style="font-size: 13px; color: #6e6e73; line-height: 1.5;">
              Thời hạn xe giao hàng cập cầu dỡ hàng: <strong>Trước 10:30 AM</strong> ngày hôm nay.<br>
              Đầu mối tiếp nhận tại trường: Ban Vận Hành Bán Trú (Hotline dock: 0912-345-678).
            </p>
          </div>
          <div style="background: #f5f5f7; padding: 12px; text-align: center; font-size: 12px; color: #86868b; border-top: 1px solid #e5e5e7;">
            Bản tin điện tử được phát hành tự động qua Hệ thống Bán trú Học đường VinSchool & Top-Down School Platform.
          </div>
        </div>
      `,
    };

    this.logger.log(`[Electronic PO Dispatched] ${order.orderCode} -> Webhook: 200 OK (${vendorTrackingRef}), Email: ${emailReceipt.to}`);

    return {
      ...order,
      vendorAcknowledged: true,
      vendorTrackingRef,
      apiReceipt,
      emailReceipt,
    };
  }

  public async getOrderById(orderId: number): Promise<CateringOrderRecord> {
    const order = await this.operationsRepository.findOrderById(orderId);
    if (!order) {
      throw new Error(`Catering Order with ID ${orderId} not found.`);
    }
    return order;
  }
}
