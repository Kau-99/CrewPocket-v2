"use client";

import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { storage } from "@/lib/firebase/client";
import { compressToWebP } from "@/lib/image";
import { logger } from "@/lib/logger";

import { useJobMutations } from "../hooks/use-jobs";
import type { Job } from "../schemas";

/**
 * Fila best-effort para uploads offline (SPEC §7): blobs ficam em memória
 * e sobem quando a conexão volta. Não sobrevive a reload offline (ADR-026).
 */
const pendingUploads: { path: string; blob: Blob; onDone: (url: string) => void }[] = [];
let flushListenerArmed = false;

async function uploadNowOrQueue(
  path: string,
  blob: Blob,
  onDone: (url: string) => void,
): Promise<"uploaded" | "queued"> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    pendingUploads.push({ path, blob, onDone });
    armFlush();
    return "queued";
  }
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: "image/webp" });
  onDone(await getDownloadURL(fileRef));
  return "uploaded";
}

function armFlush() {
  if (flushListenerArmed || typeof window === "undefined") return;
  flushListenerArmed = true;
  window.addEventListener("online", () => {
    void (async () => {
      while (pendingUploads.length > 0) {
        const item = pendingUploads.shift();
        if (!item) break;
        try {
          const fileRef = ref(storage, item.path);
          await uploadBytes(fileRef, item.blob, { contentType: "image/webp" });
          item.onDone(await getDownloadURL(fileRef));
        } catch (error) {
          logger.error("queued photo upload failed", {
            path: item.path,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();
  });
}

/** Tab Photos (SPEC §8): grid, upload comprimido (§6.4), lightbox. */
export function JobPhotos({ job }: { job: Job }) {
  const dict = useTranslation();
  const { user } = useAuth();
  const { setPhotos } = useJobMutations();
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    if (!user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        const blob = await compressToWebP(file, 1600);
        const path = `users/${user.uid}/jobs/${job.id}/${crypto.randomUUID()}.webp`;
        const result = await uploadNowOrQueue(path, blob, (url) => {
          setPhotos.mutate({ job, photoUrls: [...job.photoUrls, url].slice(0, 30) });
        });
        if (result === "queued") toast(dict.jobs.photos.queuedToast);
      }
    } catch {
      toast.error(dict.errors.unknown);
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(url: string) {
    setPhotos.mutate(
      { job, photoUrls: job.photoUrls.filter((photo) => photo !== url) },
      { onError: () => toast.error(dict.errors.unknown) },
    );
    // best-effort no Storage (a URL contém o path encodado)
    try {
      const path = decodeURIComponent(new URL(url).pathname.split("/o/")[1] ?? "");
      if (path) {
        deleteObject(ref(storage, path)).catch(() => undefined);
      }
    } catch {
      // URL inesperada — só remove a referência
    }
    setLightbox(null);
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" disabled={uploading} asChild>
        <label className="cursor-pointer">
          <ImagePlus className="mr-1 size-4" aria-hidden="true" />
          {uploading ? dict.common.loading : dict.jobs.photos.upload}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files?.length) void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </Button>

      {job.photoUrls.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {dict.jobs.photos.empty}
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {job.photoUrls.map((url) => (
            <li key={url}>
              <button
                type="button"
                className="block w-full overflow-hidden rounded-md border focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setLightbox(url);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- URLs do Storage; next/image exige domínio fixo */}
                <img
                  src={url}
                  alt={dict.jobs.photos.alt}
                  className="aspect-square w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={lightbox !== null}
        onOpenChange={(open) => {
          if (!open) setLightbox(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">{dict.jobs.photos.alt}</DialogTitle>
          {lightbox && (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- lightbox de URL do Storage */}
              <img
                src={lightbox}
                alt={dict.jobs.photos.alt}
                className="max-h-[70dvh] w-full rounded object-contain"
              />
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  handleDelete(lightbox);
                }}
              >
                <Trash2 className="mr-1 size-4" aria-hidden="true" />
                {dict.common.delete}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
