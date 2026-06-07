--
-- PostgreSQL database dump
--

\restrict 4heNT4gdUAW5pIKW5hKWNDHbhAb9zGJHekoEirVn6Pum9QFPDwPQZ5eRp5iYoD9

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: user
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO "user";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: user
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO "user";

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: user
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE drizzle.__drizzle_migrations_id_seq OWNER TO "user";

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: user
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id text,
    action text NOT NULL,
    target text,
    metadata text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_log OWNER TO "user";

--
-- Name: consents; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    policy_version text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    ip text,
    method text
);


ALTER TABLE public.consents OWNER TO "user";

--
-- Name: data_requests; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.data_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


ALTER TABLE public.data_requests OWNER TO "user";

--
-- Name: matches; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_type text NOT NULL,
    host_id uuid NOT NULL,
    guest_id uuid,
    subject_id uuid NOT NULL,
    age_band text NOT NULL,
    winner_id uuid,
    status text NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone
);


ALTER TABLE public.matches OWNER TO "user";

--
-- Name: question_options; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.question_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    label text NOT NULL,
    is_correct boolean NOT NULL
);


ALTER TABLE public.question_options OWNER TO "user";

--
-- Name: questions; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid NOT NULL,
    age_band text NOT NULL,
    prompt text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.questions OWNER TO "user";

--
-- Name: reports; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reports OWNER TO "user";

--
-- Name: subjects; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    icon text NOT NULL
);


ALTER TABLE public.subjects OWNER TO "user";

--
-- Name: users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    grade text,
    email_verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    birthdate date,
    guardian_email text,
    status text DEFAULT 'active'::text NOT NULL,
    anonymized_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO "user";

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: user
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: user
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: consents consents_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_pkey PRIMARY KEY (id);


--
-- Name: data_requests data_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.data_requests
    ADD CONSTRAINT data_requests_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: question_options question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_slug_unique; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_slug_unique UNIQUE (slug);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_log_action_idx; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX audit_log_action_idx ON public.audit_log USING btree (action);


--
-- Name: audit_log_actor_id_idx; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX audit_log_actor_id_idx ON public.audit_log USING btree (actor_id);


--
-- Name: consents_user_id_idx; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX consents_user_id_idx ON public.consents USING btree (user_id);


--
-- Name: data_requests_user_id_idx; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX data_requests_user_id_idx ON public.data_requests USING btree (user_id);


--
-- Name: reports_reporter_id_idx; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX reports_reporter_id_idx ON public.reports USING btree (reporter_id);


--
-- Name: reports_status_idx; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX reports_status_idx ON public.reports USING btree (status);


--
-- Name: consents consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.consents
    ADD CONSTRAINT consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: data_requests data_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.data_requests
    ADD CONSTRAINT data_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_guest_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_guest_id_users_id_fk FOREIGN KEY (guest_id) REFERENCES public.users(id);


--
-- Name: matches matches_host_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_host_id_users_id_fk FOREIGN KEY (host_id) REFERENCES public.users(id);


--
-- Name: matches matches_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: matches matches_winner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_winner_id_users_id_fk FOREIGN KEY (winner_id) REFERENCES public.users(id);


--
-- Name: question_options question_options_question_id_questions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_question_id_questions_id_fk FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: questions questions_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 4heNT4gdUAW5pIKW5hKWNDHbhAb9zGJHekoEirVn6Pum9QFPDwPQZ5eRp5iYoD9

