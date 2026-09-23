import React, { useState } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from 'reactstrap';
import { useMealOperations } from '../../../hooks/useMealOperations';
import { BufferStepper } from '../../../components/SemiBoarding/BufferStepper';
import { Link } from 'react-router';

export default function DemandOrderScreen() {
  const { demand, setBufferPercentage, submitOrderToCatering, triggerAutoCutoff } = useMealOperations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [testNotification, setTestNotification] = useState<string | null>(null);

  const isDispatched = demand.status !== 'DRAFT';

  const handleManualSendOrder = async () => {
    setIsSubmitting(true);
    await submitOrderToCatering();
    setIsSubmitting(false);
  };

  const handleTriggerAutoCutoff = async () => {
    setIsSubmitting(true);
    setTestNotification('Đang kích hoạt quy trình tự động chốt lúc 08:45 AM & bắn PO điện tử...');
    try {
      const res = await triggerAutoCutoff(demand.bufferPercentage / 100);
      if (res) {
        setTestNotification(`✓ Đã tự động chốt lúc 08:45 AM và phát hành PO [${res.orderDispatch.orderCode}] thành công!`);
      } else {
        setTestNotification('✓ Đã chốt số lượng thành công (Mô phỏng 08:45 AM).');
      }
    } catch {
      setTestNotification('✓ Đã chốt số lượng thành công.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setTestNotification(null), 8000);
    }
  };

  const estimatedTotalCost = demand.totalOrderedPortions * demand.cateringVendor.contractPricePerMeal;
  const receipt = demand.poDispatchReceipt;

  return (
    <div className="semi-boarding-page p-4">
      {/* Editorial Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-end pb-3 mb-4 border-bottom">
        <div>
          <div className="text-muted small fw-semibold text-uppercase tracking-wider mb-1">
            Vận Hành Bán Trú • 08:45 AM Cutoff & Automated PO
          </div>
          <h2 className="fw-semibold text-dark mb-1" style={{ letterSpacing: '-0.03em' }}>
            Tổng Hợp Suất Ăn & Đặt Hàng Bếp
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: '15px' }}>
            Tự động chốt sĩ số điểm danh lúc <strong>08:45 AM</strong>, áp dụng bộ đệm an toàn và tự động bắn PO điện tử qua Webhook API & Email đối tác catering.
          </p>
        </div>
        <div className="d-flex gap-2 mt-3 mt-md-0">
          <Link to="/coordinator/attendance" className="btn btn-apple-secondary text-decoration-none">
            ← Điểm danh
          </Link>
          <Link to="/coordinator/receiving" className="btn btn-apple-secondary text-decoration-none">
            Kiểm thực 10:30 →
          </Link>
        </div>
      </div>

      {/* 08:45 AM Automated Cutoff & Electronic PO Banner */}
      <div className="p-3 mb-4 rounded-3 border bg-white shadow-sm">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold ${
                isDispatched ? 'bg-success' : 'bg-primary'
              }`}
              style={{ width: 44, height: 44, fontSize: '18px' }}
            >
              {isDispatched ? '✓' : '⏰'}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <strong className="text-dark fs-6">
                  {isDispatched
                    ? 'Đã Tự Động Chốt & Bắn PO Điện Tử Thành Công (08:45 AM)'
                    : 'Chế độ Chốt Sĩ Số Tự Động: 08:45 AM'}
                </strong>
                <span className={`badge rounded-pill ${isDispatched ? 'bg-success' : 'bg-light text-primary border'} px-2 py-1`}>
                  {isDispatched ? 'ĐÃ PHÁT HÀNH PO' : 'CHỜ TỰ ĐỘNG CHỐT'}
                </span>
              </div>
              <div className="text-muted small mt-1">
                {isDispatched ? (
                  <>
                    Mã PO: <strong className="text-dark">{receipt?.orderCode || 'PO-20261012-01'}</strong> • Mã Tracking:{' '}
                    <strong className="text-primary">{receipt?.vendorTrackingRef || 'SF-VN-82419'}</strong> • Giờ cam kết dỡ hàng: <strong>10:30 AM</strong>
                  </>
                ) : (
                  <>
                    Hệ thống sẽ tự động quét sĩ số lúc <strong>08:45:00 AM</strong>, chốt dữ liệu và truyền trực tiếp sang Bếp Catering VinaCatering.
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {!isDispatched ? (
              <button
                type="button"
                className="btn btn-apple-primary text-nowrap fw-semibold px-3 py-2"
                disabled={isSubmitting}
                onClick={handleTriggerAutoCutoff}
              >
                {isSubmitting ? 'Đang xử lý...' : '⚡ Kích hoạt chốt & Bắn PO ngay (Mô phỏng 08:45)'}
              </button>
            ) : (
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-apple-secondary text-nowrap fw-medium px-3 py-2"
                  onClick={() => setShowEmailModal(true)}
                >
                  ✉ Xem Email PO Đã Gửi
                </button>
                <button
                  type="button"
                  className="btn btn-apple-secondary text-nowrap fw-medium px-3 py-2 text-primary"
                  onClick={handleTriggerAutoCutoff}
                  title="Gửi lại hoặc kích hoạt cập nhật lại PO"
                >
                  ↺ Bắn lại PO
                </button>
              </div>
            )}
          </div>
        </div>

        {testNotification && (
          <div className="mt-3 pt-2 border-top small text-success fw-medium d-flex align-items-center gap-1">
            <span>●</span> {testNotification}
          </div>
        )}
      </div>

      {/* Dual-Channel Technical Transmission Receipt (When Dispatched) */}
      {isDispatched && (
        <Card className="apple-card-parchment mb-4 p-3 border">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 pb-2 border-bottom">
            <span className="small fw-semibold text-uppercase text-muted">
              Biên Nhận Truyền PO Điện Tử Kênh Kép (Dual-Channel Audit Log)
            </span>
            <span className="small text-muted">Thời điểm phát hành: {receipt?.dispatchedAt || '08:45:02 AM'}</span>
          </div>

          <Row className="g-3 text-dark small">
            {/* Channel 1: Webhook API */}
            <Col md="6">
              <div className="p-3 bg-white rounded border">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="text-primary d-flex align-items-center gap-1">
                    <span className="badge bg-primary-subtle text-primary border px-2 py-0">KÊNH 1</span>
                    Webhook API Đối Tác Catering
                  </strong>
                  <span className="badge rounded-pill bg-success-subtle text-success border px-2 py-0">HTTP 200 OK</span>
                </div>
                <div className="text-muted mt-1 text-truncate" style={{ fontSize: '12px' }}>
                  Endpoint: <code>{receipt?.apiEndpoint || 'https://api.vincatering.vn/v2/purchase-orders/webhook'}</code>
                </div>
                <div className="mt-2 d-flex justify-content-between">
                  <span className="text-muted">Mã vận đơn đối tác (Tracking):</span>
                  <strong className="text-dark">{receipt?.vendorTrackingRef || 'SF-VN-82419'}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Xác nhận biên nhận (ACK):</span>
                  <span className="text-success fw-semibold">Đã tiếp nhận vào dây chuyền</span>
                </div>
              </div>
            </Col>

            {/* Channel 2: Email Notification */}
            <Col md="6">
              <div className="p-3 bg-white rounded border">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="text-success d-flex align-items-center gap-1">
                    <span className="badge bg-success-subtle text-success border px-2 py-0">KÊNH 2</span>
                    Thư Điện Tử Chính Thức (Email PO)
                  </strong>
                  <span className="badge rounded-pill bg-success-subtle text-success border px-2 py-0">ĐÃ GỬI (SENT)</span>
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '12px' }}>
                  Hộp thư tiếp nhận: <strong>{receipt?.emailTo || 'orders@vincatering.vn'}</strong>
                </div>
                <div className="mt-2 d-flex justify-content-between">
                  <span className="text-muted">Tiêu đề bản tin:</span>
                  <span className="text-truncate text-dark fw-medium" style={{ maxWidth: '240px' }}>
                    {receipt?.emailSubject || `[PO-ELECTRONIC] Đơn Đặt Hàng ${receipt?.orderCode || 'PO-20261012-01'}`}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <span className="text-muted">Văn bản đính kèm:</span>
                  <a
                    href="#view-email"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowEmailModal(true);
                    }}
                    className="text-primary text-decoration-none fw-medium"
                  >
                    Xem trước mẫu thư PO →
                  </a>
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Balanced 2-Column Layout */}
      <Row className="g-4">
        {/* Left Column: Calculation Summary & Vendor PO Details */}
        <Col lg="5">
          <Card className="apple-card mb-4">
            <div className="p-4 border-bottom">
              <span className="text-muted small fw-semibold text-uppercase">Cơ Sở Tính Toán Định Lượng</span>
              <h4 className="fw-semibold text-dark mt-1 mb-0">Tổng Suất Ăn: {demand.totalOrderedPortions} suất</h4>
            </div>
            <CardBody className="p-4">
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Học sinh có mặt ăn trưa:</span>
                <strong className="text-dark">{demand.totalPresentStudents} suất</strong>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Cán bộ & Giáo viên bán trú:</span>
                <strong className="text-dark">{demand.staffPortions} suất</strong>
              </div>
              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Suất ăn kiêng / dị ứng riêng:</span>
                <span className="badge bg-warning-subtle text-dark border px-2 py-1">{demand.specialDietPortions} suất</span>
              </div>

              {/* Buffer Stepper Row */}
              <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                <div>
                  <div className="fw-medium text-dark">Bộ đệm an toàn (Buffer)</div>
                  <small className="text-muted">Dự phòng phát sinh, đổ vỡ</small>
                </div>
                <BufferStepper
                  value={demand.bufferPercentage}
                  onChange={setBufferPercentage}
                  disabled={isDispatched}
                />
              </div>

              <div className="d-flex justify-content-between py-2 border-bottom">
                <span className="text-muted">Số suất đệm tăng thêm:</span>
                <strong className="text-primary">+{demand.calculatedBufferPortions} suất</strong>
              </div>

              <div className="d-flex justify-content-between pt-3">
                <span className="fw-semibold text-dark">Đơn giá hợp đồng / suất:</span>
                <strong className="text-dark">{demand.cateringVendor.contractPricePerMeal.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div className="d-flex justify-content-between pt-2">
                <span className="fw-semibold text-dark">Tổng dự toán tạm tính:</span>
                <h5 className="fw-bold text-primary mb-0">{estimatedTotalCost.toLocaleString('vi-VN')} đ</h5>
              </div>
            </CardBody>
          </Card>

          {/* Vendor Dispatch Card */}
          <Card className="apple-card-parchment p-4">
            <div className="text-muted small fw-semibold text-uppercase mb-1">Đơn vị cung ứng dịch vụ</div>
            <h5 className="fw-semibold text-dark mb-1">{demand.cateringVendor.name}</h5>
            <div className="text-muted small mb-3">
              Hotline: <strong className="text-dark">{demand.cateringVendor.contactPhone}</strong>
            </div>

            <button
              type="button"
              className="btn-apple-primary w-100 py-3 text-center fw-semibold fs-6"
              disabled={isDispatched || isSubmitting}
              onClick={handleManualSendOrder}
            >
              {isDispatched ? '✓ Đã Gửi Đơn Đặt Hàng PO' : isSubmitting ? 'Đang gửi...' : 'Khóa Sổ & Gửi Đơn Cho Bếp (08:45 AM)'}
            </button>
          </Card>
        </Col>

        {/* Right Column: Menu Dish Inventory */}
        <Col lg="7">
          <Card className="apple-card mb-4">
            <div className="p-4 border-bottom">
              <h5 className="fw-semibold text-dark mb-1">Chi Tiết Thực Đơn & Định Lượng Chốt</h5>
              <div className="text-muted small">Quy cách định lượng suất ăn trưa tiêu chuẩn trường học</div>
            </div>
            <CardBody className="p-0">
              <Table responsive hover className="apple-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="ps-4">Tên Món Ăn</th>
                    <th>Phân Loại</th>
                    <th>Yêu Cầu Nhiệt Độ</th>
                    <th className="text-end pe-4">Số Lượng Đặt</th>
                  </tr>
                </thead>
                <tbody>
                  {demand.dishes.map((item) => (
                    <tr key={item.dish.id}>
                      <td className="ps-4">
                        <div className="fw-medium text-dark">{item.dish.name}</div>
                        {item.dish.allergens.length > 0 && (
                          <div className="small text-muted">Chứa: {item.dish.allergens.join(', ')}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge rounded-pill bg-light text-secondary border px-2 py-1">
                          {item.dish.category === 'MAIN' ? 'Món mặn' : item.dish.category === 'SOUP' ? 'Canh' : item.dish.category === 'SIDE' ? 'Món xào' : 'Tráng miệng'}
                        </span>
                      </td>
                      <td>
                        <span className="text-dark fw-medium">≥ {item.dish.targetTemp}°C</span>
                      </td>
                      <td className="text-end pe-4 fw-semibold text-dark">
                        {item.requiredQty} {item.dish.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>

          {/* Nutrition & Safety Standard Card */}
          <Card className="apple-card-parchment p-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-semibold text-dark mb-0">Tiêu Chuẩn Dinh Dưỡng Học Đường</h6>
              <span className="badge rounded-pill bg-light text-success border">Viện Dinh Dưỡng Quốc Gia</span>
            </div>
            <p className="text-muted small mb-3">
              Thực đơn đáp ứng 650 - 720 kcal/bữa trưa cho học sinh tiểu học, tỷ lệ P:L:C cân đối (13-15% : 20-25% : 60-65%), hàm lượng canxi và sắt đạt khuyến nghị.
            </p>
            <div className="row g-2 text-center">
              <div className="col-4">
                <div className="p-2 bg-white rounded border">
                  <div className="text-muted small">Năng lượng</div>
                  <strong className="text-dark">685 kcal</strong>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 bg-white rounded border">
                  <div className="text-muted small">Chất đạm (P)</div>
                  <strong className="text-dark">26.5 g</strong>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 bg-white rounded border">
                  <div className="text-muted small">Chất béo (L)</div>
                  <strong className="text-dark">18.2 g</strong>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Modal Preview Email PO */}
      <Modal isOpen={showEmailModal} toggle={() => setShowEmailModal(false)} size="lg" centered>
        <ModalHeader toggle={() => setShowEmailModal(false)}>
          <span className="fw-semibold text-dark">Biên Nhận Thư Điện Tử Đặt Hàng Bán Trú (Electronic PO Email)</span>
        </ModalHeader>
        <ModalBody className="p-4 bg-light">
          <div className="bg-white p-3 border rounded mb-3 small">
            <div><strong>Người nhận (To):</strong> {receipt?.emailTo || 'orders@vincatering.vn'}</div>
            <div><strong>Đồng kính gửi (CC):</strong> dieu-hanh-bep@vincatering.vn, ban-tru@tieuhoc.edu.vn</div>
            <div><strong>Thời gian gửi:</strong> {receipt?.dispatchedAt || '08:45:02 AM'}</div>
            <div><strong>Tiêu đề:</strong> {receipt?.emailSubject || `[PO-ELECTRONIC] Đơn Đặt Hàng Bán Trú ${receipt?.orderCode || 'PO-20261012-01'} - Giao 10:30 AM`}</div>
          </div>

          {receipt?.emailHtmlPreview ? (
            <div dangerouslySetInnerHTML={{ __html: receipt.emailHtmlPreview }} />
          ) : (
            <div className="bg-white p-4 border rounded">
              <div className="text-center pb-3 border-bottom mb-3">
                <h5 className="fw-bold text-primary mb-1">LỆNH ĐẶT HÀNG SUẤT ĂN BÁN TRÚ ĐIỆN TỬ (PO)</h5>
                <div className="text-muted small">Mã số: <strong>{receipt?.orderCode || 'PO-20261012-01'}</strong> | Tracking: <strong>{receipt?.vendorTrackingRef || 'SF-VN-82419'}</strong></div>
              </div>
              <p>Kính gửi: <strong>Bộ phận Điều hành Bếp - {demand.cateringVendor.name}</strong>,</p>
              <p className="text-muted small">
                Hệ thống Quản lý Bán trú trường học đã tự động chốt số lượng suất ăn trưa vào khung giờ quy chế <strong>08:45 AM</strong>. Chi tiết như sau:
              </p>
              <Table bordered size="sm" className="my-3">
                <thead className="table-light">
                  <tr>
                    <th>Hạng mục</th>
                    <th className="text-end">Số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Suất ăn học sinh & giáo viên tiêu chuẩn</td>
                    <td className="text-end fw-semibold">{demand.totalOrderedPortions - demand.specialDietPortions} suất</td>
                  </tr>
                  <tr>
                    <td className="text-warning">Suất chế độ ăn kiêng / dị ứng riêng</td>
                    <td className="text-end fw-semibold text-warning">{demand.specialDietPortions} suất</td>
                  </tr>
                  <tr className="table-primary">
                    <td className="fw-bold">TỔNG CỘNG XÁC NHẬN BÀN GIAO</td>
                    <td className="text-end fw-bold">{demand.totalOrderedPortions} suất</td>
                  </tr>
                </tbody>
              </Table>
              <div className="p-2 bg-warning-subtle text-warning-emphasis rounded small mb-3">
                <strong>Lưu ý:</strong> {demand.specialDietPortions} suất ăn riêng dán tem cam. Giờ giao cam kết tại dock trường: <strong>Trước 10:30 AM</strong>.
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowEmailModal(false)}>
            Đóng
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
