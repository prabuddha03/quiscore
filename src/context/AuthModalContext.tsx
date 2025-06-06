"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface AuthModalContextType {
  isSignInModalOpen: boolean;
  isSignOutModalOpen: boolean;
  openSignInModal: () => void;
  closeSignInModal: () => void;
  openSignOutModal: () => void;
  closeSignOutModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(
  undefined
);

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
};

export const AuthModalProvider = ({ children }: { children: ReactNode }) => {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  const openSignInModal = () => setIsSignInModalOpen(true);
  const closeSignInModal = () => setIsSignInModalOpen(false);
  const openSignOutModal = () => setIsSignOutModalOpen(true);
  const closeSignOutModal = () => setIsSignOutModalOpen(false);

  return (
    <AuthModalContext.Provider
      value={{
        isSignInModalOpen,
        isSignOutModalOpen,
        openSignInModal,
        closeSignInModal,
        openSignOutModal,
        closeSignOutModal,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}; 