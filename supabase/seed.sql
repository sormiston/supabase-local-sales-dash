SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict OMvq62mGreRNpOdHkWcOgrlNgh47MFET9qJMjDgoMpxLlUxlPNAGJTzX7ZQEMXq

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'd0e6c672-7b30-492e-a889-1ea5bb384a60', 'authenticated', 'authenticated', 'alice@salesdash.com', '$2a$10$l2iXnOxPdZocBzSwiz2aNuE6zqKqBsvbeAVxsK3r58dft0tbbOvD.', '2026-08-15 22:23:50.480193+00', NULL, '', NULL, '', NULL, '', '', NULL, NULL, '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-08-15 22:23:50.477317+00', '2026-08-15 22:23:50.480603+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '9f3ee674-d2e8-42e6-8191-02cf66be6116', 'authenticated', 'authenticated', 'john@salesdash.com', '$2a$10$hoQ3tDTM9Ro2KhtI2EKNSufjrCIrfghLQZe6HwyDE6nkIkH4XwdWq', '2026-08-15 22:23:36.76913+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-08-16 10:26:19.034681+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-08-15 22:23:36.753114+00', '2026-08-16 10:26:19.036911+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: sales_deals; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."sales_deals" ("id", "created_at", "name", "value") VALUES
	(1, '2026-08-06 17:59:07.805745+00', 'John', 3000),
	(2, '2026-08-11 19:39:05.722117+00', 'Alice', 4200),
	(3, '2026-08-11 19:39:05.722117+00', 'Marcus', 1800),
	(4, '2026-08-11 19:39:05.722117+00', 'Priya', 5600),
	(5, '2026-08-11 19:39:05.722117+00', 'John', 2500),
	(7, '2026-08-11 19:39:05.722117+00', 'Marcus', 900),
	(8, '2026-08-11 19:39:05.722117+00', 'Priya', 4700),
	(6, '2026-08-11 19:39:05.722117+00', 'Marcus', 3100);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 6, true);


--
-- Name: sales_deals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."sales_deals_id_seq"', 13, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict OMvq62mGreRNpOdHkWcOgrlNgh47MFET9qJMjDgoMpxLlUxlPNAGJTzX7ZQEMXq

RESET ALL;
