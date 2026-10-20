import {
  CircleAlert,
  FileQuestion,
  Inbox,
  LockKeyhole,
  SearchX,
  ShieldAlert,
  Trash2,
  UserRoundX,
} from "lucide-react";
import type { ReactNode } from "react";

import styles from "./FeedbackState.module.css";

export type FeedbackStateProps = {
  className?: string;
  description: ReactNode;
  eyebrow?: string;
  headingLevel?: 1 | 2 | 3;
  icon?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  title: string;
};

type FeedbackFrameProps = FeedbackStateProps & {
  live?: "assertive" | "polite";
  role?: "alert" | "status";
  tone?: "danger" | "info" | "neutral" | "warning";
};

export type AccessStateKind =
  | "blocked"
  | "deleted"
  | "forbidden"
  | "suspended"
  | "unauthenticated";

export type AccessStateProps = FeedbackStateProps & {
  kind: AccessStateKind;
};

function FeedbackFrame({
  className,
  description,
  eyebrow,
  headingLevel = 2,
  icon,
  live,
  primaryAction,
  role,
  secondaryAction,
  title,
  tone = "neutral",
}: FeedbackFrameProps) {
  const stateClassName = [styles.state, styles[tone], className]
    .filter(Boolean)
    .join(" ");
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 3 ? "h3" : "h2";

  return (
    <section
      aria-live={live}
      aria-atomic={live ? true : undefined}
      className={stateClassName}
      role={role}
    >
      {icon ? (
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      ) : null}
      <div className={styles.copy}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <Heading className={styles.title}>{title}</Heading>
        <div className={styles.description}>{description}</div>
      </div>
      {primaryAction || secondaryAction ? (
        <div className={styles.actions}>
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </section>
  );
}

export function EmptyState({ icon, ...props }: FeedbackStateProps) {
  return (
    <FeedbackFrame
      icon={icon ?? <Inbox size={30} />}
      role="status"
      tone="neutral"
      {...props}
    />
  );
}

export function NoResults({ icon, ...props }: FeedbackStateProps) {
  return (
    <FeedbackFrame
      icon={icon ?? <SearchX size={30} />}
      role="status"
      tone="info"
      {...props}
    />
  );
}

export function ErrorState({ icon, ...props }: FeedbackStateProps) {
  return (
    <FeedbackFrame
      icon={icon ?? <CircleAlert size={30} />}
      live="assertive"
      role="alert"
      tone="danger"
      {...props}
    />
  );
}

export function AccessState({ icon, kind, ...props }: AccessStateProps) {
  const accessPresentation: Record<
    AccessStateKind,
    { defaultIcon: ReactNode; eyebrow: string; tone: FeedbackFrameProps["tone"] }
  > = {
    blocked: {
      defaultIcon: <UserRoundX size={30} />,
      eyebrow: "Privacidad",
      tone: "warning",
    },
    deleted: {
      defaultIcon: <Trash2 size={30} />,
      eyebrow: "Contenido no disponible",
      tone: "neutral",
    },
    forbidden: {
      defaultIcon: <ShieldAlert size={30} />,
      eyebrow: "Acceso restringido",
      tone: "warning",
    },
    suspended: {
      defaultIcon: <FileQuestion size={30} />,
      eyebrow: "Moderación",
      tone: "warning",
    },
    unauthenticated: {
      defaultIcon: <LockKeyhole size={30} />,
      eyebrow: "Inicio de sesión requerido",
      tone: "info",
    },
  };
  const presentation = accessPresentation[kind];

  return (
    <FeedbackFrame
      eyebrow={props.eyebrow ?? presentation.eyebrow}
      icon={icon ?? presentation.defaultIcon}
      role="status"
      tone={presentation.tone}
      {...props}
    />
  );
}
