"use client";

import {usePathname} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";

type PendingKind = "action" | "acknowledge" | "navigation";

type PendingState = {
  id: number;
  kind: PendingKind;
};

const ACTION_TIMEOUT_MS = 10000;
const ACKNOWLEDGE_TIMEOUT_MS = 1200;
const MINIMUM_VISIBLE_MS = 850;
const ROUTE_SETTLE_DELAY_MS = 180;

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function getInteractiveElement(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<HTMLElement>(
    'a[href], button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]'
  );
}

function isDisabledElement(element: HTMLElement) {
  if (element.getAttribute("aria-disabled") === "true") {
    return true;
  }

  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element.disabled;
  }

  return Boolean(element.closest("fieldset[disabled]"));
}

function getNavigableAnchor(element: HTMLElement) {
  return element.closest<HTMLAnchorElement>("a[href]");
}

function isTrackableNavigation(anchor: HTMLAnchorElement, event: MouseEvent) {
  if (event.defaultPrevented || isModifiedClick(event)) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  const url = new URL(anchor.href, window.location.href);

  if (url.origin !== window.location.origin) {
    return false;
  }

  const isCurrentUrl =
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash === window.location.hash;

  if (isCurrentUrl) {
    return false;
  }

  const isSameDocumentHash =
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash !== "" &&
    url.hash !== window.location.hash;

  return !isSameDocumentHash;
}

function getButtonKind(element: HTMLElement): PendingKind {
  if (element instanceof HTMLInputElement && element.type === "submit") {
    return "action";
  }

  if (element instanceof HTMLButtonElement) {
    const type = element.type || "submit";

    return type === "submit" && element.form ? "action" : "acknowledge";
  }

  return "acknowledge";
}

export function GlobalInteractionFeedback() {
  const pathname = usePathname();
  const [pending, setPending] = useState<PendingState | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const pendingRef = useRef<PendingState | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const navigationStartedAtRef = useRef<string | null>(null);
  const pendingIdRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

  }, []);

  const clearActiveElement = useCallback(() => {
    activeElementRef.current?.removeAttribute("data-interaction-pending");
    activeElementRef.current = null;
  }, []);

  const finishNow = useCallback(() => {
    clearTimers();
    clearActiveElement();
    startedAtRef.current = null;
    navigationStartedAtRef.current = null;
    pendingRef.current = null;
    setPending(null);
    setShowDetails(false);
  }, [clearActiveElement, clearTimers]);

  const finish = useCallback(() => {
    const startedAt = startedAtRef.current;
    const remainingTime =
      startedAt === null ? 0 : Math.max(MINIMUM_VISIBLE_MS - (Date.now() - startedAt), 0);

    if (remainingTime > 0) {
      clearTimers();
      timeoutRef.current = window.setTimeout(finishNow, remainingTime);
      return;
    }

    finishNow();
  }, [clearTimers, finishNow]);

  const begin = useCallback(
    (kind: PendingKind, element: HTMLElement | null) => {
      clearTimers();
      clearActiveElement();

      const nextPending = {
        id: pendingIdRef.current + 1,
        kind
      };
      pendingIdRef.current = nextPending.id;
      pendingRef.current = nextPending;
      startedAtRef.current = Date.now();
      navigationStartedAtRef.current = kind === "navigation" ? window.location.href : null;

      if (element) {
        element.setAttribute("data-interaction-pending", "true");
        activeElementRef.current = element;
      }

      setPending(nextPending);
      setShowDetails(true);

      timeoutRef.current = window.setTimeout(
        finish,
        kind === "acknowledge" ? ACKNOWLEDGE_TIMEOUT_MS : ACTION_TIMEOUT_MS
      );
    },
    [clearActiveElement, clearTimers, finish]
  );

  const settleNavigation = useCallback(() => {
    if (pendingRef.current?.kind !== "navigation") {
      return;
    }

    window.setTimeout(() => {
      if (pendingRef.current?.kind === "navigation") {
        finish();
      }
    }, ROUTE_SETTLE_DELAY_MS);
  }, [finish]);

  useEffect(() => {
    if (!pending) {
      document.documentElement.removeAttribute("data-global-interaction-pending");
      return;
    }

    document.documentElement.setAttribute("data-global-interaction-pending", pending.kind);

    return () => {
      document.documentElement.removeAttribute("data-global-interaction-pending");
    };
  }, [pending]);

  useEffect(() => {
    settleNavigation();
  }, [pathname, settleNavigation]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const element = getInteractiveElement(event.target);

      if (!element || isDisabledElement(element)) {
        return;
      }

      const anchor = getNavigableAnchor(element);

      if (anchor && isTrackableNavigation(anchor, event)) {
        begin("navigation", element);
        return;
      }

      if (element.matches('button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]')) {
        begin(getButtonKind(element), element);
      }
    }

    function handleSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) {
        return;
      }

      begin("action", event.submitter instanceof HTMLElement ? event.submitter : null);
    }

    function handleUrlChange() {
      const startedAt = navigationStartedAtRef.current;

      if (startedAt && startedAt !== window.location.href) {
        settleNavigation();
      }
    }

    function handlePageShow() {
      finish();
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("aurevia:navigation-change", handleUrlChange);
    window.addEventListener("hashchange", handleUrlChange);
    window.addEventListener("pageshow", handlePageShow);

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event("aurevia:navigation-change"));
      return result;
    };

    window.history.replaceState = function replaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event("aurevia:navigation-change"));
      return result;
    };

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("aurevia:navigation-change", handleUrlChange);
      window.removeEventListener("hashchange", handleUrlChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      finish();
    };
  }, [begin, finish, settleNavigation]);

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="global-interaction-feedback"
      data-visible={pending ? "true" : "false"}
      role="status"
    >
      <span className="sr-only">
        {pending?.kind === "navigation" ? "Loading page" : pending ? "Working" : ""}
      </span>
      <div aria-hidden="true" className="global-interaction-feedback__bar" />
      <div
        aria-hidden="true"
        className="global-interaction-feedback__pill"
        data-visible={showDetails ? "true" : "false"}
      >
        <span className="global-interaction-feedback__spinner" />
        <span>{pending?.kind === "navigation" ? "Loading page" : "Working"}</span>
      </div>
    </div>
  );
}
