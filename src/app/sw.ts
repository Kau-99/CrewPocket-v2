import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist, type PrecacheEntry } from "serwist";

/**
 * Service worker (SPEC §7):
 * - precache do shell (manifest injetado pelo @serwist/next)
 * - NetworkOnly para Firebase/googleapis — o Firestore gerencia o próprio
 *   offline; interceptar quebra o sync (lição do v1)
 * - defaultCache cobre fonts/imagens/estáticos (CacheFirst/SWR)
 */
declare const self: {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const FIREBASE_HOSTS = [
  "googleapis.com",
  "firebaseio.com",
  "firebaseapp.com",
  "gstatic.com",
  "google.com",
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) =>
        FIREBASE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
