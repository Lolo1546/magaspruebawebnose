BEGIN;

ALTER TABLE "EditorialAuditEvent"
    ADD CONSTRAINT "EditorialAuditEvent_manga_version_required" CHECK (
        "actionType"::text NOT IN ('MANGA_CREATED', 'MANGA_UPDATED', 'MANGA_PUBLISHED', 'MANGA_HIDDEN')
        OR (
            "toVersion" IS NOT NULL
            AND (
                ("actionType"::text = 'MANGA_CREATED' AND "fromVersion" IS NULL AND "toVersion" = 1)
                OR (
                    "actionType"::text IN ('MANGA_UPDATED', 'MANGA_PUBLISHED', 'MANGA_HIDDEN')
                    AND "fromVersion" IS NOT NULL
                    AND "toVersion" = "fromVersion" + 1
                )
            )
        )
    );

COMMIT;
