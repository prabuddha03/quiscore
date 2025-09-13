"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthModal } from "@/context/AuthModalContext";
import { LogOut, User, Trophy } from "lucide-react";
import Link from "next/link";

export function UserAuth() {
  const { data: session, status } = useSession();
  const { openSignInModal, openSignOutModal } = useAuthModal();

  if (status === "loading") {
    return <div className="h-9 w-20 animate-pulse rounded-md bg-gray-800" />;
  }

  if (status === "unauthenticated") {
    return (
      <Button
        onClick={openSignInModal}
        className="bg-orange-500 text-white hover:bg-orange-600"
      >
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={session?.user?.image ?? ""}
              alt={session?.user?.name ?? "User"}
            />
            <AvatarFallback>
              {session?.user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-gray-900 border-gray-700 text-white" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
            <p className="text-xs leading-none text-gray-400">
              {session?.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem asChild className="cursor-pointer hover:!bg-gray-800">
            <Link href="/dashboard">
                <User className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer hover:!bg-gray-800">
            <Link href="/leaderboard">
                <Trophy className="mr-2 h-4 w-4" />
                <span>Leaderboard</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem onClick={openSignOutModal} className="cursor-pointer hover:!bg-red-500/20">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 