import logging
from pathlib import Path
from typing import Any, Dict, List

from celery import shared_task
from src.apps.core.celery_app import celery_app  # noqa: F401 — registers the configured app so shared_task binds to it
from src.apps.core.config import settings
from src.apps.core.email_strategies import MailgunEmailStrategy, SMTPEmailStrategy

logger = logging.getLogger(__name__)

# Default template directory — IAM templates (auth emails).
# Other modules pass their own *template_dir* when calling this task.
TEMPLATE_DIR = Path(__file__).resolve().parent.parent.parent / "apps" / "iam" / "templates"


@shared_task(name="send_email_task")
def send_email_task(
    subject: str,
    recipients: List[Dict[str, str]],
    template_name: str,
    context: Dict[str, Any],
    template_dir: str | None = None,
) -> bool:
    """
    Core email sender Celery task with provider strategies.

    *template_dir* lets calling modules supply their own Jinja2 template
    folder (defaults to the IAM templates directory).
    """
    resolved_dir = Path(template_dir) if template_dir else TEMPLATE_DIR

    if not settings.EMAIL_ENABLED:
        if settings.DEBUG:
            sep = "=" * 60
            lines = [
                "",
                sep,
                "  📧  DEV EMAIL (not sent)",
                sep,
                f"  To      : {', '.join(r['email'] for r in recipients)}",
                f"  Subject : {subject}",
                f"  Template: {template_name}",
            ]
            url_keys = ("reset_url", "verification_url", "whitelist_url", "blacklist_url")
            for key in url_keys:
                value = context.get(key)
                if value:
                    lines.append(f"  {key:<18}: {value}")
                    if "?t=" in value:
                        lines.append(f"  {'token':<18}: {value.split('?t=', 1)[1]}")
            lines += [sep, ""]
            print("\n".join(lines), flush=True)
        else:
            logger.info(
                "Email skipped (EMAIL_ENABLED=False): Subject: %s, Recipients: %s",
                subject,
                [r["email"] for r in recipients],
            )
        return True

    strategies = [MailgunEmailStrategy(), SMTPEmailStrategy()]

    for strategy in strategies:
        if not strategy.is_available():
            logger.debug("Email strategy unavailable: %s", strategy.provider_name)
            continue

        sent = strategy.send(
            subject=subject,
            recipients=recipients,
            template_name=template_name,
            context=context,
            template_dir=resolved_dir,
        )
        if sent:
            logger.info(
                "Email sent via %s: Subject=%s Recipients=%s",
                strategy.provider_name,
                subject,
                [r["email"] for r in recipients],
            )
            return True

        logger.warning(
            "Email strategy failed: %s. Trying next strategy (if any).",
            strategy.provider_name,
        )

    logger.error("All email strategies failed: Subject=%s Recipients=%s", subject, [r["email"] for r in recipients])
    return False

