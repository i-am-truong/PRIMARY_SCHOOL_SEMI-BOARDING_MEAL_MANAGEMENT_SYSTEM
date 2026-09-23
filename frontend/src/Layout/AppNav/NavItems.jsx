/**
 * Navigation Menu Definitions for Primary School Semi-Boarding Management System
 * Refined and professional ERP-grade labels (No awkward AI emojis or redundant timestamps)
 */

// 1. Phân hệ Vận hành bán trú hàng ngày (Domain 1 & Domain 3)
export const SemiBoardingNav = [
  {
    icon: 'lnr-license',
    label: 'Xét Duyệt Bán Trú',
    to: '/coordinator/eligibility',
  },
  {
    icon: 'lnr-calendar-full',
    label: 'Điểm Danh Lớp',
    to: '/coordinator/attendance',
  },
  {
    icon: 'lnr-chart-bars',
    label: 'Tính Nhu Cầu Suất Ăn',
    to: '/coordinator/demand',
  },
  {
    icon: 'lnr-checkmark-circle',
    label: 'Kiểm Thực Giao Nhận',
    to: '/coordinator/receiving',
  },
  {
    icon: 'lnr-layers',
    label: 'Phân Phối Lớp Học',
    to: '/coordinator/distribution',
  },
  {
    icon: 'lnr-sync',
    label: 'Đối Soát Suất Ăn',
    to: '/coordinator/reconciliation',
  },
];

// 2. Phân hệ Thực đơn & Dinh dưỡng (Domain 2 & Domain 7)
export const MenuNutritionNav = [
  {
    icon: 'lnr-dinner',
    label: 'Thực Đơn & Phê Duyệt',
    to: '/admin/menus',
  },
];

// 3. Phân hệ Cổng Phụ huynh (Domain 7 / Transparency)
export const ParentPortalNav = [
  {
    icon: 'lnr-heart',
    label: 'Tra Cứu & Báo Nghỉ',
    to: '/parent/portal',
  },
];

// 4. Phân hệ Quản trị hệ thống & Phân quyền (Domain 6)
export const SystemAdminNav = [
  {
    icon: 'lnr-users',
    label: 'Quản Lý Người Dùng',
    to: '/admin/users',
  },
];
