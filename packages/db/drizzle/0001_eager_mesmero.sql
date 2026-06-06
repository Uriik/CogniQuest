CREATE INDEX "matches_status_host_idx" ON "matches" USING btree ("status","host_id");--> statement-breakpoint
CREATE INDEX "question_options_question_id_idx" ON "question_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "questions_subject_age_idx" ON "questions" USING btree ("subject_id","age_band");