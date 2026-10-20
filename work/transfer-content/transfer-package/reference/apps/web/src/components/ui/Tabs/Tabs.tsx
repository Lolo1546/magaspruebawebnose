"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import styles from "./Tabs.module.css";

export type TabItem = {
  disabled?: boolean;
  label: ReactNode;
  panel: ReactNode;
  value: string;
};

export type TabsProps = {
  "aria-label": string;
  className?: string;
  defaultValue?: string;
  items: readonly TabItem[];
  onValueChange?: (value: string) => void;
  value?: string;
};

export function Tabs({
  "aria-label": ariaLabel,
  className,
  defaultValue,
  items,
  onValueChange,
  value,
}: TabsProps) {
  const generatedId = useId();
  const firstEnabledValue = items.find((item) => !item.disabled)?.value;
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? firstEnabledValue,
  );
  const requestedValue = value ?? internalValue;
  const activeValue = items.some(
    (item) => item.value === requestedValue && !item.disabled,
  )
    ? requestedValue
    : firstEnabledValue;
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const tabsClassName = [styles.tabs, className].filter(Boolean).join(" ");

  function selectTab(item: TabItem) {
    if (item.disabled) {
      return;
    }

    if (value === undefined) {
      setInternalValue(item.value);
    }
    onValueChange?.(item.value);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    const enabledIndexes = items.flatMap((item, index) =>
      item.disabled ? [] : [index],
    );
    const position = enabledIndexes.indexOf(currentIndex);
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") {
      nextIndex = enabledIndexes[(position + 1) % enabledIndexes.length];
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        enabledIndexes[
          (position - 1 + enabledIndexes.length) % enabledIndexes.length
        ];
    } else if (event.key === "Home") {
      nextIndex = enabledIndexes[0];
    } else if (event.key === "End") {
      nextIndex = enabledIndexes.at(-1);
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    const nextItem = items[nextIndex];
    selectTab(nextItem);
    tabRefs.current.get(nextItem.value)?.focus();
  }

  return (
    <div className={tabsClassName}>
      <div aria-label={ariaLabel} className={styles.list} role="tablist">
        {items.map((item, index) => {
          const isActive = item.value === activeValue;
          const tabId = `${generatedId}-tab-${index}`;
          const panelId = `${generatedId}-panel-${index}`;

          return (
            <button
              aria-controls={panelId}
              aria-selected={isActive}
              className={styles.tab}
              disabled={item.disabled}
              id={tabId}
              key={item.value}
              onClick={() => selectTab(item)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              ref={(node) => {
                if (node) {
                  tabRefs.current.set(item.value, node);
                } else {
                  tabRefs.current.delete(item.value);
                }
              }}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {items.map((item, index) => {
        const isActive = item.value === activeValue;

        return (
          <div
            aria-labelledby={`${generatedId}-tab-${index}`}
            className={styles.panel}
            hidden={!isActive}
            id={`${generatedId}-panel-${index}`}
            key={item.value}
            role="tabpanel"
            tabIndex={0}
          >
            {item.panel}
          </div>
        );
      })}
    </div>
  );
}
