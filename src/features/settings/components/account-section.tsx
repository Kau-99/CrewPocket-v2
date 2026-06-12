"use client";

import { sendPasswordResetEmail, signOut } from "firebase/auth";
import { KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { auth } from "@/lib/firebase/client";

/** Conta (SPEC §6.5/§8): reset de senha + deletar conta com confirmação digitada. */
export function AccountSection() {
  const dict = useTranslation();
  const { user } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  function handlePasswordReset() {
    if (!user?.email) return;
    sendPasswordResetEmail(auth, user.email)
      .then(() => toast.success(dict.settings.passwordEmailSent))
      .catch(() => toast.error(dict.errors.unknown));
  }

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await signOut(auth);
      window.location.assign("/");
    } catch {
      toast.error(dict.settings.deleteFailed);
      setDeleting(false);
    }
  }

  const confirmed = confirmText === dict.settings.deleteConfirmWord;

  return (
    <section className="space-y-4 rounded-lg border border-destructive/40 p-4">
      <h2 className="font-semibold">{dict.settings.accountSection}</h2>
      <p className="text-sm text-muted-foreground">
        {dict.settings.signedInAs} <span className="text-foreground">{user?.email}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handlePasswordReset}>
          <KeyRound className="mr-1 size-4" aria-hidden="true" />
          {dict.settings.changePassword}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={() => {
            setConfirmText("");
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="mr-1 size-4" aria-hidden="true" />
          {dict.settings.deleteAccount}
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.settings.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dict.settings.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm">{dict.settings.deleteConfirmLabel}</Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(event) => {
                setConfirmText(event.target.value);
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{dict.common.cancel}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!confirmed || deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? dict.common.loading : dict.settings.deleteAccount}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
