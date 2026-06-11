import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const NAV_GROUPS = [
  {
    label: null,
    items: [{ path: '/', label: 'Home', icon: '🏠', exact: true }],
  },
  {
    label: 'TOURNAMENT',
    items: [
      { path: '/schedule', label: 'Schedule', icon: '📅' },
      { path: '/predictions', label: 'Predictions', icon: '🎯' },
      { path: '/simulator', label: 'Simulator', icon: '🏆' },
    ],
  },
  {
    label: 'FUN',
    items: [
      { path: '/games', label: 'Games', icon: '🎮' },
      { path: '/watch', label: 'Where to Watch', icon: '📺' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { path: '/profile', label: 'Profile', icon: '👤' },
    ],
  },
];

export default function Sidebar({ onNavigate }) {
  const location = useLocation();

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="logo-icon">⚽</span>
        <div className="logo-text">
          <span className="logo-title">World Cup Hub</span>
          <span className="logo-sub">FIFA 2026</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className="nav-group">
            {group.label && <div className="nav-group-label">{group.label}</div>}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive(item) ? 'nav-item-active' : ''}`}
                onClick={onNavigate}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="season-badge">
          <span className="season-dot" />
          <span>USA · MEX · CAN 2026</span>
        </div>
      </div>
    </aside>
  );
}
