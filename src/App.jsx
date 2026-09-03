import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // stores role and limits
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user data from firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setUserData(userSnap.data());
          } else {
            // User just signed up, wait for the profile to be created or handle it
            setUserData({ role: 'user', daily_limit: 2 });
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#030712', color: '#fff' }}>
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
