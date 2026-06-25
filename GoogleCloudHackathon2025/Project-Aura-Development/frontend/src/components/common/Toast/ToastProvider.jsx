//This will manage the state of all active toasts and provide the showToast function via context.


// src/components/common/Toast/ToastProvider.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast';

const ToastContext = createContext();

export const useToast = () => {
  return useContext(ToastContext);
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const toastRoot = document.getElementById('toast-root'); // Ensure you have a div with id="toast-root" in your index.html

  const showToast = useCallback((message, type = 'info') => {
     // NEW: Generate a more unique ID by combining Date.now() with a random number
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`; // <--- CHANGE THIS LINE
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const contextValue = { showToast };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toastRoot && createPortal(
        <div className="toast-container">
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={removeToast}
            />
          ))}
        </div>,
        toastRoot
      )}
    </ToastContext.Provider>
  );
};
