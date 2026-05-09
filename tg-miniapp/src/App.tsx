import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Deposit from './pages/Deposit';
import Portfolio from './pages/Portfolio';
import IntentPost from './pages/IntentPost';

// Lazy-loaded pages (stubs for now)
function Withdraw() {
  return (
    <div className="page">
      <h1>Withdraw</h1>
      <p className="subtitle">Withdraw your vault shares back to your wallet.</p>
      <div className="card">
        <p>Coming soon...</p>
      </div>
    </div>
  );
}

function Agents() {
  return (
    <div className="page">
      <h1>Agents</h1>
      <p className="subtitle">Browse and follow AI agents managing vault strategies.</p>
      <div className="card">
        <p>Coming soon...</p>
      </div>
    </div>
  );
}

function Bridge() {
  return (
    <div className="page">
      <h1>Bridge</h1>
      <p className="subtitle">Bridge assets to Mantle for vault deposits.</p>
      <div className="card">
        <p>Coming soon...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="bottom-nav">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">💰</span>
            <span>Deposit</span>
          </NavLink>
          <NavLink to="/portfolio" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">📊</span>
            <span>Portfolio</span>
          </NavLink>
          <NavLink to="/intent" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">🎯</span>
            <span>Intent</span>
          </NavLink>
          <NavLink to="/agents" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">🤖</span>
            <span>Agents</span>
          </NavLink>
          <NavLink to="/bridge" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">🌉</span>
            <span>Bridge</span>
          </NavLink>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Deposit />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/intent" element={<IntentPost />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/bridge" element={<Bridge />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
