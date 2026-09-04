import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * `ms` milliseconds, it resolves with `fallback` instead of hanging forever.
 * This is critical when Firestore is unreachable (wrong projectId, network
 * issue, or database not provisioned) — without it the loading spinner never
 * disappears and the whole app appears broken.
 */
function withTimeout(promise, ms, fallback) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timeout]);
}

function AppRouter() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety net: if onAuthStateChanged never fires (Firebase init failure),
    // clear the loading state after 8 seconds so the app doesn't freeze.
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimer);
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);

          // Race Firestore read against a 5-second timeout.
          // If Firestore is unreachable, fall back to default permissions
          // so the app still loads instead of hanging on "جاري التحميل...".
          const userSnap = await withTimeout(
            getDoc(userDocRef),
            5000,
            null // null = timeout, treat as not found
          );

          if (userSnap && userSnap.exists()) {
            setUserData(userSnap.data());
          } else {
            // Either doc doesn't exist yet, or Firestore timed-out — use safe defaults
            setUserData({ role: 'user', daily_limit: 2 });
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          // On Firestore error, default to basic user permissions
          setUserData({ role: 'user', daily_limit: 2 });
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#030712',
          color: '#fff',
          fontFamily: "'Cairo', 'Segoe UI', sans-serif",
        }}
      >
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/"
          element={user ? <Home user={user} userData={userData} /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={
            user && userData?.role === 'admin'
              ? <AdminDashboard user={user} />
              : <Navigate to="/" />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}
