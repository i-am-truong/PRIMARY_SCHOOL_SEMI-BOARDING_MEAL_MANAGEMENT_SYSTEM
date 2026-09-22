import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Role, Roles } from '../../../common/decorators/roles.decorator';
import { StudentsService, StudentDto, AbsenceRequestDto } from '../services/students.service';

@ApiTags('Students & Class Attendance (Domain 1)')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('classes/:className')
  @Roles(Role.MGR, Role.ADM)
  @ApiOperation({
    summary: 'Get Student Roster by Classroom',
    description: 'Returns real student list and allergy flags for attendance checklist.',
  })
  public async getRosterByClass(@Param('className') className: string): Promise<{ success: boolean; data: StudentDto[] }> {
    const data = await this.studentsService.getRosterByClass(className);
    return { success: true, data };
  }

  @Get('my-children')
  @Roles(Role.PAR, Role.ADM, Role.MGR)
  @ApiOperation({
    summary: 'Lấy danh sách con theo tài khoản phụ huynh đang đăng nhập',
  })
  public async getMyChildren(@Req() req: any): Promise<{ success: boolean; data: StudentDto[] }> {
    const parentId = req.user?.id || req.headers['x-mock-user-id'];
    const data = await this.studentsService.getChildrenByParent(parentId);
    return { success: true, data };
  }

  @Get(':id/attendance-history')
  @Roles(Role.PAR, Role.ADM, Role.MGR)
  @ApiOperation({
    summary: 'Xem lịch sử điểm danh suất ăn của học sinh',
  })
  public async getAttendanceHistory(@Param('id') studentId: string) {
    const data = await this.studentsService.getAttendanceHistory(studentId);
    return { success: true, data };
  }

  @Post('absence-request')
  @Roles(Role.PAR, Role.ADM, Role.MGR)
  @ApiOperation({
    summary: 'Phụ huynh gửi đơn báo nghỉ suất ăn bán trú (Chặn sau 08:00 sáng)',
  })
  public async requestMealAbsence(@Body() dto: AbsenceRequestDto) {
    const data = await this.studentsService.requestMealAbsence(dto);
    return data;
  }

  @Patch(':id/attendance')
  @Roles(Role.MGR, Role.ADM)
  @ApiOperation({
    summary: 'Update Student Attendance Status',
    description: 'Records PRESENT, EXCUSED_ABSENCE, or UNEXCUSED_ABSENCE for daily meal allocation.',
  })
  public async updateAttendance(
    @Param('id') studentId: string,
    @Body('status') status: 'PRESENT' | 'EXCUSED_ABSENCE' | 'UNEXCUSED_ABSENCE',
  ) {
    const data = await this.studentsService.updateAttendanceStatus(studentId, status);
    return { success: true, data };
  }
}
