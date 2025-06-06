"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface CreateEventModalContextType {
  isCreateEventModalOpen: boolean;
  openCreateEventModal: () => void;
  closeCreateEventModal: () => void;
}

const CreateEventModalContext = createContext<
  CreateEventModalContextType | undefined
>(undefined);

export const useCreateEventModal = () => {
  const context = useContext(CreateEventModalContext);
  if (!context) {
    throw new Error(
      "useCreateEventModal must be used within a CreateEventModalProvider"
    );
  }
  return context;
};

export const CreateEventModalProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);

  const openCreateEventModal = () => setIsCreateEventModalOpen(true);
  const closeCreateEventModal = () => setIsCreateEventModalOpen(false);

  return (
    <CreateEventModalContext.Provider
      value={{
        isCreateEventModalOpen,
        openCreateEventModal,
        closeCreateEventModal,
      }}
    >
      {children}
    </CreateEventModalContext.Provider>
  );
}; 