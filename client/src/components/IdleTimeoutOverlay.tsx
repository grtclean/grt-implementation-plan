/**
 * IdleTimeoutOverlay — Full-screen re-authentication prompt
 *
 * Shown when the user has been idle for 30 minutes.
 * Provides a "Continue Working" button (mock re-auth) or
 * a "Sign Out" link for full logout.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import BrandLogo from "@/components/common/BrandLogo";
import { Lock, LogOut, ShieldCheck } from "lucide-react";

interface IdleTimeoutOverlayProps {
  onReauthenticate: () => void;
  onLogout: () => void;
  resolvedDisplayName: string;
  showWarning?: boolean;
  onDismissWarning?: () => void;
}

export default function IdleTimeoutOverlay({
  onReauthenticate,
  onLogout,
  resolvedDisplayName,
  showWarning,
  onDismissWarning,
}: IdleTimeoutOverlayProps) {
  const [pin, setPin] = useState("");

  // Warning banner — shown 2 min before lockout
  if (showWarning) {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 shadow-lg">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800">
            Session expires in 2 minutes due to inactivity
          </span>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={onDismissWarning}
          >
            Stay Active
          </Button>
        </div>
      </div>
    );
  }

  // Full lockout screen
  return (
    <div className="fixed inset-0 z-[200] bg-slate-100/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl border-0">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-5">
          <div className="flex justify-center">
            <BrandLogo size="lg" variant="icon" />
          </div>

          <div>
            <div className="w-16 h-16 mx-auto mb-3 bg-blue-50 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Session Locked</h2>
            <p className="text-sm text-gray-500 mt-1">
              {resolvedDisplayName}, your session was locked due to 30 minutes of inactivity.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Enter PIN or password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onReauthenticate();
              }}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
            <Button
              className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white gap-2"
              onClick={onReauthenticate}
            >
              <Lock className="w-4 h-4" />
              Continue Working
            </Button>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 mx-auto text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out completely
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
