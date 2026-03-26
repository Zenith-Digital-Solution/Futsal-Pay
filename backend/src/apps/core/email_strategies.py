import asyncio
import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List

import httpx
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType, NameEmail
from jinja2 import Environment, FileSystemLoader, select_autoescape

from src.apps.core.config import settings

logger = logging.getLogger(__name__)


class EmailSendingStrategy(ABC):
    """Strategy interface for outbound email providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name for logs."""

    @abstractmethod
    def is_available(self) -> bool:
        """Return True when provider has enough configuration to send."""

    @abstractmethod
    def send(
        self,
        subject: str,
        recipients: List[Dict[str, str]],
        template_name: str,
        context: Dict[str, Any],
        template_dir: Path,
    ) -> bool:
        """Send an email. Returns True on success, False on failure."""


class MailgunEmailStrategy(EmailSendingStrategy):
    @property
    def provider_name(self) -> str:
        return "mailgun"

    def is_available(self) -> bool:
        return bool(settings.MAILGUN_ENABLED and settings.MAILGUN_API_KEY and settings.MAILGUN_DOMAIN)

    def send(
        self,
        subject: str,
        recipients: List[Dict[str, str]],
        template_name: str,
        context: Dict[str, Any],
        template_dir: Path,
    ) -> bool:
        if not self.is_available():
            logger.debug("Mailgun strategy unavailable due to missing config")
            return False

        try:
            env = Environment(
                loader=FileSystemLoader(template_dir),
                autoescape=select_autoescape(["html", "xml"]),
            )
            html_template = env.get_template(f"emails/{template_name}.html")
            html_content = html_template.render(**context)

            to_addresses = [r["email"] for r in recipients]
            from_email = settings.EMAIL_FROM_ADDRESS
            if settings.EMAIL_FROM_NAME:
                from_email = f"{settings.EMAIL_FROM_NAME} <{from_email}>"

            endpoint = f"{settings.MAILGUN_BASE_URL.rstrip('/')}/{settings.MAILGUN_DOMAIN}/messages"
            with httpx.Client(timeout=20.0) as client:
                response = client.post(
                    endpoint,
                    auth=("api", settings.MAILGUN_API_KEY.get_secret_value()),
                    data={
                        "from": from_email,
                        "to": to_addresses,
                        "subject": subject,
                        "html": html_content,
                    },
                )
                response.raise_for_status()

            return True
        except Exception as exc:
            logger.error("Mailgun send failed: %s", exc)
            return False


class SMTPEmailStrategy(EmailSendingStrategy):
    @property
    def provider_name(self) -> str:
        return "smtp"

    def is_available(self) -> bool:
        return bool(settings.EMAIL_HOST and settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)

    def send(
        self,
        subject: str,
        recipients: List[Dict[str, str]],
        template_name: str,
        context: Dict[str, Any],
        template_dir: Path,
    ) -> bool:
        if not self.is_available():
            logger.debug("SMTP strategy unavailable due to missing config")
            return False

        try:
            conf = ConnectionConfig(
                MAIL_USERNAME=settings.EMAIL_HOST_USER,
                MAIL_PASSWORD=settings.EMAIL_HOST_PASSWORD,
                MAIL_FROM=settings.EMAIL_FROM_ADDRESS,
                MAIL_PORT=int(settings.EMAIL_PORT),
                MAIL_SERVER=settings.EMAIL_HOST,
                MAIL_STARTTLS=True,
                MAIL_SSL_TLS=False,
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=True,
                TEMPLATE_FOLDER=template_dir,
            )
            recipient_objects = [NameEmail(name=r.get("name", ""), email=r["email"]) for r in recipients]
            message = MessageSchema(
                subject=subject,
                recipients=recipient_objects,
                template_body=context,
                subtype=MessageType.html,
            )

            fm = FastMail(conf)
            asyncio.run(fm.send_message(message, template_name=f"emails/{template_name}.html"))
            return True
        except Exception as exc:
            logger.error("SMTP send failed: %s", exc)
            return False
