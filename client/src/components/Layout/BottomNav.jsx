import { NavLink, useLocation } from 'react-router-dom';
import './BottomNav.css';

const ITEMS = [
  { path: '/schedule', label: 'Schedule', icon: '📅' },
  { path: '/predictions', label: 'Predict', icon: '🎯' },
  { path: '/', label: 'Home', icon: '⚽', exact: true },
  { path: '/games', label: 'Games', icon: '🎮' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {ITEMS.map((item) => {
        const active = item.exact
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
