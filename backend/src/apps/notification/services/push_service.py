"""Push notification service — Firebase Cloud Messaging (FCM).

FCM is the push delivery channel for this project.  It replaces the previous
VAPID / Web-Push implementation.

Requires ``FCM_ENABLED=True`` in settings, plus credentials via one of:
  ``FIREBASE_CREDENTIALS_PATH`` — absolute path to a service-account JSON file
  ``FIREBASE_CREDENTIALS_JSON`` — raw JSON string (useful for env-var injection
                                   in containers / CI)
"""
import json
import logging
from typing import Any, Dict, List, Optional

from src.apps.core.config import settings

log = logging.getLogger(__name__)

_firebase_initialized = False


def _get_firebase_app():
    """Return the default Firebase app, initialising it on first call."""
    global _firebase_initialized

    if _firebase_initialized:
        import firebase_admin  # type: ignore
        try:
            return firebase_admin.get_app()
        except ValueError:
            _firebase_initialized = False

    try:
        import firebase_admin  # type: ignore
        from firebase_admin import credentials  # type: ignore

        cred = None
        if settings.FIREBASE_CREDENTIALS_JSON:
            cred = credentials.Certificate(json.loads(settings.FIREBASE_CREDENTIALS_JSON))
        elif settings.FIREBASE_CREDENTIALS_PATH:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        else:
            log.warning("FCM: no Firebase credentials configured — cannot initialise app")
            return None

        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        log.info("Firebase Admin SDK initialised successfully")
        return firebase_admin.get_app()

    except Exception as exc:
        log.error("Failed to initialise Firebase Admin SDK: %s", exc)
        return None


def send_push_notification(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
    image_url: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Send an FCM push notification to one or more device tokens.

    Returns a dict with ``success_count``, ``failure_count``, and
    ``failed_tokens`` (tokens FCM rejected, safe to deactivate).
    """
    result: Dict[str, Any] = {"success_count": 0, "failure_count": 0, "failed_tokens": []}

    if not settings.FCM_ENABLED:
        log.debug("FCM disabled (FCM_ENABLED=False)")
        return result

    if not tokens:
        return result

    app = _get_firebase_app()
    if app is None:
        result["failure_count"] = len(tokens)
        result["failed_tokens"] = list(tokens)
        return result

    try:
        from firebase_admin import messaging  # type: ignore

        multicast = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body, image=image_url),
            data=data or {},
            tokens=tokens,
        )
        batch = messaging.send_each_for_multicast(multicast)

        failed: List[str] = []
        for idx, resp in enumerate(batch.responses):
            if not resp.success:
                failed.append(tokens[idx])
                log.warning("FCM failure token=%s…: %s", tokens[idx][:20], resp.exception)

        result["success_count"] = batch.success_count
        result["failure_count"] = batch.failure_count
        result["failed_tokens"] = failed
        log.info("FCM multicast — success=%d failure=%d", batch.success_count, batch.failure_count)
        return result

    except Exception as exc:
        log.error("FCM multicast send failed: %s", exc)
        result["failure_count"] = len(tokens)
        result["failed_tokens"] = list(tokens)
        return result


def send_push_to_topic(
    topic: str,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
    image_url: Optional[str] = None,
) -> bool:
    """Send an FCM notification to all devices subscribed to *topic*."""
    if not settings.FCM_ENABLED:
        log.debug("FCM disabled (FCM_ENABLED=False)")
        return False

    app = _get_firebase_app()
    if app is None:
        return False

    try:
        from firebase_admin import messaging  # type: ignore

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body, image=image_url),
            data=data or {},
            topic=topic,
        )
        response = messaging.send(message)
        log.info("FCM topic message sent to topic=%s — id=%s", topic, response)
        return True

    except Exception as exc:
        log.warning("FCM topic send failed for topic=%s: %s", topic, exc)
        return False


def subscribe_tokens_to_topic(tokens: List[str], topic: str) -> Dict[str, Any]:
    """Subscribe device tokens to a Firebase topic."""
    result: Dict[str, Any] = {"success_count": 0, "failure_count": 0}
    if not settings.FCM_ENABLED or not tokens:
        return result
    app = _get_firebase_app()
    if app is None:
        result["failure_count"] = len(tokens)
        return result
    try:
        from firebase_admin import messaging  # type: ignore
        resp = messaging.subscribe_to_topic(tokens, topic)
        result["success_count"] = resp.success_count
        result["failure_count"] = resp.failure_count
        return result
    except Exception as exc:
        log.warning("FCM subscribe to topic=%s failed: %s", topic, exc)
        result["failure_count"] = len(tokens)
        return result


def unsubscribe_tokens_from_topic(tokens: List[str], topic: str) -> Dict[str, Any]:
    """Unsubscribe device tokens from a Firebase topic."""
    result: Dict[str, Any] = {"success_count": 0, "failure_count": 0}
    if not settings.FCM_ENABLED or not tokens:
        return result
    app = _get_firebase_app()
    if app is None:
        result["failure_count"] = len(tokens)
        return result
    try:
        from firebase_admin import messaging  # type: ignore
        resp = messaging.unsubscribe_from_topic(tokens, topic)
        result["success_count"] = resp.success_count
        result["failure_count"] = resp.failure_count
        return result
    except Exception as exc:
        log.warning("FCM unsubscribe from topic=%s failed: %s", topic, exc)
        result["failure_count"] = len(tokens)
        return result

