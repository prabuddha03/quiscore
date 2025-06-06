"use client";

import { useAuthModal } from "@/context/AuthModalContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export function SignOutModal() {
  const { isSignOutModalOpen, closeSignOutModal } = useAuthModal();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <Dialog open={isSignOutModalOpen} onOpenChange={closeSignOutModal}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Sign Out</DialogTitle>
          <DialogDescription className="text-gray-400">
            Are you sure you want to sign out?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={closeSignOutModal}
            className="text-gray-300 border-gray-600 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSignOut}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Sign Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 