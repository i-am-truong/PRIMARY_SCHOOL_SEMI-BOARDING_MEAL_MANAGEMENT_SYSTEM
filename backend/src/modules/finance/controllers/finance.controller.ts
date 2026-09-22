import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FinanceService, InvoiceDto } from '../services/finance.service';

@ApiTags('Finance & Billing (Domain 5)')
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('invoices/student/:studentId')
  @ApiOperation({
    summary: 'Lấy danh sách hóa đơn theo học sinh',
    description: 'Trả về danh sách hóa đơn bán trú, chi tiết khoản thu và liên kết VietQR động',
  })
  public async getInvoicesByStudent(@Param('studentId') studentId: string): Promise<{ success: boolean; data: InvoiceDto[] }> {
    const data = await this.financeService.getInvoicesByStudent(studentId);
    return { success: true, data };
  }

  @Post('invoices/:invoiceId/pay')
  @ApiOperation({
    summary: 'Xác nhận thanh toán hóa đơn (Giả lập webhook ngân hàng)',
    description: 'Cập nhật trạng thái hóa đơn sang PAID',
  })
  public async payInvoice(@Param('invoiceId') invoiceId: string): Promise<{ success: boolean; data: InvoiceDto }> {
    const data = await this.financeService.payInvoice(invoiceId);
    return { success: true, data };
  }
}
