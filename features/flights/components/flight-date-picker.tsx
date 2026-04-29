"use client";

import {CalendarDays, ChevronLeft, ChevronRight} from "lucide-react";
import {useEffect, useId, useMemo, useRef, useState} from "react";

import {Label} from "@/components/ui/label";
import {cn} from "@/lib/utils";

type FlightDatePickerProps = {
  disabled?: boolean;
  label: string;
  onChange: (value: Date) => void;
  value: Date | null;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric"
});
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric"
});
const DAY_NAME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long"
});

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDay(left: Date | null, right: Date | null) {
  if (!left || !right) {
    return false;
  }

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isSameMonth(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
}

function isBeforeDay(left: Date, right: Date) {
  return startOfDay(left).getTime() < startOfDay(right).getTime();
}

function buildCalendarDays(viewMonth: Date) {
  const monthStart = startOfMonth(viewMonth);
  const gridStart = addDays(monthStart, -monthStart.getDay());

  return Array.from({length: 42}, (_, index) => addDays(gridStart, index));
}

export function FlightDatePicker({
  disabled = false,
  label,
  onChange,
  value
}: FlightDatePickerProps) {
  const labelId = useId();
  const calendarId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const selectedDate = useMemo(() => (value ? startOfDay(value) : null), [value]);
  const selectedTime = selectedDate?.getTime() ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(selectedDate ?? today)
  );
  const canGoToPreviousMonth =
    viewMonth.getFullYear() > today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() &&
      viewMonth.getMonth() > today.getMonth());
  const calendarDays = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    setViewMonth(startOfMonth(selectedDate));
  }, [selectedTime, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleToggleCalendar() {
    if (disabled) {
      return;
    }

    if (!isOpen) {
      setViewMonth(startOfMonth(selectedDate ?? today));
    }

    setIsOpen((current) => !current);
  }

  function handleSelectDate(date: Date) {
    if (disabled || isBeforeDay(date, today)) {
      return;
    }

    onChange(startOfDay(date));
    setViewMonth(startOfMonth(date));
    setIsOpen(false);
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <Label id={labelId}>{label}</Label>

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-controls={calendarId}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-labelledby={labelId}
          className={cn(
            "flex h-11 w-full items-center justify-between rounded-lg border border-border/80 bg-background px-4 text-left text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          )}
          onClick={handleToggleCalendar}
        >
          <span className={cn(!selectedDate && "text-muted-foreground")}>
            {selectedDate ? DATE_FORMATTER.format(selectedDate) : "Select date"}
          </span>

          <CalendarDays aria-hidden="true" className="h-4 w-4 text-primary" />
        </button>

        {selectedDate ? (
          <p className="mt-2 px-1 text-xs font-medium text-muted-foreground">
            {DAY_NAME_FORMATTER.format(selectedDate)}
          </p>
        ) : null}

        {isOpen ? (
          <div
            id={calendarId}
            role="dialog"
            aria-modal="false"
            className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-lg border border-border/80 bg-card/95 p-4 text-card-foreground shadow-soft backdrop-blur sm:right-auto sm:w-[19rem]"
          >
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={!canGoToPreviousMonth}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setViewMonth((current) => addMonths(current, -1))}
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>

              <p className="text-sm font-semibold text-foreground">
                {MONTH_FORMATTER.format(viewMonth)}
              </p>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-foreground shadow-sm transition-colors hover:bg-muted"
                onClick={() => setViewMonth((current) => addMonths(current, 1))}
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((weekday) => (
                <span
                  key={weekday}
                  className="py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {weekday}
                </span>
              ))}

              {calendarDays.map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const isCurrentMonth = isSameMonth(date, viewMonth);
                const isPastDate = isBeforeDay(date, today);
                const isToday = isSameDay(date, today);

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    disabled={isPastDate}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      isSelected && "bg-[#f97316] text-white shadow-sm hover:bg-[#ea580c]",
                      !isSelected &&
                        !isPastDate &&
                        "text-foreground hover:bg-secondary hover:text-secondary-foreground",
                      !isSelected &&
                        isPastDate &&
                        "cursor-not-allowed bg-muted/30 text-muted-foreground/45",
                      !isSelected &&
                        !isCurrentMonth &&
                        !isPastDate &&
                        "text-muted-foreground",
                      isToday && !isSelected && "border border-[#f97316]/35 text-foreground"
                    )}
                    onClick={() => handleSelectDate(date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

