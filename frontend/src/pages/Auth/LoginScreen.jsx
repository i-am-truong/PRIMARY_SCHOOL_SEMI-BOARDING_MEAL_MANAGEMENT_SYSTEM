import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Card,
  CardBody,
  Button,
  Form,
  FormGroup,
  Label,
  Input,
  Alert,
  Table,
} from 'reactstrap';
import { AuthService } from '../../services/authService';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const data = await AuthService.login({ username, password });
      setSuccessMsg(`Đăng nhập thành công! Chào mừng ${data.user.fullName}`);
      setTimeout(() => {
        if (data.user.role === 'ADM') {
          navigate('/admin/users');
        } else {
          navigate('/coordinator/attendance');
        }
      }, 600);
    } catch (err) {
      setErrorMsg(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  return (
    <div className="semi-boarding-page d-flex align-items-center justify-content-center min-vh-100 py-5" style={{ backgroundColor: 'var(--apple-canvas-parchment)' }}>
      <div style={{ maxWidth: '440px', width: '100%' }} className="px-3">
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-white border rounded-circle shadow-sm mb-3" style={{ width: '56px', height: '56px', fontSize: '24px' }}>
            🍱
          </div>
          <h3 className="fw-semibold text-dark mb-1" style={{ letterSpacing: '-0.03em' }}>
            Quản Lý Bán Trú Tiểu Học
          </h3>
          <p className="text-muted small mb-0">
            Cổng Đăng Nhập & Phân Quyền Tập Trung (SCR-AUTH-01)
          </p>
        </div>

        {/* Login Card (Apple Card) */}
        <Card className="apple-card mb-4 border shadow-sm">
          <div className="p-4 border-bottom">
            <span className="text-muted small fw-semibold text-uppercase">Xác Thực Danh Tính</span>
            <h5 className="fw-semibold text-dark mt-1 mb-0">Đăng Nhập Hệ Thống</h5>
          </div>
          <CardBody className="p-4">
            {errorMsg && (
              <Alert color="danger" className="rounded-3 py-2 px-3 small border">
                {errorMsg}
              </Alert>
            )}
            {successMsg && (
              <Alert color="success" className="rounded-3 py-2 px-3 small border">
                {successMsg}
              </Alert>
            )}

            <Form onSubmit={handleLogin}>
              <FormGroup className="mb-3">
                <Label for="username" className="small fw-semibold text-muted mb-1">Tên đăng nhập hoặc Email</Label>
                <Input
                  id="username"
                  type="text"
                  className="rounded-3"
                  placeholder="admin hoặc coordinator.lan"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </FormGroup>

              <FormGroup className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <Label for="password" className="small fw-semibold text-muted mb-0">Mật khẩu</Label>
                  <span className="text-muted" style={{ fontSize: '12px' }}>Mã hóa bcrypt</span>
                </div>
                <Input
                  id="password"
                  type="password"
                  className="rounded-3"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </FormGroup>

              <Button
                color="primary"
                type="submit"
                className="btn-apple-primary w-100 py-2"
                disabled={loading}
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập'}
              </Button>
            </Form>
          </CardBody>
        </Card>

        {/* Fast Switcher Card for 4 Fixed Roles */}
        <Card className="apple-card-parchment p-3 border">
          <div className="d-flex align-items-center justify-content-between mb-2 px-1">
            <span className="fw-semibold small text-dark">Tài khoản mẫu 4 Roles (1-Click Fill)</span>
            <span className="badge rounded-pill bg-light text-primary border px-2 py-1 small">Fixed RBAC</span>
          </div>
          <Table responsive size="sm" className="mb-0 small align-middle table-borderless">
            <tbody>
              <tr style={{ cursor: 'pointer' }} onClick={() => handleQuickFill('admin', 'admin123')}>
                <td><span className="badge rounded-pill bg-danger-subtle text-danger border px-2">ADM</span></td>
                <td className="fw-semibold text-dark">admin</td>
                <td className="text-muted">admin123</td>
                <td className="text-end text-primary fw-medium">Chọn ➔</td>
              </tr>
              <tr style={{ cursor: 'pointer' }} onClick={() => handleQuickFill('coordinator.lan', 'mgr123')}>
                <td><span className="badge rounded-pill bg-primary-subtle text-primary border px-2">MGR</span></td>
                <td className="fw-semibold text-dark">coordinator.lan</td>
                <td className="text-muted">mgr123</td>
                <td className="text-end text-primary fw-medium">Chọn ➔</td>
              </tr>
              <tr style={{ cursor: 'pointer' }} onClick={() => handleQuickFill('accountant.hoa', 'acc123')}>
                <td><span className="badge rounded-pill bg-success-subtle text-success border px-2">ACC</span></td>
                <td className="fw-semibold text-dark">accountant.hoa</td>
                <td className="text-muted">acc123</td>
                <td className="text-end text-primary fw-medium">Chọn ➔</td>
              </tr>
              <tr style={{ cursor: 'pointer' }} onClick={() => handleQuickFill('parent.minh', 'par123')}>
                <td><span className="badge rounded-pill bg-warning-subtle text-dark border px-2">PAR</span></td>
                <td className="fw-semibold text-dark">parent.minh</td>
                <td className="text-muted">par123</td>
                <td className="text-end text-primary fw-medium">Chọn ➔</td>
              </tr>
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
