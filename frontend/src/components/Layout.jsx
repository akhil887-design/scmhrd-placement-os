import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-full text-sm transition ${
    isActive ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink hover:bg-black/5'
  }`;

export default function Layout() {
  const { user, logout, isAdmin, canAccessDirector } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <NavLink to="/" className="font-semibold tracking-tight text-ink">
            SCMHRD Placement OS
          </NavLink>
          <nav className="flex flex-1 min-w-0 overflow-x-auto flex-wrap md:flex-nowrap items-center gap-1 justify-end md:justify-center pb-1 md:pb-0">
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              Student
            </NavLink>
            <NavLink to="/aptitude" className={linkClass}>
              Aptitude
            </NavLink>
            <NavLink to="/psych" className={linkClass}>
              Psych
            </NavLink>
            <NavLink to="/interview" className={linkClass}>
              Interview
            </NavLink>
            <NavLink to="/mock" className={linkClass}>
              Mock
            </NavLink>
            <NavLink to="/leaderboard" className={linkClass}>
              Rankings
            </NavLink>
            {canAccessDirector && (
              <NavLink to="/director" className={linkClass}>
                Director
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={linkClass}>
                Admin
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            {user && (
              <span className="text-ink-muted hidden sm:inline max-w-[140px] truncate">
                {user.name}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-black/10 px-3 py-1.5 hover:bg-black/5"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-black/5 py-6 text-center text-xs text-ink-muted">
        Local-only placement workspace · SCMHRD Placement OS
      </footer>
    </div>
  );
}
