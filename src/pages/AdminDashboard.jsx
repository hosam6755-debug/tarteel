import React, { useEffect, useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Users, LogOut, ArrowRight, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

export default function AdminDashboard({ user }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersCol = collection(db, 'users');
      const userSnapshot = await getDocs(usersCol);
      const uList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(uList);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLimit = async (uid, newLimit) => {
    setUpdating(uid);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        daily_limit: Number(newLimit)
      });
      // Update local state
      setUsersList(prev => prev.map(u => u.id === uid ? { ...u, daily_limit: Number(newLimit) } : u));
    } catch (err) {
      console.error("Error updating limit:", err);
      alert('فشل تحديث الحد اليومي.');
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: '#e2e8f0', fontFamily: "'Cairo', sans-serif" }}>
      <header style={{ 
        background: '#091222', 
        borderBottom: '1px solid #1e293b', 
        padding: '1rem 2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Users color="#e5b869" />
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>لوحة تحكم الإدارة</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            العودة للستوديو <ArrowRight size={16} />
          </Link>
          <button 
            onClick={handleLogout}
            style={{ 
              background: 'transparent', 
              border: '1px solid #ef4444', 
              color: '#ef4444', 
              padding: '6px 12px', 
              borderRadius: '6px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            تسجيل الخروج <LogOut size={14} />
          </button>
        </div>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>جاري تحميل المستخدمين...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead style={{ background: '#1e293b' }}>
                <tr>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>البريد الإلكتروني</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>الصلاحية</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>تاريخ التسجيل</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>الحد اليومي (فيديوهات)</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '1rem', color: '#fff' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        background: u.role === 'admin' ? '#3b82f633' : '#334155', 
                        color: u.role === 'admin' ? '#60a5fa' : '#94a3b8', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                      {new Date(u.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="number" 
                          defaultValue={u.daily_limit} 
                          min="0"
                          id={`limit-${u.id}`}
                          style={{ 
                            width: '60px', 
                            background: '#091222', 
                            border: '1px solid #334155', 
                            color: '#fff', 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            textAlign: 'center'
                          }}
                        />
                        <button
                          onClick={() => {
                            const val = document.getElementById(`limit-${u.id}`).value;
                            handleUpdateLimit(u.id, val);
                          }}
                          disabled={updating === u.id}
                          style={{
                            background: '#e5b869',
                            border: 'none',
                            color: '#000',
                            padding: '6px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          title="حفظ التعديل"
                        >
                          {updating === u.id ? '...' : <Save size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>لا يوجد مستخدمين بعد.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
