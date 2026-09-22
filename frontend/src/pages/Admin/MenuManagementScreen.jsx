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
  Nav,
  NavItem,
  NavLink,
} from 'reactstrap';
import cx from 'classnames';
import { ApiClient } from '../../services/apiClient';

const ALLERGEN_OPTIONS = [
  'Hải sản',
  'Trứng',
  'Sữa bò tươi',
  'Đậu phộng / Lạc',
  'Đậu nành',
  'Lúa mì / Gluten',
  'Cần tây',
  'Mè / Vừng',
];

const CATEGORY_MAP = {
  MAIN: { label: 'Món Mặn / Đạm', color: 'primary' },
  SOUP: { label: 'Món Canh', color: 'info' },
  VEG: { label: 'Rau / Củ xào luộc', color: 'success' },
  DESSERT: { label: 'Tráng miệng', color: 'warning' },
};

const STATUS_MAP = {
  DRAFT: { label: 'Bản nháp', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
  APPROVED: { label: 'Đã duyệt', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  REJECTED: { label: 'Bị từ chối', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
};

export default function MenuManagementScreen() {
  const [activeTab, setActiveTab] = useState('menus'); // 'menus' | 'dishes'
  const [notification, setNotification] = useState(null);

  // User role check (Mocking or real token)
  const userRole = localStorage.getItem('user_role') || 'ADM'; // Default ADM for full control testing

  // ==========================================
  // STATE: TAB 1 - WEEKLY MENUS & APPROVAL
  // ==========================================
  const [weeklyMenus, setWeeklyMenus] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [menuFormData, setMenuFormData] = useState({
    serveDate: '',
    title: '',
    description: '',
    dishIds: [],
  });

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectMenuId, setRejectMenuId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // ==========================================
  // STATE: TAB 2 - DISH LIBRARY
  // ==========================================
  const [dishes, setDishes] = useState([]);
  const [dishLoading, setDishLoading] = useState(false);
  const [dishCategoryFilter, setDishCategoryFilter] = useState('ALL');
  const [dishSearch, setDishSearch] = useState('');
  const [dishModalOpen, setDishModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [dishFormData, setDishFormData] = useState({
    name: '',
    category: 'MAIN',
    calories: 180,
    description: '',
    allergens: [],
  });

  useEffect(() => {
    loadWeeklyMenus();
    loadDishes();
  }, []);

  // LOAD MENUS
  const loadWeeklyMenus = async () => {
    setMenuLoading(true);
    try {
      const res = await ApiClient.getWeeklyMenuWithDrafts();
      setWeeklyMenus(res.data || []);
    } catch (err) {
      setNotification({ type: 'danger', message: `Lỗi tải thực đơn tuần: ${err.message}` });
    } finally {
      setMenuLoading(false);
    }
  };

  // LOAD DISHES
  const loadDishes = async () => {
    setDishLoading(true);
    try {
      const res = await ApiClient.getDishes({
        category: dishCategoryFilter === 'ALL' ? undefined : dishCategoryFilter,
        search: dishSearch || undefined,
      });
      setDishes(res.data || []);
    } catch (err) {
      setNotification({ type: 'danger', message: `Lỗi tải ngân hàng món ăn: ${err.message}` });
    } finally {
      setDishLoading(false);
    }
  };

  useEffect(() => {
    loadDishes();
  }, [dishCategoryFilter]);

  // ==========================================
  // DISH CRUD ACTIONS
  // ==========================================
  const handleOpenAddDish = () => {
    setEditingDish(null);
    setDishFormData({
      name: '',
      category: 'MAIN',
      calories: 180,
      description: '',
      allergens: [],
    });
    setDishModalOpen(true);
  };

  const handleOpenEditDish = (dish) => {
    setEditingDish(dish);
    setDishFormData({
      name: dish.name,
      category: dish.category || 'MAIN',
      calories: dish.calories || 150,
      description: dish.description || '',
      allergens: dish.allergens || [],
    });
    setDishModalOpen(true);
  };

  const handleToggleAllergen = (allergen) => {
    setDishFormData((prev) => {
      const exists = prev.allergens.includes(allergen);
      if (exists) {
        return { ...prev, allergens: prev.allergens.filter((a) => a !== allergen) };
      } else {
        return { ...prev, allergens: [...prev.allergens, allergen] };
      }
    });
  };

  const handleSaveDish = async (e) => {
    e.preventDefault();
    if (!dishFormData.name.trim()) {
      alert('Vui lòng nhập tên món ăn');
      return;
    }

    try {
      if (editingDish) {
        await ApiClient.updateDish(editingDish.id, dishFormData);
        setNotification({ type: 'success', message: `Đã cập nhật món "${dishFormData.name}"` });
      } else {
        await ApiClient.createDish(dishFormData);
        setNotification({ type: 'success', message: `Đã thêm món mới "${dishFormData.name}"` });
      }
      setDishModalOpen(false);
      loadDishes();
    } catch (err) {
      alert(`Thao tác thất bại: ${err.message}`);
    }
  };

  const handleDeleteDish = async (dish) => {
    if (!window.confirm(`Bạn có chắc muốn xóa món "${dish.name}" khỏi ngân hàng món?`)) return;
    try {
      await ApiClient.deleteDish(dish.id);
      setNotification({ type: 'success', message: `Đã xóa món "${dish.name}"` });
      loadDishes();
    } catch (err) {
      alert(`Không thể xóa: ${err.message}`);
    }
  };

  // ==========================================
  // MENU APPROVAL & EDIT ACTIONS
  // ==========================================
  const handleOpenCreateMenu = (dateStr) => {
    setSelectedMenu(null);
    setMenuFormData({
      serveDate: dateStr || new Date().toISOString().slice(0, 10),
      title: 'Bữa trưa Cân bằng Dinh dưỡng',
      description: 'Đảm bảo tỷ lệ chất đạm, chất xơ và vi chất theo khuyến nghị Viện Dinh Dưỡng.',
      dishIds: [],
    });
    setMenuModalOpen(true);
  };

  const handleOpenEditMenu = (menu) => {
    setSelectedMenu(menu);
    setMenuFormData({
      serveDate: menu.date,
      title: menu.title,
      description: menu.description || '',
      dishIds: (menu.dishes || []).map((d) => d.id),
    });
    setMenuModalOpen(true);
  };

  const handleToggleDishInMenu = (dishId) => {
    setMenuFormData((prev) => {
      const exists = prev.dishIds.includes(dishId);
      if (exists) {
        return { ...prev, dishIds: prev.dishIds.filter((id) => id !== dishId) };
      } else {
        return { ...prev, dishIds: [...prev.dishIds, dishId] };
      }
    });
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    if (menuFormData.dishIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 món ăn cho thực đơn!');
      return;
    }

    try {
      if (selectedMenu && selectedMenu.id && !selectedMenu.id.startsWith('menu-mock')) {
        await ApiClient.updateMenu(selectedMenu.id, {
          title: menuFormData.title,
          description: menuFormData.description,
          dishIds: menuFormData.dishIds,
        });
        setNotification({ type: 'success', message: 'Đã cập nhật thực đơn thành công.' });
      } else {
        await ApiClient.createMenu({
          serveDate: menuFormData.serveDate,
          title: menuFormData.title,
          description: menuFormData.description,
          dishIds: menuFormData.dishIds,
        });
        setNotification({ type: 'success', message: 'Đã tạo bản nháp thực đơn mới.' });
      }
      setMenuModalOpen(false);
      loadWeeklyMenus();
    } catch (err) {
      alert(`Lỗi lưu thực đơn: ${err.message}`);
    }
  };

  const handleSubmitForApproval = async (menuId) => {
    try {
      await ApiClient.submitMenuForApproval(menuId);
      setNotification({ type: 'success', message: 'Đã gửi thực đơn cho Ban Giám Hiệu phê duyệt!' });
      loadWeeklyMenus();
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleApprove = async (menuId) => {
    if (!window.confirm('Xác nhận PHÊ DUYỆT và công khai thực đơn này cho toàn trường và phụ huynh?')) return;
    try {
      await ApiClient.approveMenu(menuId, 'Phê duyệt chuẩn dinh dưỡng tuần');
      setNotification({ type: 'success', message: 'Đã phê duyệt và xuất bản thực đơn thành công!' });
      loadWeeklyMenus();
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleOpenReject = (menuId) => {
    setRejectMenuId(menuId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối để bếp điều chỉnh lại!');
      return;
    }
    try {
      await ApiClient.rejectMenu(rejectMenuId, rejectReason);
      setNotification({ type: 'warning', message: 'Đã từ chối thực đơn và gửi phản hồi cho Bếp.' });
      setRejectModalOpen(false);
      loadWeeklyMenus();
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleResetDraft = async (menuId) => {
    try {
      await ApiClient.resetMenuToDraft(menuId);
      setNotification({ type: 'info', message: 'Đã chuyển thực đơn về bản nháp để chỉnh sửa.' });
      loadWeeklyMenus();
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  return (
    <div className="menu-management-container" style={{ padding: '24px 32px' }}>
      {/* HEADER BANNER - APPLE AESTHETIC */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: '#1d1d1f',
                letterSpacing: '-0.374px',
                marginBottom: 6,
              }}
            >
              Lập Kế Hoạch & Quản Lý Thực Đơn
            </h1>
            <p style={{ fontSize: '15px', color: '#7a7a7a', margin: 0 }}>
              Domain 2: Quản lý ngân hàng món ăn, phân bổ dinh dưỡng và luồng phê duyệt thực đơn 1 cấp (Single-stage Approval).
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {activeTab === 'dishes' ? (
              <button
                className="btn btn-primary"
                onClick={handleOpenAddDish}
                style={{
                  backgroundColor: '#0066cc',
                  borderColor: '#0066cc',
                  borderRadius: '9999px',
                  padding: '8px 22px',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                + Thêm Món Ăn Mới
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => handleOpenCreateMenu()}
                style={{
                  backgroundColor: '#0066cc',
                  borderColor: '#0066cc',
                  borderRadius: '9999px',
                  padding: '8px 22px',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                + Soạn Thực Đơn Mới
              </button>
            )}
          </div>
        </div>
      </div>

      {notification && (
        <Alert
          color={notification.type}
          isOpen={true}
          toggle={() => setNotification(null)}
          style={{ borderRadius: '12px', marginBottom: 24 }}
        >
          {notification.message}
        </Alert>
      )}

      {/* APPLE CLEAN TAB NAVIGATION */}
      <div
        style={{
          display: 'inline-flex',
          backgroundColor: '#f5f5f7',
          padding: '4px',
          borderRadius: '9999px',
          marginBottom: '28px',
          border: '1px solid #e0e0e0',
        }}
      >
        <button
          onClick={() => setActiveTab('menus')}
          style={{
            border: 'none',
            outline: 'none',
            background: activeTab === 'menus' ? '#ffffff' : 'transparent',
            color: activeTab === 'menus' ? '#0066cc' : '#1d1d1f',
            padding: '8px 24px',
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: activeTab === 'menus' ? 600 : 400,
            boxShadow: activeTab === 'menus' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          📅 Thực Đơn Tuần & Phê Duyệt ({weeklyMenus.length} ngày)
        </button>
        <button
          onClick={() => setActiveTab('dishes')}
          style={{
            border: 'none',
            outline: 'none',
            background: activeTab === 'dishes' ? '#ffffff' : 'transparent',
            color: activeTab === 'dishes' ? '#0066cc' : '#1d1d1f',
            padding: '8px 24px',
            borderRadius: '9999px',
            fontSize: '14px',
            fontWeight: activeTab === 'dishes' ? 600 : 400,
            boxShadow: activeTab === 'dishes' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          🍲 Ngân Hàng Món Ăn ({dishes.length} món)
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: WEEKLY MENUS & SINGLE-STAGE APPROVAL WORKFLOW           */}
      {/* ============================================================== */}
      {activeTab === 'menus' && (
        <div>
          {/* NOTICE STRIP */}
          <div
            style={{
              backgroundColor: '#fafafc',
              border: '1px solid #e0e0e0',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#1d1d1f', fontSize: '15px' }}>
                Quy trình Phê Duyệt 1 Cấp (Approval Matrix)
              </div>
              <div style={{ color: '#7a7a7a', fontSize: '13px', marginTop: 2 }}>
                Bếp trưởng lập <strong>DRAFT</strong> ➔ Gửi <strong>PENDING_APPROVAL</strong> ➔ Hiệu trưởng (Admin) phê duyệt <strong>APPROVED</strong> hoặc <strong>REJECTED</strong>.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '6px 12px' }}>
                Bản nháp (DRAFT)
              </span>
              <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '6px 12px' }}>
                Chờ duyệt (PENDING)
              </span>
              <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '6px 12px' }}>
                Đã duyệt (APPROVED)
              </span>
            </div>
          </div>

          {menuLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#7a7a7a' }}>
              Đang tải danh sách thực đơn tuần...
            </div>
          ) : (
            <Row>
              {weeklyMenus.map((menu, idx) => {
                const statusMeta = STATUS_MAP[menu.status || 'APPROVED'] || STATUS_MAP.APPROVED;
                const isApproved = menu.status === 'APPROVED';
                const isPending = menu.status === 'PENDING_APPROVAL';
                const isDraft = !menu.status || menu.status === 'DRAFT';
                const isRejected = menu.status === 'REJECTED';

                return (
                  <Col md={12} lg={6} xl={4} key={menu.id || idx} style={{ marginBottom: 24 }}>
                    <Card
                      style={{
                        borderRadius: '18px',
                        border: '1px solid #e0e0e0',
                        backgroundColor: '#ffffff',
                        overflow: 'hidden',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                    >
                      {/* CARD HEADER */}
                      <div
                        style={{
                          padding: '16px 20px',
                          borderBottom: '1px solid #f0f0f0',
                          backgroundColor: '#fafafc',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', color: '#0066cc', fontWeight: 600 }}>
                            {menu.dayOfWeek} · {menu.date}
                          </div>
                          <div
                            style={{
                              fontSize: '17px',
                              fontWeight: 600,
                              color: '#1d1d1f',
                              letterSpacing: '-0.2px',
                            }}
                          >
                            {menu.title}
                          </div>
                        </div>

                        {/* STATUS BADGE */}
                        <div
                          style={{
                            backgroundColor: statusMeta.bg,
                            color: statusMeta.color,
                            border: `1px solid ${statusMeta.border}`,
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {statusMeta.label}
                        </div>
                      </div>

                      {/* CARD BODY */}
                      <CardBody style={{ padding: '20px', flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 12,
                          }}
                        >
                          <span style={{ fontSize: '13px', color: '#7a7a7a', fontWeight: 500 }}>
                            Danh mục món ăn ({menu.dishes?.length || 0} món):
                          </span>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#1d1d1f',
                              backgroundColor: '#f5f5f7',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            ⚡ {menu.totalCalories} kcal
                          </span>
                        </div>

                        {/* DISH LIST */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                          {(menu.dishes || []).map((dish, dIdx) => (
                            <div
                              key={dish.id || dIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                backgroundColor: '#f9f9fb',
                                borderRadius: '10px',
                                fontSize: '14px',
                              }}
                            >
                              <div style={{ fontWeight: 500, color: '#1d1d1f' }}>
                                {dish.name}
                                {dish.allergens && dish.allergens.length > 0 && (
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      fontSize: '11px',
                                      backgroundColor: '#fee2e2',
                                      color: '#b91c1c',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    ⚠️ {dish.allergens.join(', ')}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '12px', color: '#7a7a7a' }}>{dish.calories} kcal</span>
                            </div>
                          ))}
                        </div>

                        {/* APPROVAL NOTE IF REJECTED / APPROVED */}
                        {menu.approvalNote && (
                          <div
                            style={{
                              fontSize: '12px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              backgroundColor: isRejected ? '#fef2f2' : '#f0fdf4',
                              color: isRejected ? '#991b1b' : '#166534',
                              marginBottom: 12,
                            }}
                          >
                            <strong>{isRejected ? 'Phản hồi từ chối:' : 'Ghi chú duyệt:'}</strong> {menu.approvalNote}
                          </div>
                        )}
                      </CardBody>

                      {/* CARD FOOTER - ACTIONS */}
                      <div
                        style={{
                          padding: '12px 20px',
                          borderTop: '1px solid #f0f0f0',
                          backgroundColor: '#fafafc',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#7a7a7a' }}>
                          {menu.approvedBy ? `Duyệt bởi: ${menu.approvedBy}` : 'Chưa duyệt'}
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          {/* Chỉnh sửa món */}
                          {!isApproved && (
                            <button
                              className="btn btn-sm btn-light"
                              onClick={() => handleOpenEditMenu(menu)}
                              style={{
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                            >
                              Sửa
                            </button>
                          )}

                          {/* Gửi duyệt nếu đang là DRAFT */}
                          {isDraft && menu.id && !menu.id.startsWith('menu-mock') && (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleSubmitForApproval(menu.id)}
                              style={{
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fcd34d',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}
                            >
                              Gửi Duyệt
                            </button>
                          )}

                          {/* Trả về Draft nếu bị Rejected */}
                          {isRejected && menu.id && (
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => handleResetDraft(menu.id)}
                              style={{ borderRadius: '8px', fontSize: '12px' }}
                            >
                              Làm lại
                            </button>
                          )}

                          {/* Quyền Hiệu trưởng / Admin: Phê duyệt hoặc Từ chối */}
                          {(isPending || isDraft) && menu.id && !menu.id.startsWith('menu-mock') && (
                            <>
                              <button
                                className="btn btn-sm"
                                onClick={() => handleApprove(menu.id)}
                                style={{
                                  backgroundColor: '#15803d',
                                  color: '#ffffff',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                Duyệt
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => handleOpenReject(menu.id)}
                                style={{
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                Từ Chối
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#15803d',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              ✓ Đã phát hành
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: DISH LIBRARY & NUTRITION CATALOG                        */}
      {/* ============================================================== */}
      {activeTab === 'dishes' && (
        <Card style={{ borderRadius: '18px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#fafafc',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* SEARCH BOX */}
            <div style={{ width: 280 }}>
              <Input
                type="text"
                placeholder="🔍 Tìm kiếm tên món ăn..."
                value={dishSearch}
                onChange={(e) => setDishSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadDishes()}
                style={{
                  borderRadius: '9999px',
                  backgroundColor: '#ffffff',
                  borderColor: '#e0e0e0',
                  padding: '8px 16px',
                  fontSize: '14px',
                }}
              />
            </div>

            {/* CATEGORY FILTER PILLS */}
            <div style={{ display: 'flex', gap: 8 }}>
              {['ALL', 'MAIN', 'SOUP', 'VEG', 'DESSERT'].map((catKey) => {
                const isSelected = dishCategoryFilter === catKey;
                const label =
                  catKey === 'ALL'
                    ? 'Tất cả'
                    : CATEGORY_MAP[catKey]?.label || catKey;

                return (
                  <button
                    key={catKey}
                    onClick={() => setDishCategoryFilter(catKey)}
                    style={{
                      border: isSelected ? '1px solid #0066cc' : '1px solid #e0e0e0',
                      backgroundColor: isSelected ? '#0066cc' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#1d1d1f',
                      borderRadius: '9999px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <CardBody style={{ padding: 0 }}>
            {dishLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#7a7a7a' }}>
                Đang tải danh sách món ăn...
              </div>
            ) : dishes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#7a7a7a' }}>
                Không tìm thấy món ăn nào.
              </div>
            ) : (
              <Table hover responsive style={{ margin: 0 }}>
                <thead>
                  <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e0e0e0' }}>
                    <th style={{ padding: '14px 24px', fontSize: '13px', color: '#7a7a7a' }}>TÊN MÓN ĂN</th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', color: '#7a7a7a' }}>PHÂN LOẠI</th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', color: '#7a7a7a' }}>NĂNG LƯỢNG (KCAL)</th>
                    <th style={{ padding: '14px 16px', fontSize: '13px', color: '#7a7a7a' }}>THÀNH PHẦN DỊ ỨNG</th>
                    <th style={{ padding: '14px 24px', fontSize: '13px', color: '#7a7a7a', textAlign: 'right' }}>
                      THAO TÁC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dishes.map((dish) => {
                    const catMeta = CATEGORY_MAP[dish.category] || CATEGORY_MAP.MAIN;
                    return (
                      <tr key={dish.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '16px 24px', fontWeight: 600, color: '#1d1d1f' }}>
                          <div>{dish.name}</div>
                          {dish.description && (
                            <div style={{ fontSize: '12px', color: '#7a7a7a', fontWeight: 400 }}>
                              {dish.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 16px' }}>
                          <span
                            className={`badge bg-${catMeta.color}-light text-${catMeta.color}`}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 500,
                              backgroundColor: '#f5f5f7',
                            }}
                          >
                            {catMeta.label}
                          </span>
                        </td>
                        <td style={{ padding: '16px 16px', fontWeight: 600, color: '#1d1d1f' }}>
                          ⚡ {dish.calories} kcal
                        </td>
                        <td style={{ padding: '16px 16px' }}>
                          {dish.allergens && dish.allergens.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {dish.allergens.map((alg, aIdx) => (
                                <span
                                  key={aIdx}
                                  style={{
                                    fontSize: '11px',
                                    backgroundColor: '#fee2e2',
                                    color: '#b91c1c',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    fontWeight: 500,
                                  }}
                                >
                                  {alg}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#10b981' }}>✓ An toàn phổ thông</span>
                          )}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              className="btn btn-sm btn-light"
                              onClick={() => handleOpenEditDish(dish)}
                              style={{ borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}
                            >
                              Sửa
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteDish(dish)}
                              style={{ borderRadius: '6px', fontSize: '12px' }}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      {/* ============================================================== */}
      {/* MODAL: THÊM / SỬA MÓN ĂN                                      */}
      {/* ============================================================== */}
      <Modal isOpen={dishModalOpen} toggle={() => setDishModalOpen(false)} centered>
        <ModalHeader toggle={() => setDishModalOpen(false)}>
          <span style={{ fontWeight: 600 }}>{editingDish ? 'Cập Nhật Món Ăn' : 'Thêm Món Ăn Mới'}</span>
        </ModalHeader>
        <Form onSubmit={handleSaveDish}>
          <ModalBody style={{ padding: 24 }}>
            <FormGroup>
              <Label style={{ fontWeight: 500, fontSize: '13px' }}>Tên Món Ăn *</Label>
              <Input
                type="text"
                required
                value={dishFormData.name}
                onChange={(e) => setDishFormData({ ...dishFormData, name: e.target.value })}
                placeholder="VD: Thịt gà om nấm hương..."
                style={{ borderRadius: '8px' }}
              />
            </FormGroup>

            <Row>
              <Col md={6}>
                <FormGroup>
                  <Label style={{ fontWeight: 500, fontSize: '13px' }}>Phân Loại *</Label>
                  <Input
                    type="select"
                    value={dishFormData.category}
                    onChange={(e) => setDishFormData({ ...dishFormData, category: e.target.value })}
                    style={{ borderRadius: '8px' }}
                  >
                    <option value="MAIN">Món Mặn / Đạm</option>
                    <option value="SOUP">Món Canh</option>
                    <option value="VEG">Rau / Củ xào luộc</option>
                    <option value="DESSERT">Tráng miệng</option>
                  </Input>
                </FormGroup>
              </Col>
              <Col md={6}>
                <FormGroup>
                  <Label style={{ fontWeight: 500, fontSize: '13px' }}>Năng lượng (kcal) *</Label>
                  <Input
                    type="number"
                    required
                    min={0}
                    value={dishFormData.calories}
                    onChange={(e) => setDishFormData({ ...dishFormData, calories: parseInt(e.target.value) || 0 })}
                    style={{ borderRadius: '8px' }}
                  />
                </FormGroup>
              </Col>
            </Row>

            <FormGroup>
              <Label style={{ fontWeight: 500, fontSize: '13px' }}>Mô Tả / Cách Chế Biến</Label>
              <Input
                type="textarea"
                rows={2}
                value={dishFormData.description}
                onChange={(e) => setDishFormData({ ...dishFormData, description: e.target.value })}
                placeholder="Ghi chú nguyên liệu, phương pháp nấu ít muối, dầu..."
                style={{ borderRadius: '8px' }}
              />
            </FormGroup>

            <FormGroup>
              <Label style={{ fontWeight: 500, fontSize: '13px' }}>Cảnh Báo Thành Phần Dị Ứng (Chọn nếu có):</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {ALLERGEN_OPTIONS.map((alg) => {
                  const selected = dishFormData.allergens.includes(alg);
                  return (
                    <button
                      type="button"
                      key={alg}
                      onClick={() => handleToggleAllergen(alg)}
                      style={{
                        borderRadius: '9999px',
                        border: selected ? '1px solid #b91c1c' : '1px solid #e0e0e0',
                        backgroundColor: selected ? '#fee2e2' : '#ffffff',
                        color: selected ? '#b91c1c' : '#1d1d1f',
                        fontSize: '12px',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      {selected ? `✓ ${alg}` : `+ ${alg}`}
                    </button>
                  );
                })}
              </div>
            </FormGroup>
          </ModalBody>
          <ModalFooter style={{ borderTop: '1px solid #f0f0f0' }}>
            <Button color="link" onClick={() => setDishModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              color="primary"
              style={{ backgroundColor: '#0066cc', borderColor: '#0066cc', borderRadius: '9999px', padding: '8px 24px' }}
            >
              Lưu Món Ăn
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: SOẠN & PHÂN BỔ THỰC ĐƠN NGÀY                            */}
      {/* ============================================================== */}
      <Modal isOpen={menuModalOpen} toggle={() => setMenuModalOpen(false)} size="lg" centered>
        <ModalHeader toggle={() => setMenuModalOpen(false)}>
          <span style={{ fontWeight: 600 }}>
            {selectedMenu ? `Chỉnh Sửa Thực Đơn (${menuFormData.serveDate})` : 'Soạn Thực Đơn Mới'}
          </span>
        </ModalHeader>
        <Form onSubmit={handleSaveMenu}>
          <ModalBody style={{ padding: 24 }}>
            <Row>
              <Col md={4}>
                <FormGroup>
                  <Label style={{ fontWeight: 500, fontSize: '13px' }}>Ngày Phục Vụ *</Label>
                  <Input
                    type="date"
                    required
                    disabled={!!selectedMenu}
                    value={menuFormData.serveDate}
                    onChange={(e) => setMenuFormData({ ...menuFormData, serveDate: e.target.value })}
                    style={{ borderRadius: '8px' }}
                  />
                </FormGroup>
              </Col>
              <Col md={8}>
                <FormGroup>
                  <Label style={{ fontWeight: 500, fontSize: '13px' }}>Tên Chủ Đề Thực Đơn *</Label>
                  <Input
                    type="text"
                    required
                    value={menuFormData.title}
                    onChange={(e) => setMenuFormData({ ...menuFormData, title: e.target.value })}
                    placeholder="VD: Thực đơn Cân bằng Thể chất..."
                    style={{ borderRadius: '8px' }}
                  />
                </FormGroup>
              </Col>
            </Row>

            <FormGroup>
              <Label style={{ fontWeight: 500, fontSize: '13px' }}>Mục Tiêu Dinh Dưỡng</Label>
              <Input
                type="text"
                value={menuFormData.description}
                onChange={(e) => setMenuFormData({ ...menuFormData, description: e.target.value })}
                placeholder="Ghi chú khẩu phần hoặc vi chất nổi bật..."
                style={{ borderRadius: '8px' }}
              />
            </FormGroup>

            <FormGroup>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Label style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>
                  Chọn Các Món Ăn Cho Bữa Trưa ({menuFormData.dishIds.length} món đã chọn)
                </Label>
                <span style={{ fontSize: '12px', color: '#0066cc' }}>Click để thêm hoặc bỏ món</span>
              </div>

              <div
                style={{
                  maxHeight: 280,
                  overflowY: 'auto',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '12px',
                  backgroundColor: '#fafafc',
                }}
              >
                <Row>
                  {dishes.map((dish) => {
                    const isSelected = menuFormData.dishIds.includes(dish.id);
                    return (
                      <Col md={6} key={dish.id} style={{ marginBottom: 8 }}>
                        <div
                          onClick={() => handleToggleDishInMenu(dish.id)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: isSelected ? '2px solid #0066cc' : '1px solid #e0e0e0',
                            backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: isSelected ? 600 : 500, fontSize: '14px', color: '#1d1d1f' }}>
                              {dish.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#7a7a7a' }}>
                              {CATEGORY_MAP[dish.category]?.label || dish.category} · {dish.calories} kcal
                            </div>
                          </div>
                          <div style={{ fontSize: '16px' }}>{isSelected ? '✅' : '➕'}</div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            </FormGroup>
          </ModalBody>
          <ModalFooter style={{ borderTop: '1px solid #f0f0f0' }}>
            <Button color="link" onClick={() => setMenuModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              color="primary"
              style={{ backgroundColor: '#0066cc', borderColor: '#0066cc', borderRadius: '9999px', padding: '8px 24px' }}
            >
              Lưu Bản Nháp Thực Đơn
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: TỪ CHỐI DUYỆT THỰC ĐƠN                                  */}
      {/* ============================================================== */}
      <Modal isOpen={rejectModalOpen} toggle={() => setRejectModalOpen(false)} centered>
        <ModalHeader toggle={() => setRejectModalOpen(false)}>
          <span style={{ fontWeight: 600, color: '#b91c1c' }}>Từ Chối Phê Duyệt Thực Đơn</span>
        </ModalHeader>
        <ModalBody style={{ padding: 24 }}>
          <p style={{ fontSize: '14px', color: '#1d1d1f' }}>
            Vui lòng nhập lý do từ chối để Bếp trưởng và Điều phối viên nắm được thông tin chỉnh sửa:
          </p>
          <FormGroup>
            <Input
              type="textarea"
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Món chiên nhiều dầu mỡ, đề nghị bổ sung thêm canh thanh mát; kiểm tra lại hàm lượng calo vượt ngưỡng..."
              style={{ borderRadius: '8px' }}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter style={{ borderTop: '1px solid #f0f0f0' }}>
          <Button color="link" onClick={() => setRejectModalOpen(false)}>
            Đóng
          </Button>
          <Button
            color="danger"
            onClick={handleConfirmReject}
            style={{ borderRadius: '9999px', padding: '8px 24px' }}
          >
            Xác Nhận Từ Chối
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
