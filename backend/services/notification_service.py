import os

NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL", "")
NOTIFICATION_PHONE = os.getenv("NOTIFICATION_PHONE", "")

def notify_manual_action(title, company, apply_url, reason):
    message = (
        f"Manual action required for {title} at {company}. "
        f"Reason: {reason}. Apply here: {apply_url}"
    )
    print("\n========== VANTAGE NOTIFICATION ==========")
    print(message)
    if NOTIFICATION_EMAIL:
        print(f"Email target: {NOTIFICATION_EMAIL}")
    if NOTIFICATION_PHONE:
        print(f"Phone target: {NOTIFICATION_PHONE}")
    print("==========================================\n")
    return {"sent": True, "channel": "console", "message": message}

def notify_application_success(title, company, apply_url=None):
    message = f"Application submitted: {title} at {company}"
    if apply_url:
        message += f" | {apply_url}"
    print("\n========== VANTAGE APPLICATION ==========")
    print(message)
    print("=========================================\n")
    return {"sent": True, "channel": "console", "message": message}
