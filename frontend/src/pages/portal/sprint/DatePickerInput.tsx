"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Field } from "@/components/ui/field";
import type { Matcher } from "react-day-picker";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

function formatDate(date: Date | undefined) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isValidDate(date: Date | undefined) {
  if (!date) return false;
  return !isNaN(date.getTime());
}

interface DatePickerInputProps {
  date?: Date;
  onDateChange?: (date?: Date) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean | Matcher | Matcher[];
  required?: boolean;
  id?: string;
  name?: string;
}

export function DatePickerInput({
  date: externalDate,
  onDateChange,
  label = "Select Date",
  placeholder = "Select a date",
  className = "",
  inputClassName = "",
  disabled = false,
  required = false,
  id,
  name,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(
    externalDate || new Date(),
  );
  const [month, setMonth] = React.useState<Date | undefined>(
    externalDate || internalDate,
  );
  const [value, setValue] = React.useState(
    formatDate(externalDate || internalDate),
  );

  // Ref to measure input group container width
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState<
    number | undefined
  >(undefined);

  // Only boolean for input/button
  const isDisabled = typeof disabled === "boolean" ? disabled : false;

  // Use either external controlled date or internal state
  const currentDate = externalDate !== undefined ? externalDate : internalDate;
  const currentValue =
    externalDate !== undefined ? formatDate(externalDate) : value;

  // Sync with external state
  React.useEffect(() => {
    if (externalDate !== undefined) {
      setValue(formatDate(externalDate));
      setMonth(externalDate);
    }
  }, [externalDate]);

  // Measure container width when popup opens
  React.useEffect(() => {
    if (open && containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [open]);

  const handleDateSelect = (date?: Date) => {
    if (onDateChange) {
      onDateChange(date);
      setValue(formatDate(date));
    } else {
      setInternalDate(date);
      setValue(formatDate(date));
    }
    setMonth(date);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    const date = new Date(newValue);
    if (isValidDate(date)) {
      if (onDateChange) {
        onDateChange(date);
      } else {
        setInternalDate(date);
      }
      setMonth(date);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <Field className={`mx-auto ${className}`}>
      <InputGroup ref={containerRef}>
        <InputGroupInput
          id={inputId}
          name={name}
          value={currentValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          required={required}
          className={inputClassName}
          aria-label={label}
        />

        <InputGroupAddon align="inline-end">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <InputGroupButton
                variant="ghost"
                size="icon-xs"
                aria-label="Select date"
                disabled={isDisabled}
              >
                <CalendarIcon />
                <span className="sr-only">Select date</span>
              </InputGroupButton>
            </PopoverTrigger>

            <PopoverContent
              className="overflow-hidden p-0"
              align="end"
              // alignOffset={-8}
              // sideOffset={10}

              style={{
                width: containerWidth ? `${containerWidth}px` : "auto",
                minWidth: "200px",
              }}
            >
              <Calendar
                mode="single"
                selected={currentDate}
                month={month}
                onMonthChange={setMonth}
                onSelect={handleDateSelect}
                disabled={disabled}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
