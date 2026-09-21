import React, { Fragment, useState, useEffect } from 'react';
import {
  DropdownToggle,
  DropdownMenu,
  Nav,
  Button,
  NavItem,
  NavLink,
  UncontrolledButtonDropdown,
} from 'reactstrap';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AuthService } from '../../../services/authService';
import avatar1 from '../../../assets/utils/images/avatars/1.jpg';

export default function UserBox() {
  const [currentUser, setCurrentUser] = useState(() => AuthService.getCurrentUser());

  useEffect(() => {
    // Sync current user on mount or session change
    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleLogout = () => {
    AuthService.clearSession();
    window.location.hash = '#/login';
  };

  const displayName = currentUser?.fullName || 'Thu Hà (MGR)';
  const displayRole = currentUser?.roleName || 'Điều Phối Viên Bán Trú';
  const roleCode = currentUser?.role || 'MGR';

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADM':
        return 'danger';
      case 'MGR':
        return 'primary';
      case 'ACC':
        return 'success';
      case 'PAR':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Fragment>
      <div className="header-btn-lg pe-0">
        <div className="widget-content p-0">
          <div className="widget-content-wrapper">
            <div className="widget-content-left">
              <UncontrolledButtonDropdown>
                <DropdownToggle color="link" className="p-0 border-0">
                  <img width={40} height={40} className="rounded-circle border" src={avatar1} alt={displayName} />
                  <FontAwesomeIcon className="ms-2 opacity-8" icon={faAngleDown} />
                </DropdownToggle>
                <DropdownMenu className="rm-pointers dropdown-menu-lg">
                  <div className="p-3 border-bottom bg-light">
                    <div className="d-flex align-items-center">
                      <img width={42} height={42} className="rounded-circle border me-3" src={avatar1} alt="" />
                      <div>
                        <div className="fw-bold text-dark">{displayName}</div>
                        <span className={`badge rounded-pill bg-${getRoleBadgeColor(roleCode)}-subtle text-${getRoleBadgeColor(roleCode)} border px-2 py-1 small`}>
                          {roleCode} • {displayRole}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <Nav vertical>
                      <NavItem>
                        <NavLink href="#/admin/users" className="small text-secondary py-2">
                          <i className="pe-7s-users me-2 text-primary" /> Quản lý tài khoản
                        </NavLink>
                      </NavItem>
                      <NavItem>
                        <NavLink href="#/coordinator/attendance" className="small text-secondary py-2">
                          <i className="pe-7s-note2 me-2 text-primary" /> Nghiệp vụ bán trú
                        </NavLink>
                      </NavItem>
                    </Nav>
                  </div>
                  <div className="p-3 border-top text-center bg-light">
                    <Button
                      color="danger"
                      size="sm"
                      className="btn-apple-secondary text-danger w-100 fw-bold border-danger-subtle"
                      onClick={handleLogout}
                    >
                      Đăng Xuất (Logout)
                    </Button>
                  </div>
                </DropdownMenu>
              </UncontrolledButtonDropdown>
            </div>
            <div className="widget-content-left ms-3 header-user-info">
              <div className="widget-heading fw-semibold text-dark">{displayName}</div>
              <div className="widget-subheading text-muted small">{displayRole}</div>
            </div>
            <div className="widget-content-right header-user-info ms-3">
              <span className={`badge rounded-pill bg-${getRoleBadgeColor(roleCode)}-subtle text-${getRoleBadgeColor(roleCode)} border px-2 py-1 small fw-medium`}>
                {roleCode}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
