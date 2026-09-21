import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppFooter from './index';

describe('<AppFooter />', () => {
  it('renders school meal management branding and version', () => {
    render(<AppFooter />);

    expect(screen.getByText(/Hệ Thống Quản Lý Bán Trú Tiểu Học/i)).toBeInTheDocument();
    expect(screen.getByText(/Phiên bản 1.0 \(MVP\)/i)).toBeInTheDocument();
  });

  it('renders technical support contact and online status badge', () => {
    render(<AppFooter />);

    expect(screen.getByText(/024.3823.xxxx/i)).toBeInTheDocument();
    expect(screen.getByText('Hệ Thống Trực Tuyến')).toBeInTheDocument();
  });
});
