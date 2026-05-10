"use client";

import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastInput = Omit<Toast, "id">;

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let globalToasts: Toast[] = [];

function updateToasts(toasts: Toast[]) {
  globalToasts = toasts;
  toastListeners.forEach((l) => l(toasts));
}

export function toast(input: ToastInput) {
  const id = Math.random().toString(36).slice(2);
  const newToast: Toast = { id, ...input };
  updateToasts([...globalToasts, newToast]);
  setTimeout(() => {
    updateToasts(globalToasts.filter((t) => t.id !== id));
  }, 4000);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(globalToasts);

  const dismiss = useCallback((id: string) => {
    updateToasts(globalToasts.filter((t) => t.id !== id));
  }, []);

  useState(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
    };
  });

  return { toasts, dismiss, toast };
}
