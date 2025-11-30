-- create tables for surveys and responses (and idea_evaluations if not present)
CREATE TABLE IF NOT EXISTS surveys (
  id SERIAL PRIMARY KEY,
  idea_id INTEGER REFERENCES ideas(id) ON DELETE SET NULL,
  channel_id VARCHAR(255) NOT NULL,
  message_id VARCHAR(255) NULL,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  response VARCHAR(32) NOT NULL, -- 'yes' | 'maybe' | 'no'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- If you don't have idea_evaluations table:
CREATE TABLE IF NOT EXISTS idea_evaluations (
  id SERIAL PRIMARY KEY,
  idea_id INTEGER REFERENCES ideas(id) ON DELETE CASCADE,
  evaluation_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- You may need an index on survey_responses
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_surveys_idea_id ON surveys(idea_id);
