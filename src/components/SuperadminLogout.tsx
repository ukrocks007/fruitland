"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SuperadminLogout() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
  };

  return (
    <Button variant="outline" onClick={handleLogout} title="Logout">
      Logout
    </Button>
  );
}
