import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { EligibilityStatus } from '../entities/eligibility.entity';

export class UpdateCriteriaDto {
  @ApiProperty({ description: 'Tên bộ tiêu chí', example: 'Tiêu chuẩn Bán trú Tiểu học 2026-2027' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Khối lớp tối thiểu', example: 1 })
  @IsNumber()
  @Min(1)
  @Max(5)
  minGrade: number;

  @ApiProperty({ description: 'Khối lớp tối đa', example: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  maxGrade: number;

  @ApiProperty({ description: 'Bắt buộc nộp Giấy khám sức khỏe / Cam kết y tế', example: true })
  @IsBoolean()
  requiresHealthClearance: boolean;

  @ApiProperty({ description: 'Bắt buộc trạng thái học sinh đang hoạt động', example: true })
  @IsBoolean()
  requiresActiveEnrollment: boolean;

  @ApiProperty({ description: 'Bắt buộc an toàn dị ứng / Có kế hoạch chăm sóc riêng', example: true })
  @IsBoolean()
  requiresSevereAllergySafe: boolean;
}

export class RunBatchEvaluationDto {
  @ApiPropertyOptional({ description: 'Tên lớp muốn xét duyệt cụ thể (để trống nếu toàn trường)', example: '1A' })
  @IsOptional()
  @IsString()
  className?: string;
}

export class ManualOverrideDto {
  @ApiProperty({ description: 'Mã ID học sinh', example: 'hs-1052' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'Trạng thái xét duyệt ghi đè', enum: ['ELIGIBLE', 'INELIGIBLE', 'PENDING_REVIEW'], example: 'ELIGIBLE' })
  @IsEnum(['ELIGIBLE', 'INELIGIBLE', 'PENDING_REVIEW'])
  status: EligibilityStatus;

  @ApiProperty({ description: 'Lý do giải trình ghi đè quyết định', example: 'Phụ huynh đã nộp giấy cam kết bổ sung phiếu khám sức khỏe vào thứ Hai' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
