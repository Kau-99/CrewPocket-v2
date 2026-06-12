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
  // emulators locais — o webchannel do Firestore não pode ser interceptado
  "127.0.0.1",
];

const serwist = new Serwist({
  // /~offline entra no precache para o fallback funcionar sem rede
  // (bump da revision se a página mudar — todas as rotas são dinâmicas, ADR-029)
  precacheEntries: [...(self.__SW_MANIFEST ?? []), { url: "/~offline", revision: "1" }],
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
  // navegação sem rede e sem cache: página offline em vez de erro do browser
  // (visto em produção: FetchEvent /login → no-response)
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
