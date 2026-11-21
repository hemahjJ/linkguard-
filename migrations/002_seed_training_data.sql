-- ============================================================================
-- AegisLoom Security Lab — Seed Data Migration 002
-- Fictional Brand: AegisLoom Security Lab
-- Fictional Organizations: AuraGrid Cloud, KestrelDynamics Corp
-- ============================================================================

-- Seed Default Admin User (Password: "AegisLoom#Admin2026!Secure")
-- Pre-hashed with bcrypt (cost 10): $2a$10$wK1Wk9eX4YgS...
INSERT INTO admin_users (id, username, email, password_hash, role, mfa_enabled, created_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'aegis_secops',
    'admin@aegisloom-training.internal',
    '$2a$10$iM.oG9hQc4vUqjRrqx/N3.ZzQzC5L6r40o/j8xU7n2kG7YnL8F3t2', -- AegisLoom#Admin2026!Secure
    'super_admin',
    FALSE,
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- Seed Training Modules
INSERT INTO training_modules (id, slug, title, description, category, difficulty, estimated_minutes, order_index)
VALUES 
(
    'mod-email-phish',
    'email-phishing-defense',
    'Spearphishing & Email Header Analysis',
    'Learn to detect lookalike sender domains, artificial urgency, and deceptive link targets in enterprise email communications.',
    'Social Engineering',
    'Beginner',
    15,
    1
),
(
    'mod-url-dissection',
    'url-inspection-sandbox',
    'Deceptive URL Dissection & Typosquatting',
    'Analyze domain architecture, subdomain masking, internationalized homographs, and fraudulent single-sign-on portals.',
    'Technical Analysis',
    'Intermediate',
    20,
    2
),
(
    'mod-mfa-fatigue',
    'mfa-fatigue-push-bombing',
    'Multi-Factor Authentication (MFA) Fatigue Defense',
    'Understand how cyber adversaries bypass 2FA through continuous push notification bombardment and psychological exhaustion.',
    'Identity Defense',
    'Intermediate',
    15,
    3
),
(
    'mod-attachment-safety',
    'malicious-attachments-hygiene',
    'Executable Disguises & Malicious Payload Hygiene',
    'Master the detection of double extensions, weaponized office macros, and deceptive screen saver (.scr) attachments.',
    'Endpoint Security',
    'Beginner',
    15,
    4
) ON CONFLICT (id) DO NOTHING;

-- Seed Fictional Scenarios
INSERT INTO scenarios (
    id, module_id, title, fictional_sender_name, fictional_sender_email, 
    fictional_recipient, subject, body_html, warning_signals, educational_takeaways
) VALUES (
    'scen-auragrid-sso',
    'mod-email-phish',
    'Fictional AuraGrid Single Sign-On Expiration Notice',
    'AuraGrid Identity Incident Team',
    'security-alerts@auragrid-verify-sso-portal.net',
    'jordan.hayes@kestreldynamics-corp.internal',
    '[ACTION REQUIRED] Immediate Password Expiration & Session Lockout in 2 Hours',
    '<div class="email-body"><h3>AuraGrid Cloud Identity Notice</h3><p>Dear Valued Account Holder ID #8849-KX,</p><p>Our automated telemetry detected an unverified session renewal attempt. Your corporate single sign-on access will be <strong>terminated within 2 hours</strong> unless your identity is verified.</p><p><a href="http://auragrid-verify-sso-portal.net/auth.php" class="cta-link">https://sso.auragrid.io/auth/login-verify</a></p></div>',
    '[
        {
            "type": "sender_domain",
            "indicator": "auragrid-verify-sso-portal.net",
            "explanation": "Typosquatting / hyphenated domain mimicking official corporate provider auragrid.io."
        },
        {
            "type": "urgency_countdown",
            "indicator": "2 Hours deadline",
            "explanation": "Artificial time pressure designed to induce panic and inhibit rational security consultation."
        },
        {
            "type": "mismatched_url",
            "indicator": "Visible anchor text auragrid.io vs target auragrid-verify-sso-portal.net",
            "explanation": "Anchor text visually misleads user into believing the destination is authentic."
        },
        {
            "type": "disguised_attachment",
            "indicator": "AuraGrid_Security_Update_v4.2.scr.pdf",
            "explanation": "Double-extension camouflage hiding Windows executable .scr payload."
        }
    ]'::jsonb,
    '[
        "Never trust visible anchor text; inspect the destination address bar.",
        "Internal IT and Identity systems communicate planned credential changes well in advance.",
        "Always report unverified emails using the corporate Report Phish mechanism."
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Seed Quiz Questions
INSERT INTO quiz_questions (id, module_id, scenario_text, question_text, options, order_index)
VALUES 
(
    'q-101',
    'mod-email-phish',
    'You receive an urgent message from "IT Helpdesk <support@kestrel-cloud-sso.cc>" asking you to re-verify credentials.',
    'Which indicator definitively reveals that this communication is fraudulent?',
    '[
        {"id": "a", "text": "The email arrived during peak morning business hours.", "is_correct": false, "explanation": "Phishing emails can arrive at any hour of the day."},
        {"id": "b", "text": "The sender domain (@kestrel-cloud-sso.cc) does not match the official corporate domain (@kestreldynamics-corp.internal).", "is_correct": true, "explanation": "The domain following the @ symbol indicates the true originating mail server."},
        {"id": "c", "text": "The email includes an official corporate banner logo.", "is_correct": false, "explanation": "Logos and styling are easily copied by attackers from public websites."},
        {"id": "d", "text": "The email contains your company name in the subject line.", "is_correct": false, "explanation": "Attackers routinely harvest organizational names from public platforms like LinkedIn."}
    ]'::jsonb,
    1
),
(
    'q-102',
    'mod-url-dissection',
    'A link directs you to "https://portal.kestreldynamics.internal.secure-login-worker.net/auth".',
    'Who is the legal controlling entity of this web destination?',
    '[
        {"id": "a", "text": "Kestrel Dynamics, because kestreldynamics.internal appears first in the URL string.", "is_correct": false, "explanation": "Everything preceding the root domain is a subdomain, which any domain owner can forge."},
        {"id": "b", "text": "The owner of the root domain secure-login-worker.net.", "is_correct": true, "explanation": "The domain directly preceding the Top-Level Domain (.net) owns and receives all incoming traffic."},
        {"id": "c", "text": "Your local browser, because the connection begins with https://.", "is_correct": false, "explanation": "HTTPS provides transport encryption, not server owner integrity."},
        {"id": "d", "text": "No entity, because the domain format is invalid.", "is_correct": false, "explanation": "This is a valid URL structure frequently utilized in credential harvesting campaigns."}
    ]'::jsonb,
    2
),
(
    'q-103',
    'mod-mfa-fatigue',
    'Late at night, your mobile device receives 15 consecutive 2FA push notifications followed by an unsolicited call claiming to be Helpdesk asking you to approve one.',
    'What is the only safe and compliant incident response?',
    '[
        {"id": "a", "text": "Approve the request so your device stops buzzing.", "is_correct": false, "explanation": "Approving grants adversaries immediate access to your enterprise session."},
        {"id": "b", "text": "Deny all prompts, change your password immediately, and alert the Security Operations Center (SOC).", "is_correct": true, "explanation": "Persistent alerts indicate credentials were compromised; denying halts entry, password change revokes access, and reporting enables containment."},
        {"id": "c", "text": "Power off your phone for 24 hours.", "is_correct": false, "explanation": "Leaving the compromise unaddressed gives attackers time to exploit other avenues."},
        {"id": "d", "text": "Forward the notification text to your personal email account.", "is_correct": false, "explanation": "Exfiltrating incident data to personal accounts violates corporate data security policies."}
    ]'::jsonb,
    3
) ON CONFLICT (id) DO NOTHING;
