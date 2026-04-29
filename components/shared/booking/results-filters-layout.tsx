"use client";

import {type ReactNode, useEffect, useId, useRef, useState} from "react";
import {SlidersHorizontal, X} from "lucide-react";
import {useTranslations} from "next-intl";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

type ResultsFiltersLayoutProps = {
  children: ReactNode;
  clearLabel?: string;
  filtersContent: ReactNode;
  onClear?: () => void;
  title: string;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled")
  );
}

export function ResultsFiltersLayout({
  children,
  clearLabel,
  filtersContent,
  onClear,
  title
}: ResultsFiltersLayoutProps) {
  const t = useTranslations("Common");
  const [isOpen, setIsOpen] = useState(false);
  const dialogId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    const panel = panelRef.current;
    const focusableElements = getFocusableElements(panel);
    const initialFocusTarget = focusableElements[0] ?? panel;

    document.body.style.overflow = "hidden";
    initialFocusTarget?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const activePanel = panelRef.current;
      const activeElements = getFocusableElements(activePanel);

      if (!activePanel || activeElements.length === 0) {
        event.preventDefault();
        activePanel?.focus();
        return;
      }

      const firstElement = activeElements[0];
      const lastElement = activeElements[activeElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !activePanel.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }

        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    function handleBreakpointChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", handleBreakpointChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleBreakpointChange);

      if (!window.matchMedia("(min-width: 1024px)").matches) {
        triggerElement?.focus();
      }
    };
  }, [isOpen]);

  return (
    <>
      <div className="space-y-4 lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-6 lg:space-y-0">
        <div className="lg:hidden">
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            className="w-full justify-center gap-2 rounded-lg"
            aria-controls={dialogId}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-label={t("openFilters")}
            onClick={() => setIsOpen(true)}
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            {t("filters")}
          </Button>
        </div>

        <aside className="hidden lg:block">
          <Card className="border-border/80 bg-card/92 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="inline-flex items-center gap-2 text-xl">
                <SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-primary" />
                {title}
              </CardTitle>
              {clearLabel && onClear ? (
                <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                  {clearLabel}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-5">{filtersContent}</CardContent>
          </Card>
        </aside>

        <div>{children}</div>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <div
            id={dialogId}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${dialogId}-title`}
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col overflow-hidden rounded-t-[1.75rem] border border-border/80 bg-card/98 shadow-soft"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-4">
              <h2
                id={`${dialogId}-title`}
                className="inline-flex items-center gap-2 text-lg font-semibold text-foreground"
              >
                <SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-primary" />
                {title}
              </h2>

              <div className="flex items-center gap-2">
                {clearLabel && onClear ? (
                  <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                    {clearLabel}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("closeFilters")}
                  onClick={() => setIsOpen(false)}
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto px-4 py-5">
              <div className="space-y-5">{filtersContent}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
