import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  Button,
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
import { ApiClient } from '../../../services/apiClient';

export default function EligibilityScreen() {
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    eligible: 0,
    ineligible: 0,
    pendingReview: 0,
    eligibleRatePct: 0,
  });
  const [criteria, setCriteria] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  // Modal Manual Override
  const [overrideModal, setOverrideModal] = useState(false);
  const [targetStudent, setTargetStudent] = useState<any>(null);
  const [overrideStatus, setOverrideStatus] = useState<'ELIGIBLE' | 'INELIGIBLE' | 'PENDING_REVIEW'>('ELIGIBLE');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [critRes, studentsRes] = await Promise.all([
        ApiClient.getEligibilityCriteria(),
        ApiClient.getEligibilityStudents({
          className: selectedClass === 'ALL' ? undefined : selectedClass,
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        }),
      ]);

      if (critRes.success) {
        setCriteria(critRes.data);
      }

      if (studentsRes.success && studentsRes.data) {
        setStudents(studentsRes.data.records || []);
        setSummary(studentsRes.data.summary);
      }
    } catch (err: any) {
      console.warn('Lỗi kết nối API xét duyệt, sử dụng dữ liệu dự phòng:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBatch = async () => {
    setEvaluating(true);
    setNotification(null);
    try {
      const res = await ApiClient.runEligibilityBatch(selectedClass === 'ALL' ? undefined : selectedClass);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `✓ Đã tự động đánh giá cho ${res.data.evaluatedCount} học sinh. Đủ điều kiện: ${res.data.eligibleCount}, Không đạt: ${res.data.ineligibleCount}.`,
        });
        await loadData();
      }
    } catch (err: any) {
      setNotification({
        type: 'danger',
        message: `Lỗi khi chạy đánh giá tự động: ${err.message}`,
      });
    } finally {
      setEvaluating(false);
      setTimeout(() => setNotification(null), 7000);
    }
  };

  const openOverrideModal = (student: any) => {
    setTargetStudent(student);
    setOverrideStatus(student.status);
    setOverrideReason(student.overrideReason || '');
    setOverrideModal(true);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      alert('Vui lòng nhập lý do giải trình khi can thiệp thủ công.');
      return;
    }

    setSubmittingOverride(true);
    try {
      const res = await ApiClient.overrideEligibility({
        studentId: targetStudent.studentId,
        status: overrideStatus,
        reason: overrideReason.trim(),
      });
      if (res.success) {
        setNotification({
          type: 'success',
          message: `✓ Đã cập nhật trạng thái của học sinh ${targetStudent.fullName} thành [${overrideStatus}].`,
        });
        setOverrideModal(false);
        await loadData();
      }
    } catch (err: any) {
      alert(`Lỗi ghi đè: ${err.message}`);
    } finally {
      setSubmittingOverride(false);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      s.fullName?.toLowerCase().includes(kw) ||
      s.studentCode?.toLowerCase().includes(kw) ||
      s.className?.toLowerCase().includes(kw)
    );
  });

  return (
    <div className="semi-boarding-page p-4">
      {/* Editorial Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-end pb-3 mb-4 border-bottom">
        <div>
          <div className="text-muted small fw-semibold text-uppercase tracking-wider mb-1">
            Quản Lý Bán Trú • Tiêu Chí & Xét Duyệt (F-PAR-01)
          </div>
          <h2 className="fw-semibold text-dark mb-1" style={{ letterSpacing: '-0.03em' }}>
            Xét Duyệt Tư Cách Ăn Bán Trú Tự Động
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: '15px' }}>
            Hệ thống tự động đối soát hồ sơ học sinh theo <strong>Bộ 4 Tiêu Chuẩn Cốt Lõi</strong> (Khối lớp, Giấy y tế, Trạng thái học tập, An toàn dị ứng) trước khi đăng ký suất ăn.
          </p>
        </div>

        <div className="d-flex gap-2 mt-3 mt-md-0">
          <Button
            color="primary"
            className="btn-apple-primary px-3 py-2 fw-semibold"
            disabled={evaluating || loading}
            onClick={handleRunBatch}
          >
            {evaluating ? 'Đang chạy đánh giá...' : '⚡ Chạy Đánh Giá Tự Động (Batch Evaluation)'}
          </Button>
        </div>
      </div>

      {notification && (
        <Alert
          color={notification.type}
          className="border-0 shadow-sm rounded-3 py-2 px-3 mb-4 d-flex align-items-center"
        >
          <span className="fw-medium">{notification.message}</span>
        </Alert>
      )}

      {/* 4 Core Criteria & Summary Metric Cards */}
      <Row className="g-3 mb-4">
        <Col md="3">
          <Card className="apple-card h-100 p-3">
            <div className="text-muted small fw-semibold text-uppercase mb-1">Tỷ lệ đạt điều kiện</div>
            <div className="d-flex align-items-baseline gap-2">
              <h3 className="fw-bold text-dark mb-0">{summary.eligibleRatePct}%</h3>
              <span className="small text-muted">toàn trường</span>
            </div>
            <div className="small text-muted mt-2">
              <strong className="text-success">{summary.eligible}</strong> hợp lệ / {summary.total} hồ sơ
            </div>
          </Card>
        </Col>

        <Col md="3">
          <Card className="apple-card h-100 p-3">
            <div className="text-muted small fw-semibold text-uppercase mb-1">1. Tiêu chuẩn Khối Lớp</div>
            <div className="fw-semibold text-dark fs-6">
              Khối {criteria?.minGrade || 1} đến Khối {criteria?.maxGrade || 5}
            </div>
            <div className="small text-muted mt-1">Độ tuổi tiểu học chính quy</div>
            <span className="badge rounded-pill bg-light text-success border align-self-start mt-2 px-2 py-1">
              Bắt buộc 100%
            </span>
          </Card>
        </Col>

        <Col md="3">
          <Card className="apple-card h-100 p-3">
            <div className="text-muted small fw-semibold text-uppercase mb-1">2. Hồ sơ Khám Sức Khỏe</div>
            <div className="fw-semibold text-dark fs-6">Đã nộp phiếu y tế</div>
            <div className="small text-muted mt-1">Khám tổng quát & cam kết dinh dưỡng</div>
            <span className="badge rounded-pill bg-light text-success border align-self-start mt-2 px-2 py-1">
              Quy định Bộ Y Tế
            </span>
          </Card>
        </Col>

        <Col md="3">
          <Card className="apple-card h-100 p-3">
            <div className="text-muted small fw-semibold text-uppercase mb-1">3 & 4. Học tập & Dị ứng</div>
            <div className="fw-semibold text-dark fs-6">Hồ sơ Active & An toàn</div>
            <div className="small text-muted mt-1">Kiểm soát rủi ro sốc phản vệ</div>
            <span className="badge rounded-pill bg-light text-primary border align-self-start mt-2 px-2 py-1">
              An toàn tuyệt đối
            </span>
          </Card>
        </Col>
      </Row>

      {/* Filter and Toolbar Card */}
      <Card className="apple-card mb-4">
        <CardBody className="p-3">
          <Row className="g-2 align-items-center">
            <Col md="4">
              <Input
                type="text"
                placeholder="Tìm kiếm theo tên, mã học sinh, lớp..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="form-control"
              />
            </Col>

            <Col md="3">
              <Input
                type="select"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="form-select"
              >
                <option value="ALL">Tất cả lớp học (Khối 1 - 5)</option>
                <option value="1A">Lớp 1A</option>
                <option value="1B">Lớp 1B</option>
                <option value="2A">Lớp 2A</option>
                <option value="3A">Lớp 3A</option>
                <option value="4A">Lớp 4A</option>
                <option value="5A">Lớp 5A</option>
              </Input>
            </Col>

            <Col md="3">
              <Input
                type="select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="form-select"
              >
                <option value="ALL">Tất cả trạng thái xét duyệt</option>
                <option value="ELIGIBLE">Đủ điều kiện (ELIGIBLE)</option>
                <option value="INELIGIBLE">Không đủ điều kiện (INELIGIBLE)</option>
                <option value="PENDING_REVIEW">Chờ rà soát (PENDING_REVIEW)</option>
              </Input>
            </Col>

            <Col md="2" className="text-md-end text-muted small">
              Hiển thị: <strong>{filteredStudents.length}</strong> học sinh
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Main Student Eligibility Table */}
      <Card className="apple-card">
        <div className="p-3 px-4 border-bottom d-flex justify-content-between align-items-center">
          <div>
            <h5 className="fw-semibold text-dark mb-0">Danh Sách Học Sinh & Kết Quả Đánh Giá</h5>
            <small className="text-muted">Chi tiết tình trạng từng tiêu chuẩn và can thiệp phê duyệt</small>
          </div>
          <div className="d-flex gap-2">
            <span className="badge rounded-pill bg-success-subtle text-success border px-2 py-1">
              Đạt: {summary.eligible}
            </span>
            <span className="badge rounded-pill bg-danger-subtle text-danger border px-2 py-1">
              Không đạt: {summary.ineligible}
            </span>
          </div>
        </div>

        <CardBody className="p-0">
          <Table responsive hover className="apple-table mb-0 align-middle">
            <thead>
              <tr>
                <th className="ps-4">Học Sinh</th>
                <th>Lớp</th>
                <th>1. Khối Lớp</th>
                <th>2. Giấy Y Tế</th>
                <th>3. Hồ Sơ</th>
                <th>4. Cảnh Báo Dị Ứng</th>
                <th>Kết Quả Tư Cách</th>
                <th className="text-end pe-4">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-muted">
                    Không tìm thấy học sinh nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((item) => {
                  const bd = item.criteriaBreakdown || {};
                  const isEligible = item.status === 'ELIGIBLE';
                  const isPending = item.status === 'PENDING_REVIEW';

                  return (
                    <tr key={item.studentId}>
                      <td className="ps-4">
                        <div className="fw-medium text-dark">{item.fullName}</div>
                        <div className="small text-muted">{item.studentCode}</div>
                      </td>
                      <td>
                        <span className="badge rounded-pill bg-light text-dark border px-2 py-1">
                          {item.className}
                        </span>
                      </td>

                      {/* Criteria 1: Grade */}
                      <td>
                        {bd.gradeCheck?.passed ? (
                          <span className="text-success small fw-medium">✓ Đạt ({item.grade})</span>
                        ) : (
                          <span className="text-danger small fw-medium">✗ Lỗi</span>
                        )}
                      </td>

                      {/* Criteria 2: Health Clearance */}
                      <td>
                        {item.hasHealthClearance ? (
                          <span className="badge rounded-pill bg-success-subtle text-success border px-2 py-1">
                            ✓ Đã nộp
                          </span>
                        ) : (
                          <span className="badge rounded-pill bg-danger-subtle text-danger border px-2 py-1">
                            ✗ Chưa nộp
                          </span>
                        )}
                      </td>

                      {/* Criteria 3: Active Status */}
                      <td>
                        {item.isActive ? (
                          <span className="text-success small">Đang học</span>
                        ) : (
                          <span className="text-muted small">Tạm ngưng</span>
                        )}
                      </td>

                      {/* Criteria 4: Allergy Safety */}
                      <td>
                        {item.hasSevereAllergyWarning ? (
                          <span className="badge rounded-pill bg-warning-subtle text-dark border px-2 py-1" title={item.allergies?.join(', ')}>
                            ⚠ Nguy cơ sốc
                          </span>
                        ) : item.allergies?.length > 0 ? (
                          <span className="small text-muted" title={item.allergies.join(', ')}>
                            Có dị ứng nhẹ ({item.allergies.length})
                          </span>
                        ) : (
                          <span className="text-muted small">Không dị ứng</span>
                        )}
                      </td>

                      {/* Final Status */}
                      <td>
                        {isEligible ? (
                          <span className="badge rounded-pill bg-success text-white px-3 py-1">
                            ĐỦ ĐIỀU KIỆN
                          </span>
                        ) : isPending ? (
                          <span className="badge rounded-pill bg-warning text-dark px-3 py-1">
                            CHỜ RÀ SOÁT
                          </span>
                        ) : (
                          <div>
                            <span className="badge rounded-pill bg-danger text-white px-3 py-1">
                              KHÔNG ĐỦ ĐK
                            </span>
                            {item.ineligibilityReasons?.length > 0 && (
                              <div className="small text-danger mt-1" style={{ fontSize: '11px', maxWidth: '180px' }}>
                                {item.ineligibilityReasons[0]}
                              </div>
                            )}
                          </div>
                        )}

                        {item.isManualOverride && (
                          <div className="small text-primary mt-1" style={{ fontSize: '11px' }}>
                            (Đã ghi đè tay)
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-end pe-4">
                        <Button
                          color="link"
                          className="btn-apple-secondary text-primary py-1 px-2 text-decoration-none small fw-medium"
                          onClick={() => openOverrideModal(item)}
                        >
                          Duyệt tay / Ghi đè
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {/* Modal Manual Override */}
      <Modal isOpen={overrideModal} toggle={() => setOverrideModal(false)} centered>
        <Form onSubmit={handleSaveOverride}>
          <ModalHeader toggle={() => setOverrideModal(false)}>
            <span className="fw-semibold text-dark">Can Thiệp Thủ Công Tư Cách Bán Trú</span>
          </ModalHeader>
          <ModalBody className="p-4">
            {targetStudent && (
              <>
                <div className="p-3 bg-light rounded mb-3 small">
                  <div><strong>Học sinh:</strong> {targetStudent.fullName} ({targetStudent.studentCode})</div>
                  <div><strong>Lớp:</strong> {targetStudent.className} • Khối {targetStudent.grade}</div>
                  <div>
                    <strong>Tình trạng hiện tại:</strong>{' '}
                    <span className={targetStudent.status === 'ELIGIBLE' ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                      {targetStudent.status}
                    </span>
                  </div>
                </div>

                <FormGroup>
                  <Label className="fw-semibold text-dark small">Quyết định phê duyệt tư cách:</Label>
                  <Input
                    type="select"
                    value={overrideStatus}
                    onChange={(e: any) => setOverrideStatus(e.target.value)}
                    className="form-select"
                  >
                    <option value="ELIGIBLE">Đủ điều kiện tham gia bán trú (ELIGIBLE)</option>
                    <option value="INELIGIBLE">Không đủ điều kiện (INELIGIBLE)</option>
                    <option value="PENDING_REVIEW">Chờ rà soát bổ sung hồ sơ (PENDING_REVIEW)</option>
                  </Input>
                </FormGroup>

                <FormGroup>
                  <Label className="fw-semibold text-dark small">Lý do giải trình can thiệp (Bắt buộc):</Label>
                  <Input
                    type="textarea"
                    rows={3}
                    placeholder="Ví dụ: Phụ huynh đã ký cam kết nộp giấy khám sức khỏe trước thứ Sáu, cho phép tạm thời ghi danh..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    required
                  />
                  <small className="text-muted">
                    Lý do sẽ được lưu vào biên bản kiểm toán (Audit Trail) cùng tài khoản phê duyệt.
                  </small>
                </FormGroup>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setOverrideModal(false)} disabled={submittingOverride}>
              Hủy
            </Button>
            <Button color="primary" type="submit" disabled={submittingOverride}>
              {submittingOverride ? 'Đang lưu...' : 'Lưu Quyết Định'}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </div>
  );
}
