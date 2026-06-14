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
    // `translate="no"`/`notranslate`: o tradutor do navegador (ex.: Google
    // Translate) reescreve nós de texto e briga com o React, blankando o card
    // (vira um retângulo cinza). Marcar o widget como não-traduzível mantém o
    // DOM estável — o texto de marca ("Install") fica curto e legível.
    <div
      translate="no"
      className="notranslate fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-50 md:inset-x-auto md:bottom-4 md:right-4 md:w-80"
    >
      <div className="flex items-center gap-3 rounded-xl border bg-card/95 p-2.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download className="size-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{t.title}</p>
          {ios ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs leading-tight text-muted-foreground">
              {t.iosBefore}
              <Share className="inline size-3.5" aria-hidden="true" />
              {t.iosAfter}
            </p>
          ) : (
            <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">{t.body}</p>
          )}
        </div>
        {!ios && (
          <Button size="sm" className="h-8 shrink-0 px-3" onClick={() => void install()}>
            {t.button}
          </Button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={t.dismiss}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
