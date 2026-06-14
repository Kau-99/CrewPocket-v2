import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type UserCredential,
} from "firebase/auth";

import { auth } from "@/lib/firebase/client";
import { requestPasswordResetEmail } from "@/lib/auth/reset";

/** SPEC §6.5: popup, nunca redirect (quebra em Safari/ITP). */
export function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // best-effort: a conta JÁ existe — falha no e-mail de verificação não pode
  // abortar o signup (o retry diria "email already in use")
  void sendEmailVerification(credential.user).catch(() => undefined);
  return credential;
}

export function requestPasswordReset(email: string): Promise<void> {
  return requestPasswordResetEmail(email);
}

export function signOutUser(): Promise<void> {
  return signOut(auth);
}
