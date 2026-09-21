import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Badge,
  Table,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Alert,
} from 'reactstrap';
import { Link } from 'react-router';
import { AuthService } from '../../services/authService';

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [notification, setNotification] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    role: 'MGR',
  });

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await AuthService.listUsers({
        role: selectedRole === 'ALL' ? undefined : selectedRole,
        search: searchKeyword || undefined,
      });
      setUsers(res.data || []);
    } catch (err) {
      setNotification({ type: 'danger', message: `Lỗi kết nối máy chủ: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleActive = async (user) => {
    try {
      const newStatus = !user.isActive;
      await AuthService.updateUser(user.id, { isActive: newStatus });
      setNotification({
        type: 'success',
        message: `Đã ${newStatus ? 'kích hoạt' : 'tạm khóa'} tài khoản @${user.username}`,
      });
      loadUsers();
    } catch (err) {
      setNotification({ type: 'danger', message: `Không thể đổi trạng thái: ${err.message}` });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    try {
      await AuthService.createUser(formData);
      setNotification({
        type: 'success',
        message: `Tạo tài khoản @${formData.username} thành công!`,
      });
      setModalOpen(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        fullName: '',
        phoneNumber: '',
        role: 'MGR',
      });
      loadUsers();
    } catch (err) {
      setNotification({ type: 'danger', message: `Tạo tài khoản thất bại: ${err.message}` });
    } finally {
      setModalSubmitting(false);
    }
  };

  // Metric rollups
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const staffCount = users.filter((u) => ['ADM', 'MGR', 'ACC'].includes(u.role)).length;
  const parentCount = users.filter((u) => u.role === 'PAR').length;

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADM':
        return <span className="badge rounded-pill bg-danger-subtle text-danger border px-2 py-1 fw-medium">ADM • Quản trị</span>;
      case 'MGR':
        return <span className="badge rounded-pill bg-primary-subtle text-primary border px-2 py-1 fw-medium">MGR • Bán trú</span>;
      case 'ACC':
        return <span className="badge rounded-pill bg-success-subtle text-success border px-2 py-1 fw-medium">ACC • Kế toán</span>;
      case 'PAR':
        return <span className="badge rounded-pill bg-warning-subtle text-dark border px-2 py-1 fw-medium">PAR • Phụ huynh</span>;
      default:
        return <Badge color="light" className="text-dark">{role}</Badge>;
    }
  };

  const roleFilterTabs = [
    { label: 'Tất cả', val: 'ALL' },
    { label: 'ADM (Quản trị)', val: 'ADM' },
    { label: 'MGR (Bán trú)', val: 'MGR' },
    { label: 'ACC (Kế toán)', val: 'ACC' },
    { label: 'PAR (Phụ huynh)', val: 'PAR' },
  ];

  return (
    <div className="semi-boarding-page p-4">
      {/* Editorial Header - Aligned with DESIGN.md and Coordinator Screens */}
      <div className="d-flex flex-wrap justify-content-between align-items-end pb-3 mb-4 border-bottom">
        <div>
          <div className="text-muted small fw-semibold text-uppercase tracking-wider mb-1">
            Quản Trị Hệ Thống • Fixed 4-Role RBAC Model
          </div>
          <h2 className="fw-semibold text-dark mb-1" style={{ letterSpacing: '-0.03em' }}>
            Quản Lý Người Dùng & Phân Quyền
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: '15px' }}>
            Quản trị danh sách nhân sự, phân bổ 4 vai trò cố định (ADM, MGR, ACC, PAR) và kiểm soát trạng thái đăng nhập.
          </p>
        </div>
        <div className="d-flex gap-2 mt-3 mt-md-0">
          <Link to="/login" className="btn btn-apple-secondary text-decoration-none">
            Cổng Đăng Nhập →
          </Link>
          <Button
            color="primary"
            className="btn-apple-primary"
            onClick={() => setModalOpen(true)}
          >
            + Thêm Tài Khoản Mới
          </Button>
        </div>
      </div>

      {notification && (
        <Alert
          color={notification.type}
          isOpen={true}
          toggle={() => setNotification(null)}
          className="rounded-3 border py-2 px-3 mb-4 small"
        >
          {notification.message}
        </Alert>
      )}

      {/* Harmonized Metric Tiles (Apple System Design) */}
      <Row className="g-3 mb-4">
        <Col md="3">
          <div className="metric-tile">
            <div className="metric-tile-label">Tổng số tài khoản</div>
            <div className="metric-tile-value">{totalCount}</div>
            <div className="metric-tile-sub">Bao gồm toàn bộ nhân sự & phụ huynh</div>
          </div>
        </Col>
        <Col md="3">
          <div className="metric-tile">
            <div className="metric-tile-label">Đang hoạt động</div>
            <div className="metric-tile-value text-success">{activeCount}</div>
            <div className="metric-tile-sub">Tài khoản hợp lệ được phép login</div>
          </div>
        </Col>
        <Col md="3">
          <div className="metric-tile">
            <div className="metric-tile-label">Cán bộ & Nhân viên</div>
            <div className="metric-tile-value">{staffCount}</div>
            <div className="metric-tile-sub">ADM, MGR, ACC nội bộ trường</div>
          </div>
        </Col>
        <Col md="3">
          <div className="metric-tile">
            <div className="metric-tile-label">Phụ huynh học sinh</div>
            <div className="metric-tile-value text-primary">{parentCount}</div>
            <div className="metric-tile-sub">Tài khoản truy cập Cổng minh bạch</div>
          </div>
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <Card className="apple-card mb-4">
        <CardBody className="p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            {/* Filter Pills */}
            <div className="d-flex flex-wrap gap-2">
              {roleFilterTabs.map((tab) => (
                <button
                  key={tab.val}
                  type="button"
                  className={`btn btn-sm ${
                    selectedRole === tab.val ? 'btn-apple-primary' : 'btn-apple-secondary'
                  }`}
                  onClick={() => setSelectedRole(tab.val)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <Form onSubmit={handleSearch} className="d-flex gap-2" style={{ minWidth: '320px' }}>
              <Input
                type="search"
                placeholder="Tìm tên, email, username..."
                className="form-control-sm rounded-pill px-3"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <Button type="submit" className="btn-apple-secondary btn-sm px-3">
                Tìm
              </Button>
            </Form>
          </div>
        </CardBody>
      </Card>

      {/* Users Table Card */}
      <Card className="apple-card">
        <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
          <div>
            <span className="text-muted small fw-semibold text-uppercase">Danh Sách Tài Khoản</span>
            <h5 className="fw-semibold text-dark mt-1 mb-0">Hồ Sơ & Quyền Hạn Hệ Thống</h5>
          </div>
          {loading && <span className="text-muted small">Đang đồng bộ...</span>}
        </div>
        <CardBody className="p-0">
          <Table responsive hover className="align-middle mb-0 text-nowrap">
            <thead className="table-light text-secondary small">
              <tr>
                <th className="ps-4">Họ Và Tên / Username</th>
                <th>Email / Điện Thoại</th>
                <th>Vai Trò (Role)</th>
                <th>Trạng Thái</th>
                <th>Ngày Tạo</th>
                <th className="text-end pe-4">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    Không tìm thấy người dùng phù hợp trong hệ thống.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="ps-4">
                      <div className="fw-semibold text-dark">{u.fullName}</div>
                      <span className="text-muted small">@{u.username}</span>
                    </td>
                    <td>
                      <div className="small text-dark">{u.email}</div>
                      <span className="text-muted small">{u.phoneNumber || '—'}</span>
                    </td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>
                      {u.isActive ? (
                        <span className="badge rounded-pill bg-success-subtle text-success border px-2 py-1 small">
                          ● Hoạt động
                        </span>
                      ) : (
                        <span className="badge rounded-pill bg-secondary-subtle text-secondary border px-2 py-1 small">
                          ○ Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="small text-muted">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="text-end pe-4">
                      {u.username !== 'admin' ? (
                        <Button
                          size="sm"
                          className={u.isActive ? 'btn-apple-secondary' : 'btn-apple-primary'}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.isActive ? 'Tạm khóa' : 'Kích hoạt'}
                        </Button>
                      ) : (
                        <span className="badge bg-light text-muted border px-2 py-1 small">Mặc định</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {/* Modal Add User - Styled with Apple clean modal tokens */}
      <Modal isOpen={modalOpen} toggle={() => setModalOpen(!modalOpen)} centered>
        <ModalHeader toggle={() => setModalOpen(!modalOpen)} className="border-bottom">
          <span className="fw-semibold text-dark">Thêm Người Dùng Mới</span>
        </ModalHeader>
        <Form onSubmit={handleCreateUser}>
          <ModalBody className="p-4">
            <FormGroup className="mb-3">
              <Label className="small fw-semibold text-muted mb-1">Tên đăng nhập (Username) *</Label>
              <Input
                type="text"
                required
                className="rounded-3"
                placeholder="Ví dụ: accountant.mai"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </FormGroup>
            <FormGroup className="mb-3">
              <Label className="small fw-semibold text-muted mb-1">Email chính thức *</Label>
              <Input
                type="email"
                required
                className="rounded-3"
                placeholder="mai.le@school.edu.vn"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormGroup>
            <FormGroup className="mb-3">
              <Label className="small fw-semibold text-muted mb-1">Mật khẩu khởi tạo *</Label>
              <Input
                type="password"
                required
                minLength={6}
                className="rounded-3"
                placeholder="Tối thiểu 6 ký tự..."
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </FormGroup>
            <FormGroup className="mb-3">
              <Label className="small fw-semibold text-muted mb-1">Họ và tên hiển thị *</Label>
              <Input
                type="text"
                required
                className="rounded-3"
                placeholder="Ví dụ: Lê Thị Mai"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </FormGroup>
            <FormGroup className="mb-3">
              <Label className="small fw-semibold text-muted mb-1">Số điện thoại liên lạc</Label>
              <Input
                type="text"
                className="rounded-3"
                placeholder="0912345678"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </FormGroup>
            <FormGroup className="mb-2">
              <Label className="small fw-semibold text-muted mb-1">Vai trò cố định (Fixed Role) *</Label>
              <Input
                type="select"
                className="rounded-3"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="ADM">ADM • Quản trị viên / Ban giám hiệu</option>
                <option value="MGR">MGR • Phụ trách Bán trú</option>
                <option value="ACC">ACC • Kế toán Bán trú</option>
                <option value="PAR">PAR • Phụ huynh Học sinh</option>
              </Input>
            </FormGroup>
          </ModalBody>
          <ModalFooter className="border-top px-4 py-3">
            <Button color="light" className="btn-apple-secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button color="primary" type="submit" className="btn-apple-primary" disabled={modalSubmitting}>
              {modalSubmitting ? 'Đang tạo...' : 'Tạo Tài Khoản'}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </div>
  );
}
