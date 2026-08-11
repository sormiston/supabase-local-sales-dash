SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict cuWNc9hzQ7GSidZHcXEfFCEGOoMaUaw5MqP7dgWKFGdWkrAOhhKbyxaYsCxE1Pc

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
-- Data for Name: sales_deals; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."sales_deals" ("id", "created_at", "name", "value") VALUES
	(1, '2026-08-06 17:59:07.805745+00', 'John', 3000),
	(2, '2026-08-11 19:39:05.722117+00', 'Alice', 4200),
	(3, '2026-08-11 19:39:05.722117+00', 'Marcus', 1800),
	(4, '2026-08-11 19:39:05.722117+00', 'Priya', 5600),
	(5, '2026-08-11 19:39:05.722117+00', 'John', 2500),
	(6, '2026-08-11 19:39:05.722117+00', 'Marcus', 3100),
	(7, '2026-08-11 19:39:05.722117+00', 'Marcus', 900),
	(8, '2026-08-11 19:39:05.722117+00', 'Priya', 4700);


--
-- Name: sales_deals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."sales_deals_id_seq"', 8, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict cuWNc9hzQ7GSidZHcXEfFCEGOoMaUaw5MqP7dgWKFGdWkrAOhhKbyxaYsCxE1Pc

RESET ALL;
