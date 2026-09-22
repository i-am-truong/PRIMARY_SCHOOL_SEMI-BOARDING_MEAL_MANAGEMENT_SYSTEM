import { Fragment } from 'react';
import { Link, useLocation } from 'react-router';
import { useSelector, useDispatch } from 'react-redux';
import { setEnableMobileMenu } from '../../reducers/ThemeOptions';
import {
  SemiBoardingNav,
  MenuNutritionNav,
  ParentPortalNav,
  SystemAdminNav,
} from './NavItems';

const MenuItem = ({ item, toggleMobileSidebar }) => {
  const location = useLocation();
  const isActive = location.pathname === item.to;

  return (
    <li className={`metismenu-item ${isActive ? 'active' : ''}`}>
      <Link
        to={item.to || '#'}
        className={`metismenu-link ${isActive ? 'active' : ''}`}
        onClick={toggleMobileSidebar}
      >
        <i className={`metismenu-icon ${item.icon}`} />
        <span className="metismenu-label-text">{item.label}</span>
      </Link>
    </li>
  );
};

const Nav = () => {
  const enableMobileMenu = useSelector((s) => s.ThemeOptions.enableMobileMenu);
  const dispatch = useDispatch();

  const toggleMobileSidebar = () => {
    if (enableMobileMenu) {
      dispatch(setEnableMobileMenu(false));
    }
  };

  const renderMenu = (items) =>
    items.map((item, i) => (
      <MenuItem key={i} item={item} toggleMobileSidebar={toggleMobileSidebar} />
    ));

  return (
    <Fragment>
      <div className="vertical-nav-menu apple-clean-nav">
        {/* Nhóm 1: Vận hành bán trú */}
        <div className="app-sidebar-section">
          <div className="app-sidebar-section-title">VẬN HÀNH BÁN TRÚ</div>
          <ul className="metismenu-container">{renderMenu(SemiBoardingNav)}</ul>
        </div>

        {/* Nhóm 2: Thực đơn & Dinh dưỡng */}
        <div className="app-sidebar-section">
          <div className="app-sidebar-section-title">THỰC ĐƠN & DINH DƯỠNG</div>
          <ul className="metismenu-container">{renderMenu(MenuNutritionNav)}</ul>
        </div>

        {/* Nhóm 3: Phụ huynh học sinh */}
        <div className="app-sidebar-section">
          <div className="app-sidebar-section-title">PHỤ HUYNH HỌC SINH</div>
          <ul className="metismenu-container">{renderMenu(ParentPortalNav)}</ul>
        </div>

        {/* Nhóm 4: Quản trị hệ thống */}
        <div className="app-sidebar-section">
          <div className="app-sidebar-section-title">QUẢN TRỊ HỆ THỐNG</div>
          <ul className="metismenu-container">{renderMenu(SystemAdminNav)}</ul>
        </div>
      </div>
    </Fragment>
  );
};

export default Nav;
