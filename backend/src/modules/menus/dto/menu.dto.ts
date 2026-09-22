import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum MenuStatusEnum {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class CreateMenuDto {
  @ApiProperty({ description: 'Ngày phục vụ suất ăn (YYYY-MM-DD)', example: '2026-09-23' })
  @IsDateString()
  @IsNotEmpty()
  serveDate: string;

  @ApiProperty({ description: 'Tiêu đề thực đơn', example: 'Thực đơn Tiêu chuẩn Dinh dưỡng Ngày 23/09' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Mô tả thêm về thực đơn' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Danh sách ID các món ăn trong thực đơn',
    example: ['dish-uuid-1', 'dish-uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  dishIds: string[];
}

export class UpdateMenuDto {
  @ApiPropertyOptional({ description: 'Tiêu đề thực đơn' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Mô tả thêm về thực đơn' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Danh sách ID các món ăn trong thực đơn',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dishIds?: string[];
}

export class RejectMenuDto {
  @ApiProperty({ description: 'Lý do từ chối phê duyệt thực đơn', example: 'Món tráng miệng có độ ngọt cao, đề nghị đổi sang trái cây tươi' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ApproveMenuDto {
  @ApiPropertyOptional({ description: 'Ghi chú khi phê duyệt thực đơn', example: 'Đạt chuẩn dinh dưỡng khuyến nghị' })
  @IsOptional()
  @IsString()
  note?: string;
}
