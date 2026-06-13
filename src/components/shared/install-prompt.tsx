"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "cp-install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Convite de instalação do PWA: Android/desktop usam o prompt nativo
 * (beforeinstallprompt); iOS Safari não o tem, então mostramos as instruções
 * de "Adicionar à Tela de Início". Dispensável (lembrado no localStorage).
 */
export function InstallPrompt() {
  const dict = useTranslation();
  const t = dict.install;
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIos()) {
      setIos(true);
      setShow(true);
      return;
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => {
      setShow(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-20 md:bottom-3 md:left-auto md:right-3 md:w-96 md:p-0">
      <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-lg">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Download className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t.title}</p>
          {ios ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              {t.iosBefore}
              <Share className="inline size-4" aria-hidden="true" />
              {t.iosAfter}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">{t.body}</p>
          )}
          {!ios && (
            <Button size="sm" className="mt-2" onClick={() => void install()}>
              <Download className="mr-1 size-4" aria-hidden="true" />
              {t.button}
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t.dismiss}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
