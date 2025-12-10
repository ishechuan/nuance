-- Add analysis cache fields to articles table
ALTER TABLE articles 
ADD COLUMN analysis JSONB,
ADD COLUMN analyzed_at TIMESTAMPTZ;

-- Create index for faster lookup by URL
CREATE INDEX idx_articles_url ON articles(url);

-- Comment for clarity
COMMENT ON COLUMN articles.analysis IS 'Cached analysis result from AI (idioms, syntax, vocabulary)';
COMMENT ON COLUMN articles.analyzed_at IS 'Timestamp when the analysis was performed';


