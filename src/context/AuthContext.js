import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar si el usuario es admin
  const isAdmin = (userEmail) => {
    const adminEmails = ['hola@asiergonzalez.es'];
    return adminEmails.includes(userEmail?.toLowerCase());
  };

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Verificar si es admin
        if (isAdmin(firebaseUser.email)) {
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Admin',
            photoURL: firebaseUser.photoURL,
            isAdmin: true
          };
          
          setUser(userData);
          await AsyncStorage.setItem('user', JSON.stringify(userData));
        } else {
          // No es admin, cerrar sesión
          await signOut(auth);
          setError('Acceso denegado. Solo administradores pueden acceder.');
          setUser(null);
        }
      } else {
        setUser(null);
        await AsyncStorage.removeItem('user');
      }
      setLoading(false);
    });

    // Check for stored user on app start
    const checkStoredUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (isAdmin(userData.email)) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Error checking stored user:', error);
      }
    };

    checkStoredUser();
    return unsubscribe;
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      if (!isAdmin(email)) {
        throw new Error('Acceso denegado. Solo administradores pueden acceder.');
      }
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function (solo para admins)
  const register = async (email, password, displayName) => {
    try {
      setError(null);
      setLoading(true);
      
      if (!isAdmin(email)) {
        throw new Error('Solo se pueden registrar emails de administrador.');
      }
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      await updateProfile(result.user, {
        displayName: displayName || 'Admin'
      });
      
      return result.user;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setError(null);
      console.log('Iniciando logout...');
      
      // Primero limpiar el estado local
      setUser(null);
      
      // Limpiar AsyncStorage
      try {
        await AsyncStorage.removeItem('user');
        console.log('AsyncStorage limpiado');
      } catch (storageError) {
        console.warn('Error limpiando AsyncStorage:', storageError);
        // No es crítico, continuamos
      }
      
      // Finalmente cerrar sesión en Firebase
      await signOut(auth);
      console.log('Sesión Firebase cerrada');
      
    } catch (error) {
      console.error('Error en logout:', error);
      setError(error.message);
      
      // Incluso si hay error, limpiar estado local
      setUser(null);
      try {
        await AsyncStorage.removeItem('user');
      } catch (e) {
        // Ignorar errores de AsyncStorage
      }
      
      throw error;
    }
  };

  // Clear error
  const clearError = () => setError(null);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    isAdmin: user?.isAdmin || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
