// src/App.js — FINAL PUBLIC-FACING MASTERPIECE
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC HOME — BEAUTIFUL & PROFESSIONAL */}
        <Route path="/" element={
          <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0A2B4E 0%, #001F3F 100%)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            {/* LOGO */}
            <div style={{ marginBottom: '3rem' }}>
              <img 
                src="/logo.png" 
                alt="Kammerer Productions" 
                style={{
                  width: '280px',
                  height: 'auto',
                  maxWidth: '90vw',
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))'
                }}
              />
            </div>

            {/* MAIN MESSAGE */}
            <h1 style={{
              fontSize: '4.5rem',
              fontWeight: '800',
              margin: '0 0 1rem 0',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              textShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
              Coming Soon
            </h1>

            <p style={{
              fontSize: '1.8rem',
              opacity: 0.9,
              margin: '0 0 4rem 0',
              textAlign: 'center',
              maxWidth: '800px',
              lineHeight: '1.5'
            }}>
              The future of track & field timing is being built.
            </p>

            {/* FUN ACCENT */}
            <div style={{
              display: 'flex',
              gap: '2rem',
              fontSize: '3rem',
              opacity: 0.7
            }}>
              <span>Fast</span>
              <span>Accurate</span>
              <span>Beautiful</span>
            </div>

            {/* SUBTLE FOOTER */}
            <footer style={{
              position: 'absolute',
              bottom: '2rem',
              fontSize: '1rem',
              opacity: 0.6
            }}>
              © {new Date().getFullYear()} Kammerer Productions. All rights reserved.
            </footer>
          </div>
        } />

        {/* ADMIN DASHBOARD */}
        <Route
          path="/admin/*"
          element={
            <Authenticator>
              {({ signOut }) => <AdminDashboard signOut={signOut} />}
            </Authenticator>
          }
        />
      </Routes>
    </Router>
  );
}