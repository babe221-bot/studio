import os

import resend

# Initialize Resend client
resend.api_key = os.getenv("RESEND_API_KEY")


def send_email(to: str, subject: str, html: str):
    try:
        resend.emails.send(
            {
                "from": "onboarding@resend.dev",  # TODO: Configure sender email
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
        print(f"Email sent to {to} with subject: {subject}")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
