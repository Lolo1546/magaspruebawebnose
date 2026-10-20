import type { ButtonHTMLAttributes } from "react";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";
export type ButtonSize = "sm" | "md";

type NativeButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

type SharedButtonProps = Omit<NativeButtonProps, "className"> & {
  className?: string;
  size?: ButtonSize;
};

export type ButtonProps = SharedButtonProps &
  (
    | {
        variant: "icon";
        "aria-label": string;
      }
    | {
        variant?: Exclude<ButtonVariant, "icon">;
      }
  );

export function Button({
  className,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const buttonClassName = [
    styles.button,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button className={buttonClassName} type={type} {...props} />;
}
