import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * OKAMI Toast — sistema de notificações alinhado com Design System v0.2.0
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success("Deploy concluído", "v2.4.1 em prod");
 *   toast.warning("Rate limit alto", "OpenAI em 82% do limite");
 *   toast.danger("Falha ao salvar", "Conexão SSH caiu");
 *
 * Cada toast some sozinho após 5s (ou clica no X).
 */

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant, title, message, opts = {}) => {
    const id = nextId++;
    const ttl = opts.ttl ?? 5000;
    setToasts((current) => [...current, { id, variant, title, message }]);
    if (ttl > 0) {
      setTimeout(() => dismiss(id), ttl);
    }
    return id;
  }, [dismiss]);

  const api = {
    info:    (title, message, opts) => push("info",    title, message, opts),
    success: (title, message, opts) => push("success", title, message, opts),
    warning: (title, message, opts) => push("warning", title, message, opts),
    danger:  (title, message, opts) => push("danger",  title, message, opts),
    action:  (title, message, opts) => push("action",  title, message, opts),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ok-toast-container" role="region" aria-label="Notificações" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ variant, title, message, onDismiss }) {
  return (
    <div className={`ok-toast ok-toast--${variant}`} role="status">
      <span className="ok-toast__stripe" aria-hidden="true" />
      <div className="ok-toast__body">
        {title ? <span className="ok-toast__title">{title}</span> : null}
        {message ? <span className="ok-toast__message">{message}</span> : null}
      </div>
      <button
        className="ok-toast__close"
        type="button"
        onClick={onDismiss}
        aria-label="Fechar notificação"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback silencioso se ainda não tem provider montado (não bloqueia).
    return {
      info: () => null,
      success: () => null,
      warning: () => null,
      danger: () => null,
      action: () => null,
      dismiss: () => null,
    };
  }
  return ctx;
}
