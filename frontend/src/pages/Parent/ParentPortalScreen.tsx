import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Table,
  Badge,
  Input,
  FormGroup,
  Label,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from 'reactstrap';
import { toast } from 'react-toastify';
import { ApiClient } from '../../services/apiClient';
import { AllergenChip } from '../../components/SemiBoarding/AllergenChip';

interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  className: string;
  allergies: string[];
  status: 'PRESENT' | 'EXCUSED_ABSENCE' | 'UNEXCUSED_ABSENCE';
}

interface Dish {
  id: string;
  name: string;
  calories: number;
  allergens: string[];
}

interface DailyMenu {
  id: string;
  date: string;
  dayOfWeek: string;
  title: string;
  description?: string;
  totalCalories: number;
  dishes: Dish[];
}

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  studentId: string;
  billingMonth: string;
  grossAmount: number;
  creditAmount: number;
  netAmount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  vietQrUrl: string;
  bankAccount: {
    bankId: string;
    bankName: string;
    accountNo: string;
    accountName: string;
  };
  paidAt?: string | null;
  createdAt: string;
  lines: InvoiceLine[];
}

export default function ParentPortalScreen() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'menu' | 'finance'>('attendance');
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Absence State
  const [absenceDate, setAbsenceDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [absenceReason, setAbsenceReason] = useState('Gia đình có việc bận / Khám sức khỏe');
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [submittingAbsence, setSubmittingAbsence] = useState(false);

  // Menu State
  const [weeklyMenu, setWeeklyMenu] = useState<DailyMenu[]>([]);

  // Finance State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(false);

  useEffect(() => {
    loadChildren();
    loadWeeklyMenu();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadChildData(selectedChild.id);
    }
  }, [selectedChild]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getMyChildren();
      if (res.data && res.data.length > 0) {
        setChildren(res.data);
        setSelectedChild(res.data[0]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Không thể tải thông tin con: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadChildData = async (studentId: string) => {
    try {
      const [histRes, invRes] = await Promise.all([
        ApiClient.getAttendanceHistory(studentId),
        ApiClient.getStudentInvoices(studentId),
      ]);
      setAttendanceHistory(histRes.data || []);
      setInvoices(invRes.data || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadWeeklyMenu = async () => {
    try {
      const res = await ApiClient.getWeeklyMenu();
      setWeeklyMenu(res.data || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAbsenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;

    try {
      setSubmittingAbsence(true);
      const res = await ApiClient.requestMealAbsence({
        studentId: selectedChild.id,
        date: absenceDate,
        reason: absenceReason,
      });

      toast.success(res.message || 'Đã gửi đơn báo nghỉ ăn bán trú thành công!');
      loadChildData(selectedChild.id);
    } catch (err: any) {
      toast.error(err.message || 'Gửi đơn thất bại. Vui lòng kiểm tra lại mốc cắt giờ 08:00.');
    } finally {
      setSubmittingAbsence(false);
    }
  };

  const handleOpenQrModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setQrModalOpen(true);
  };

  const handleSimulatePayment = async () => {
    if (!selectedInvoice) return;
    try {
      setPayingInvoice(true);
      await ApiClient.payInvoice(selectedInvoice.id);
      toast.success('Xác nhận thanh toán học phí bán trú thành công qua VietQR!');
      setQrModalOpen(false);
      if (selectedChild) {
        loadChildData(selectedChild.id);
      }
    } catch (err: any) {
      toast.error('Lỗi xác nhận thanh toán: ' + err.message);
    } finally {
      setPayingInvoice(false);
    }
  };

  const hasAllergyConflict = (dishAllergens: string[]) => {
    if (!selectedChild?.allergies || selectedChild.allergies.length === 0) return false;
    return dishAllergens.some((allg) =>
      selectedChild.allergies.some(
        (childAllg) =>
          allg.toLowerCase().includes(childAllg.toLowerCase()) ||
          childAllg.toLowerCase().includes(allg.toLowerCase())
      )
    );
  };

  // Metrics summary
  const totalDaysEating = attendanceHistory.filter((h) => h.status === 'PRESENT').length;
  const totalExcused = attendanceHistory.filter((h) => h.status === 'EXCUSED_ABSENCE').length;
  const pendingInvoiceCount = invoices.filter((i) => i.status === 'PENDING').length;
  const pendingAmount = invoices
    .filter((i) => i.status === 'PENDING')
    .reduce((sum, inv) => sum + inv.netAmount, 0);

  if (loading) {
    return (
      <div className="semi-boarding-page p-4 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">Đang tải Cổng Phụ Huynh Bán Trú...</p>
      </div>
    );
  }

  return (
    <div className="semi-boarding-page p-4">
      {/* 1. Editorial Header (Chuẩn Apple Design như các trang khác) */}
      <div className="d-flex flex-wrap justify-content-between align-items-end pb-3 mb-4 border-bottom">
        <div>
          <div className="text-muted small fw-semibold text-uppercase tracking-wider mb-1">
            Cổng Phụ Huynh • Khẩu Phần & Bán Trú Học Đường
          </div>
          <h2 className="fw-semibold text-dark mb-1" style={{ letterSpacing: '-0.03em' }}>
            Theo Dõi Suất Ăn & Học Phí Bán Trú
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: '15px' }}>
            Tra cứu thực đơn tuần, gửi đơn báo vắng ăn trước 08:00 sáng và thanh toán học phí qua Napas VietQR.
          </p>
        </div>

        {/* Child Selector Pills */}
        <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
          <span className="text-muted small fw-semibold">Học sinh:</span>
          <div className="d-inline-flex p-1 bg-white rounded-pill border shadow-sm">
            {children.map((child) => {
              const isSelected = selectedChild?.id === child.id;
              return (
                <button
                  key={child.id}
                  type="button"
                  className={`btn btn-sm px-3 rounded-pill fw-medium transition-all ${
                    isSelected
                      ? 'btn-apple-primary shadow-none'
                      : 'btn-link text-dark text-decoration-none'
                  }`}
                  onClick={() => setSelectedChild(child)}
                  style={{ fontSize: '13px' }}
                >
                  {child.fullName} ({child.className})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Metric KPI Tiles Harmonized */}
      <Row className="g-3 mb-4">
        <Col md="3">
          <div className="metric-tile">
            <div className="metric-tile-label">Ăn bán trú (14 ngày)</div>
            <div className="metric-tile-value text-success">{totalDaysEating} buổi</div>
            <div className="metric-tile-sub">Điểm danh có mặt tại lớp</div>
          </div>
        </Col>
        <Col md="3">
          <div className="metric-tile">
            <div className="metric-tile-label">Đơn báo nghỉ có phép</div>
            <div className="metric-tile-value text-primary">{totalExcused} buổi</div>
            <div className="metric-tile-sub">Được hoàn tiền ăn bán trú</div>
          </div>
        </Col>
        <Col md="3">
          <div className="metric-tile">
            <div className="metric-tile-label">Hồ sơ dị ứng thực phẩm</div>
            <div className="metric-tile-value text-dark" style={{ fontSize: '18px', paddingTop: '6px' }}>
              {selectedChild?.allergies && selectedChild.allergies.length > 0 ? (
                <AllergenChip allergens={selectedChild.allergies} />
              ) : (
                <span className="badge rounded-pill bg-light text-success border px-2 py-1">
                  Không dị ứng
                </span>
              )}
            </div>
            <div className="metric-tile-sub">Nhà bếp kiểm soát trước khi ra món</div>
          </div>
        </Col>
        <Col md="3">
          <div className="metric-tile">
            <div className="metric-tile-label">Học phí bán trú chờ nộp</div>
            <div className="metric-tile-value text-danger" style={{ fontSize: '22px' }}>
              {pendingAmount > 0 ? `${pendingAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
            </div>
            <div className="metric-tile-sub">
              {pendingInvoiceCount > 0 ? `${pendingInvoiceCount} hóa đơn chưa nộp` : 'Đã thanh toán đầy đủ'}
            </div>
          </div>
        </Col>
      </Row>

      {/* 3. Segmented Navigation Bar (Apple Style - Đồng nhất với toàn bộ hệ thống) */}
      <div
        className="d-flex flex-wrap gap-2 align-items-center mb-4 p-2 bg-white rounded-pill border shadow-sm"
        style={{ width: 'fit-content' }}
      >
        <button
          type="button"
          className={`btn btn-sm px-4 rounded-pill fw-medium transition-all ${
            activeTab === 'attendance'
              ? 'btn-apple-primary shadow-none'
              : 'btn-link text-dark text-decoration-none'
          }`}
          onClick={() => setActiveTab('attendance')}
          style={{ fontSize: '13px' }}
        >
          <i className="pe-7s-date me-1" /> Điểm Danh & Báo Nghỉ Suất Ăn
        </button>

        <button
          type="button"
          className={`btn btn-sm px-4 rounded-pill fw-medium transition-all ${
            activeTab === 'menu'
              ? 'btn-apple-primary shadow-none'
              : 'btn-link text-dark text-decoration-none'
          }`}
          onClick={() => setActiveTab('menu')}
          style={{ fontSize: '13px' }}
        >
          <i className="pe-7s-cup me-1" /> Thực Đơn Tuần & Dinh Dưỡng
        </button>

        <button
          type="button"
          className={`btn btn-sm px-4 rounded-pill fw-medium transition-all ${
            activeTab === 'finance'
              ? 'btn-apple-primary shadow-none'
              : 'btn-link text-dark text-decoration-none'
          }`}
          onClick={() => setActiveTab('finance')}
          style={{ fontSize: '13px' }}
        >
          <i className="pe-7s-wallet me-1" /> Học Phí Bán Trú & Napas VietQR
        </button>
      </div>

      {/* 4. Tab Content */}
      {/* TAB 1: ATTENDANCE & ABSENCE */}
      {activeTab === 'attendance' && (
        <Row className="g-4">
          <Col lg="5">
            <Card className="apple-card mb-4">
              <div className="p-4 border-bottom">
                <span className="text-muted small fw-semibold text-uppercase">Quy trình báo vắng ăn</span>
                <h5 className="fw-semibold text-dark mt-1 mb-0">Đơn Báo Nghỉ Ăn Bán Trú</h5>
              </div>
              <CardBody className="p-4">
                <div className="p-3 mb-3 rounded-3 border bg-light d-flex align-items-start gap-2">
                  <span className="text-warning fs-5">⏰</span>
                  <div className="small text-muted">
                    <strong className="text-dark d-block mb-1">Mốc Cắt Giờ 08:00 Sáng</strong>
                    Đơn báo nghỉ hợp lệ trước 08:00 sáng hàng ngày sẽ được nhà trường trừ suất ăn và
                    hoàn lại <strong>35.000đ/bữa</strong> vào hóa đơn tiền ăn của tháng tiếp theo.
                  </div>
                </div>

                <form onSubmit={handleAbsenceSubmit}>
                  <FormGroup className="mb-3">
                    <Label className="text-muted small fw-semibold">NGÀY XIN NGHỈ ĂN</Label>
                    <Input
                      type="date"
                      value={absenceDate}
                      onChange={(e) => setAbsenceDate(e.target.value)}
                      required
                      className="form-control"
                      style={{ borderRadius: '8px' }}
                    />
                  </FormGroup>

                  <FormGroup className="mb-4">
                    <Label className="text-muted small fw-semibold">LÝ DO NGHỈ ĂN</Label>
                    <Input
                      type="select"
                      value={absenceReason}
                      onChange={(e) => setAbsenceReason(e.target.value)}
                      className="form-select"
                      style={{ borderRadius: '8px' }}
                    >
                      <option value="Gia đình có việc bận / Khám sức khỏe">
                        Gia đình có việc bận / Khám sức khỏe
                      </option>
                      <option value="Học sinh bị ốm / sốt xin nghỉ điều trị">
                        Học sinh bị ốm / sốt xin nghỉ điều trị
                      </option>
                      <option value="Phụ huynh đón học sinh về ăn trưa tại nhà">
                        Phụ huynh đón học sinh về ăn trưa tại nhà
                      </option>
                      <option value="Lý do khác">Lý do khác</option>
                    </Input>
                  </FormGroup>

                  <Button
                    type="submit"
                    disabled={submittingAbsence}
                    className="btn btn-apple-primary w-100 py-2"
                  >
                    {submittingAbsence ? 'Đang gửi đơn...' : 'Xác Nhận Gửi Đơn Báo Nghỉ'}
                  </Button>
                </form>
              </CardBody>
            </Card>
          </Col>

          <Col lg="7">
            <Card className="apple-card mb-4">
              <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted small fw-semibold text-uppercase">Lịch sử điểm danh</span>
                  <h5 className="fw-semibold text-dark mt-1 mb-0">Nhật Ký Suất Ăn Gần Đây</h5>
                </div>
                <span className="badge rounded-pill bg-light text-muted border px-2 py-1 small">
                  14 ngày gần nhất
                </span>
              </div>
              <div className="table-responsive">
                <Table className="apple-table mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Trạng thái suất ăn</th>
                      <th>Khấu trừ tiền ăn</th>
                      <th>Ghi chú kiểm soát</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center p-4 text-muted">
                          Chưa có dữ liệu điểm danh
                        </td>
                      </tr>
                    ) : (
                      attendanceHistory.map((item, idx) => (
                        <tr key={idx}>
                          <td className="fw-semibold text-dark">{item.date}</td>
                          <td>
                            {item.status === 'PRESENT' ? (
                              <span className="badge rounded-pill bg-light text-success border px-2 py-1 fw-medium">
                                ● Ăn bán trú đầy đủ
                              </span>
                            ) : item.status === 'EXCUSED_ABSENCE' ? (
                              <span className="badge rounded-pill bg-light text-primary border px-2 py-1 fw-medium">
                                ● Nghỉ ăn có phép
                              </span>
                            ) : (
                              <span className="badge rounded-pill bg-light text-danger border px-2 py-1 fw-medium">
                                ● Vắng không phép
                              </span>
                            )}
                          </td>
                          <td>
                            {item.status === 'EXCUSED_ABSENCE' ? (
                              <span className="text-success fw-semibold">+35.000đ (Hoàn trả)</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="small text-muted">
                            {item.lockedAt ? 'Đã khóa sổ 13:00' : 'Hệ thống tự động ghi nhận'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* TAB 2: WEEKLY MENU & NUTRITION */}
      {activeTab === 'menu' && (
        <Row className="g-4">
          {weeklyMenu.map((dayMenu) => (
            <Col lg="4" md="6" key={dayMenu.id}>
              <Card className="apple-card h-100">
                <div className="p-3 px-4 border-bottom d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="fw-semibold text-dark mb-0">{dayMenu.dayOfWeek}</h6>
                    <span className="text-muted small">{dayMenu.date}</span>
                  </div>
                  <span className="badge rounded-pill bg-light text-primary border px-2 py-1 fw-medium">
                    {dayMenu.totalCalories} kcal
                  </span>
                </div>
                <CardBody className="p-4">
                  <div className="text-muted small fw-semibold mb-3">{dayMenu.title}</div>
                  <div className="d-flex flex-column gap-2">
                    {dayMenu.dishes.map((dish) => {
                      const isConflict = hasAllergyConflict(dish.allergens);
                      return (
                        <div
                          key={dish.id}
                          className={`p-3 rounded-3 border transition-all ${
                            isConflict
                              ? 'border-danger'
                              : 'border-light bg-light'
                          }`}
                          style={isConflict ? { backgroundColor: '#fff5f5' } : {}}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-1">
                            <span className={`fw-medium ${isConflict ? 'text-danger' : 'text-dark'}`}>
                              {dish.name}
                            </span>
                            <span className="text-muted small">{dish.calories} kcal</span>
                          </div>

                          {dish.allergens.length > 0 && (
                            <div className="mt-1 d-flex flex-wrap gap-1">
                              {dish.allergens.map((alg, i) => (
                                <span
                                  key={i}
                                  className={`badge rounded-pill px-2 py-1 ${
                                    selectedChild?.allergies?.some((ca) =>
                                      alg.toLowerCase().includes(ca.toLowerCase())
                                    )
                                      ? 'bg-danger text-white'
                                      : 'bg-white text-muted border'
                                  }`}
                                  style={{ fontSize: '11px' }}
                                >
                                  {alg}
                                </span>
                              ))}
                            </div>
                          )}

                          {isConflict && (
                            <div className="text-danger small mt-2 fw-semibold d-flex align-items-center gap-1">
                              <span>⚠️</span>
                              <span>Trùng với dị ứng của {selectedChild?.fullName}!</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* TAB 3: TUITION & VIETQR */}
      {activeTab === 'finance' && (
        <Card className="apple-card mb-4">
          <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
            <div>
              <span className="text-muted small fw-semibold text-uppercase">Kế toán & Thu học phí</span>
              <h5 className="fw-semibold text-dark mt-1 mb-0">Hóa Đơn Bán Trú & Thanh Toán Napas VietQR</h5>
            </div>
            <span className="badge rounded-pill bg-light text-success border px-3 py-2 fw-medium">
              Chuyển khoản 24/7 Napas 2.0
            </span>
          </div>
          <div className="table-responsive">
            <Table className="apple-table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Kỳ Hóa Đơn</th>
                  <th>Tổng Chi Phí</th>
                  <th>Hoàn Tiền Vắng Ăn</th>
                  <th>Số Tiền Cần Đóng</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-muted">
                      Chưa có hóa đơn bán trú
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="fw-semibold text-dark">Tháng {inv.billingMonth}</td>
                      <td>{inv.grossAmount.toLocaleString('vi-VN')} đ</td>
                      <td className="text-success fw-semibold">
                        {inv.creditAmount > 0
                          ? `-${inv.creditAmount.toLocaleString('vi-VN')} đ`
                          : '0 đ'}
                      </td>
                      <td className="fw-bold text-dark fs-6">
                        {inv.netAmount.toLocaleString('vi-VN')} đ
                      </td>
                      <td>
                        {inv.status === 'PAID' ? (
                          <span className="badge rounded-pill bg-light text-success border px-3 py-2 fw-medium">
                            ✓ Đã thanh toán
                          </span>
                        ) : (
                          <span className="badge rounded-pill bg-light text-danger border px-3 py-2 fw-medium">
                            ● Chờ nộp tiền
                          </span>
                        )}
                      </td>
                      <td>
                        {inv.status === 'PAID' ? (
                          <span className="text-muted small">
                            Đã quyết toán lúc {new Date(inv.paidAt || '').toLocaleDateString('vi-VN')}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="btn-apple-primary"
                            onClick={() => handleOpenQrModal(inv)}
                          >
                            Quét VietQR →
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card>
      )}

      {/* MODAL VIETQR PAYMENT (Apple Card Styled Modal) */}
      <Modal isOpen={qrModalOpen} toggle={() => setQrModalOpen(!qrModalOpen)} size="md" centered>
        <ModalHeader toggle={() => setQrModalOpen(!qrModalOpen)}>
          <div className="fw-semibold text-dark">Thanh Toán Bán Trú Qua Napas VietQR</div>
        </ModalHeader>
        <ModalBody className="text-center p-4">
          {selectedInvoice && (
            <div>
              <div className="mb-4">
                <img
                  src={selectedInvoice.vietQrUrl}
                  alt="VietQR Code"
                  className="img-fluid rounded-3 border p-2 bg-white shadow-sm"
                  style={{ maxHeight: '280px' }}
                />
              </div>

              <div className="p-3 rounded-3 border bg-light text-start mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Đơn vị thụ hưởng:</span>
                  <span className="fw-medium text-dark">{selectedInvoice.bankAccount.accountName}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Ngân hàng:</span>
                  <span className="fw-medium text-dark">{selectedInvoice.bankAccount.bankName}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Số tài khoản:</span>
                  <span className="fw-bold text-primary">{selectedInvoice.bankAccount.accountNo}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Số tiền:</span>
                  <span className="fw-bold text-danger fs-5">
                    {selectedInvoice.netAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Nội dung chuyển:</span>
                  <span className="badge rounded-pill bg-dark text-white px-2 py-1">
                    HOCPHI {selectedInvoice.studentId.slice(0, 6).toUpperCase()} {selectedInvoice.billingMonth.replace('-', '')}
                  </span>
                </div>
              </div>

              <p className="text-muted small mb-0">
                Mở ứng dụng ngân hàng bất kỳ (MB, Vietcombank, Techcombank...) để quét mã thanh toán tức thì.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="d-flex justify-content-between">
          <Button color="light" className="btn-apple-secondary" onClick={() => setQrModalOpen(false)}>
            Đóng
          </Button>
          <Button
            className="btn-apple-primary"
            disabled={payingInvoice}
            onClick={handleSimulatePayment}
          >
            {payingInvoice ? 'Đang xử lý...' : 'Mô Phỏng Thanh Toán Thành Công'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
