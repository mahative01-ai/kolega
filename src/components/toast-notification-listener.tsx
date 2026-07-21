"use client";

import { useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

interface ToastNotificationListenerProps {
  successMessages?: Record<string, string>;
  errorMessages?: Record<string, string>;
  warningMessages?: Record<string, string>;
  infoMessages?: Record<string, string>;
}

export function ToastNotificationListener({
  successMessages = {},
  errorMessages = {},
  warningMessages = {},
  infoMessages = {},
}: ToastNotificationListenerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const successKey = searchParams.get("success");
    const errorKey = searchParams.get("error");
    const warningKey = searchParams.get("warning");
    const infoKey = searchParams.get("info");

    let hasToast = false;

    if (successKey) {
      const msg = successMessages[successKey] || successKey;
      if (msg) {
        toast.success(msg);
        hasToast = true;
      }
    }

    if (errorKey) {
      const msg = errorMessages[errorKey] || errorKey;
      if (msg) {
        toast.error(msg);
        hasToast = true;
      }
    }

    if (warningKey) {
      const msg = warningMessages[warningKey] || warningKey;
      if (msg) {
        toast.warning(msg);
        hasToast = true;
      }
    }

    if (infoKey) {
      const msg = infoMessages[infoKey] || infoKey;
      if (msg) {
        toast.info(msg);
        hasToast = true;
      }
    }

    if (hasToast) {
      // Clean query parameters from URL without causing a full page refresh
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("success");
      newParams.delete("error");
      newParams.delete("warning");
      newParams.delete("info");
      newParams.delete("time");
      newParams.delete("remaining");

      const newQuery = newParams.toString();
      const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, pathname, router, successMessages, errorMessages, warningMessages, infoMessages]);

  return null;
}
