import type { HTMLAttributes } from "react";

import styles from "./PageContainer.module.css";

export type PageContainerProps = HTMLAttributes<HTMLDivElement>;

export function PageContainer({
  className,
  ...props
}: PageContainerProps) {
  const containerClassName = [styles.container, className]
    .filter(Boolean)
    .join(" ");

  return <div className={containerClassName} {...props} />;
}
