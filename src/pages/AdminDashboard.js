// src/pages/AdminDashboard.js — UPDATED WITH STATS
import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import AdminEvents from './AdminEvents';
import AdminFacilities from './AdminFacilities';
import AdminCompanies from './AdminCompanies';
import AdminFrontPage from './AdminFrontPage';
import AdminStats from './AdminStats';  // ← NEW

function Sidebar({ signOut }) {
  return (
    <div style={{
      width: '250px',
      backgroundColor: '#0A2B4E',
      color: 'white',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ width: 160, height: 80, objectFit: 'contain', marginBottom: '0.25rem' }} 
          />
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '600' }}>
            Admin Dashboard
          </h2>
        </div>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><Link to="/admin/events" style={linkStyle}>Events</Link></li>
            <li><Link to="/admin/facilities" style={linkStyle}>Facilities</Link></li>
            <li><Link to="/admin/companies" style={linkStyle}>Companies</Link></li>
            <li><Link to="/admin/frontpage" style={linkStyle}>Front Page</Link></li>
            <li><Link to="/admin/stats" style={linkStyle}>Statistics</Link></li> {/* ← NEW */}
          </ul>
        </nav>
      </div>

      <div>
        <Link to="/" style={homeButtonStyle}>Home</Link>
        <button onClick={signOut} style={homeButtonStyle}>Sign Out</button>
      </div>
    </div>
  );
}

const linkStyle = {
  display: 'block',
  padding: '0.75rem 1rem',
  color: 'white',
  textDecoration: 'none',
  borderRadius: '4px',
  marginBottom: '0.5rem',
  backgroundColor: '#4a5568',
  transition: 'background 0.2s',
  fontWeight: '500',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
};

const homeButtonStyle = {
  display: 'block',
  width: '100%',
  padding: '0.75rem',
  backgroundColor: '#dc3545',
  color: 'white',
  textAlign: 'center',
  textDecoration: 'none',
  borderRadius: '4px',
  marginBottom: '0.5rem',
  fontWeight: '500',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.2s'
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const signOut = async () => {
    try {
      await Auth.signOut();
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ marginLeft: '250px' }}>
      <Sidebar signOut={signOut} />
      <div style={{ padding: '2rem' }}>
        <Routes>
          <Route path="events" element={<AdminEvents />} />
          <Route path="facilities" element={<AdminFacilities />} />
          <Route path="companies" element={<AdminCompanies />} />
          <Route path="frontpage" element={<AdminFrontPage />} />
          <Route path="stats" element={<AdminStats />} /> {/* ← NEW ROUTE */}
          <Route path="/" element={
            <div style={{ textAlign: 'center', marginTop: '10rem' }}>
              <h1>Welcome to Kammerer Productions Admin Dashboard</h1>
              <p>Select a section from the sidebar.</p>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}