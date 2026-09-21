import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import UserManagementScreen from './UserManagementScreen';
import { AuthService } from '../../services/authService';

vi.mock('../../services/authService', () => ({
  AuthService: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

describe('UserManagementScreen (SCR-ADM-01: Admin User & Role Management)', () => {
  const mockUsers = [
    {
      id: 'usr-adm-001',
      username: 'admin',
      email: 'admin@school.edu.vn',
      fullName: 'Nguyễn Văn Hiệu Trưởng',
      phoneNumber: '0901111222',
      role: 'ADM',
      isActive: true,
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'usr-mgr-002',
      username: 'coordinator.lan',
      email: 'lan.tran@school.edu.vn',
      fullName: 'Trần Thị Lan',
      phoneNumber: '0912345678',
      role: 'MGR',
      isActive: true,
      createdAt: '2026-09-02T08:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.listUsers.mockResolvedValue({
      success: true,
      data: mockUsers,
      pagination: { totalItems: 2 },
    });
  });

  const renderWithRouter = (ui) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  it('should render page header and user table with seeded users', async () => {
    renderWithRouter(<UserManagementScreen />);

    expect(screen.getByText('Quản Lý Người Dùng & Phân Quyền')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Hiệu Trưởng')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị Lan')).toBeInTheDocument();
    });
  });

  it('should filter users when a role tab is selected', async () => {
    renderWithRouter(<UserManagementScreen />);

    const mgrTab = screen.getByRole('button', { name: 'MGR (Bán trú)' });
    fireEvent.click(mgrTab);

    await waitFor(() => {
      expect(AuthService.listUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'MGR' }),
      );
    });
  });

  it('should open modal when clicking "+ Thêm Tài Khoản Mới"', async () => {
    renderWithRouter(<UserManagementScreen />);

    const openBtn = screen.getByRole('button', { name: '+ Thêm Tài Khoản Mới' });
    fireEvent.click(openBtn);

    expect(screen.getByText('Tên đăng nhập (Username) *')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo Tài Khoản' })).toBeInTheDocument();
  });

  it('should toggle user active status when clicking lock button', async () => {
    AuthService.updateUser.mockResolvedValue({ success: true });

    renderWithRouter(<UserManagementScreen />);

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Lan')).toBeInTheDocument();
    });

    const lockBtn = screen.getByRole('button', { name: 'Tạm khóa' });
    fireEvent.click(lockBtn);

    await waitFor(() => {
      expect(AuthService.updateUser).toHaveBeenCalledWith('usr-mgr-002', { isActive: false });
    });
  });
});
