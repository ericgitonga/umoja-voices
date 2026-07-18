/**
 * node-postgres treats `sslmode=require` in a connection string as an alias
 * for `verify-full` (strict CA-chain verification) — see the pg-connection-string
 * v3 deprecation warning. That silently overrides any explicit `ssl` option
 * passed to `pg.Pool`/`PrismaPg`, so a connection string carrying
 * `sslmode=require` (as Supabase's auto-provisioned POSTGRES_PRISMA_URL /
 * POSTGRES_URL_NON_POOLING both do) rejects Supabase's pooler certificate
 * chain regardless of what we configure in code. Stripping the param here
 * lets our explicit `ssl: { rejectUnauthorized: false }` take effect —
 * the connection is still TLS-encrypted end-to-end; only CA-chain
 * verification is relaxed.
 */
export function stripSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return url.toString();
}
