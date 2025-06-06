"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Input } from "./ui/input";

interface QRCodeModalProps {
  url: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRCodeModal({ url, title, open, onOpenChange }: QRCodeModalProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy URL.");
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Share: {title}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Anyone with this QR code can view the public scoreboard.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 bg-white rounded-md flex justify-center">
          <QRCodeCanvas
            value={url}
            size={256}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Input value={url} readOnly className="bg-gray-800 border-gray-600"/>
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 