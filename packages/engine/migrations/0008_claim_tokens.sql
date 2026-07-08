CREATE TABLE "claim_tokens" (
  "id"          text PRIMARY KEY,
  "tenant_id"   text NOT NULL,
  "token_hash"  text NOT NULL,
  "used_at"     timestamptz,
  "expires_at"  timestamptz NOT NULL,
  "created_at"  timestamptz NOT NULL
);

CREATE UNIQUE INDEX "claim_tokens_token_hash_idx" ON "claim_tokens" ("token_hash");
