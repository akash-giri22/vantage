import os
from typing import Optional


NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL", "")
NOTIFICATION_PHONE = os.getenv("NOTIFICATION_PHONE", "")


def notify_manual_action(
    title: str,
    company: str,
    apply_url: str,
    reason: str,
) -> dict:
    """
    Notify the user that manual action is required.

    Email/SMS providers can be connected here later.
    For now, the notification is logged to the backend console.
    """

    message = (
        f"Manual action required for {title} at {company}. "
        f"Reason: {reason}. "
        f"Apply here: {apply_url}"
    )

    print("\n========== VANTAGE NOTIFICATION ==========")
    print(message)

    if NOTIFICATION_EMAIL:
        print(f"Email target: {NOTIFICATION_EMAIL}")

    if NOTIFICATION_PHONE:
        print(f"Phone target: {NOTIFICATION_PHONE}")

    print("==========================================\n")

    return {
        "sent": True,
        "channel": "console",
        "message": message,
    }


def notify_application_success(
    title: str,
    company: str,
    apply_url: Optional[str] = None,
) -> dict:
    """
    Notify the user after a successful application.
    """

    message = f"Application submitted: {title} at {company}"

    if apply_url:
        message += f" | {apply_url}"

    print("\n========== VANTAGE APPLICATION ==========")
    print(message)
    print("=========================================\n")

    return {
        "sent": True,
        "channel": "console",
        "message": message,
    }