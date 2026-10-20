import type { CSSProperties, HTMLAttributes } from "react";

import styles from "./Skeleton.module.css";

export type SkeletonVariant = "circle" | "rectangle" | "text";

export type SkeletonProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  height?: CSSProperties["height"];
  variant?: SkeletonVariant;
  width?: CSSProperties["width"];
};

export function Skeleton({
  className,
  height,
  style,
  variant = "rectangle",
  width,
  ...props
}: SkeletonProps) {
  const skeletonClassName = [styles.skeleton, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={skeletonClassName}
      style={{ ...style, height, width }}
      {...props}
      aria-hidden="true"
    />
  );
}
