"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDhakaToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseDate(value) {
  const today = getDhakaToday();
  const offsets = { yesterday: -1, today: 0, tomorrow: 1 };
  const base = new Date(`${today}T12:00:00`);

  if (value in offsets) {
    base.setDate(base.getDate() + offsets[value]);
    return base;
  }

  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? base : parsed;
}

function normalizeDateValue(date) {
  const dateString = toDateString(date);
  const today = parseDate("today");
  const yesterday = new Date(today);
  const tomorrow = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  tomorrow.setDate(today.getDate() + 1);

  if (dateString === toDateString(today)) return "today";
  if (dateString === toDateString(yesterday)) return "yesterday";
  if (dateString === toDateString(tomorrow)) return "tomorrow";
  return dateString;
}

function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];
}

export default function DateSelector({ selectedDate, setSelectedDate }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const selected = useMemo(() => parseDate(selectedDate), [selectedDate]);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );
  const selectorRef = useRef(null);

  useEffect(() => {
    function closeCalendar(event) {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setCalendarOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setCalendarOpen(false);
    }

    document.addEventListener("pointerdown", closeCalendar);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", closeCalendar);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(selected);
  const relativeLabel = selectedDate === "today"
    ? "Today"
    : selectedDate === "yesterday"
      ? "Yesterday"
      : selectedDate === "tomorrow"
        ? "Tomorrow"
        : null;
  const calendarDays = getCalendarDays(visibleMonth);
  const selectedDateString = toDateString(selected);
  const todayDateString = getDhakaToday();

  function shiftSelectedDate(offset) {
    const nextDate = new Date(selected);
    nextDate.setDate(nextDate.getDate() + offset);
    setSelectedDate(normalizeDateValue(nextDate));
    setCalendarOpen(false);
  }

  function toggleCalendar() {
    if (!calendarOpen) {
      setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
    setCalendarOpen((open) => !open);
  }

  function shiftVisibleMonth(offset) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function selectCalendarDate(date) {
    setSelectedDate(normalizeDateValue(date));
    setCalendarOpen(false);
  }

  return (
    <div className="date-selector" ref={selectorRef}>
      <button
        type="button"
        className="date-shift-button"
        onClick={() => shiftSelectedDate(-1)}
        aria-label="Show previous day"
        title="Previous day"
      >
        <Icon name="chevronLeft" />
      </button>

      <button
        type="button"
        className="date-current-button"
        onClick={toggleCalendar}
        aria-haspopup="dialog"
        aria-expanded={calendarOpen}
        aria-controls="match-date-calendar"
      >
        <Icon name="calendar" />
        <span className="date-current-copy">
          {relativeLabel && <strong>{relativeLabel}</strong>}
          <span>{dateLabel}</span>
        </span>
        <Icon name="chevronDown" className={calendarOpen ? "date-selector-chevron-open" : ""} />
      </button>

      <button
        type="button"
        className="date-shift-button"
        onClick={() => shiftSelectedDate(1)}
        aria-label="Show next day"
        title="Next day"
      >
        <Icon name="chevronRight" />
      </button>

      {calendarOpen && (
        <div
          id="match-date-calendar"
          className="date-calendar-popover"
          role="dialog"
          aria-label="Choose match date"
        >
          <div className="date-calendar-header">
            <button type="button" onClick={() => shiftVisibleMonth(-1)} aria-label="Previous month">
              <Icon name="chevronLeft" />
            </button>
            <strong>
              {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth)}
            </strong>
            <button type="button" onClick={() => shiftVisibleMonth(1)} aria-label="Next month">
              <Icon name="chevronRight" />
            </button>
          </div>

          <div className="date-calendar-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>

          <div className="date-calendar-grid">
            {calendarDays.map((date, index) => date ? (
              <button
                type="button"
                key={toDateString(date)}
                className={`date-calendar-day${toDateString(date) === selectedDateString ? " selected" : ""}${toDateString(date) === todayDateString ? " today" : ""}`}
                onClick={() => selectCalendarDate(date)}
                aria-label={new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(date)}
                aria-pressed={toDateString(date) === selectedDateString}
              >
                {date.getDate()}
              </button>
            ) : <span className="date-calendar-empty" key={`empty-${index}`} />)}
          </div>

          <button
            type="button"
            className="date-calendar-today-button"
            onClick={() => selectCalendarDate(parseDate("today"))}
          >
            Jump to today
          </button>
        </div>
      )}
    </div>
  );
}
