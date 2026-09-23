import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Role, Roles } from '../../../common/decorators/roles.decorator';
import { EligibilityService } from '../services/eligibility.service';
import { ManualOverrideDto, RunBatchEvaluationDto, UpdateCriteriaDto } from '../dto/eligibility.dto';

@ApiTags('Student Meal Eligibility Determination (Domain 1 - F-PAR-01)')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('eligibility')
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Get('criteria')
  @Roles(Role.MGR, Role.ADM)
  @ApiOperation({
    summary: 'Lấy cấu hình bộ 4 tiêu chí xét duyệt tư cách ăn bán trú',
    description: 'Trả về quy chuẩn khối lớp, giấy tờ y tế, trạng thái học sinh và an toàn dị ứng.',
  })
  public getCriteria() {
    const data = this.eligibilityService.getCriteria();
    return { success: true, data };
  }

  @Put('criteria')
  @Roles(Role.ADM)
  @ApiOperation({
    summary: 'Cập nhật cấu hình bộ tiêu chí xét duyệt (Chỉ Admin)',
  })
  public updateCriteria(@Body() dto: UpdateCriteriaDto) {
    const data = this.eligibilityService.updateCriteria(dto);
    return { success: true, data, message: 'Cập nhật tiêu chí xét duyệt thành công.' };
  }

  @Get('students')
  @Roles(Role.MGR, Role.ADM)
  @ApiOperation({
    summary: 'Danh sách xét duyệt tư cách ăn bán trú của học sinh',
    description: 'Hỗ trợ lọc theo lớp học và trạng thái đạt / không đạt / cần rà soát.',
  })
  public listStudents(
    @Query('className') className?: string,
    @Query('status') status?: string,
  ) {
    const result = this.eligibilityService.listStudents({ className, status });
    return { success: true, data: result };
  }

  @Post('evaluate-batch')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.MGR, Role.ADM)
  @ApiOperation({
    summary: 'Chạy tự động đánh giá tư cách bán trú hàng loạt',
    description: 'Quét toàn bộ học sinh theo 4 tiêu chí và phân loại tự động ELIGIBLE hoặc INELIGIBLE.',
  })
  public runBatchEvaluation(@Body() dto?: RunBatchEvaluationDto) {
    const result = this.eligibilityService.runBatchEvaluation(dto?.className);
    return {
      success: true,
      data: result,
      message: `Đã hoàn tất đánh giá tự động cho ${result.evaluatedCount} học sinh.`,
    };
  }

  @Post('override')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.MGR, Role.ADM)
  @ApiOperation({
    summary: 'Ghi đè thủ công tư cách bán trú của học sinh kèm lý do giải trình',
  })
  public manualOverride(@Body() dto: ManualOverrideDto, @Req() req: any) {
    const reviewerName = req.user?.fullName || 'Quản lý Bán trú (MGR)';
    const result = this.eligibilityService.manualOverride(dto, reviewerName);
    return {
      success: true,
      data: result,
      message: `Đã cập nhật trạng thái tư cách cho học sinh ${result.fullName} thành [${result.status}].`,
    };
  }
}
