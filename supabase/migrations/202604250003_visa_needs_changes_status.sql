alter type public.visa_application_status
add value if not exists 'needs_changes' after 'in_review';
