import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateDishDto {
  @ApiProperty({ description: 'Tên món ăn', example: 'Thịt heo kho trứng cút' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Phân loại món ăn',
    enum: ['MAIN', 'SOUP', 'VEG', 'DESSERT'],
    default: 'MAIN',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Mô tả nguyên liệu hoặc cách chế biến' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Năng lượng ước tính (kcal)', example: 280 })
  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({
    description: 'Danh sách các thành phần dị ứng có trong món',
    example: ['Trứng', 'Đậu nành'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];
}

export class UpdateDishDto {
  @ApiPropertyOptional({ description: 'Tên món ăn' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Phân loại món ăn' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Mô tả nguyên liệu hoặc cách chế biến' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Năng lượng ước tính (kcal)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ description: 'Danh sách các thành phần dị ứng' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];
}
