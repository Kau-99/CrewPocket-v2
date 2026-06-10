import type { Dictionary } from "./en";

export const es: Dictionary = {
  appName: "CrewPocket",
  common: {
    loading: "Cargando…",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    undo: "Deshacer",
    retry: "Reintentar",
    offlineBadge: "Sin conexión — los cambios se sincronizarán",
  },
  errors: {
    "auth/expired": "Tu sesión expiró. Inicia sesión de nuevo.",
    "auth/unauthorized": "No tienes permiso para hacer eso.",
    "firestore/permission-denied": "No tienes permiso para hacer eso.",
    "firestore/not-found": "Este elemento ya no existe.",
    "stripe/checkout-failed": "No pudimos iniciar el pago. Inténtalo de nuevo.",
    "stripe/portal-failed": "No pudimos abrir el portal de facturación. Inténtalo de nuevo.",
    offline: "Estás sin conexión. Esta acción se completará cuando vuelvas a estar en línea.",
    validation: "Algunos campos no son válidos. Revísalos e inténtalo de nuevo.",
    unknown: "Algo salió mal. Inténtalo de nuevo.",
  },
};
