/**
 * Helper to insert audit log entries using an admin client (bypasses RLS).
 * The `audit_logs` table already exists in the DB with the correct schema.
 */
export async function logAuditAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  params: {
    actorId: string;
    organizationId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }
) {
  const { error } = await adminClient.from("audit_logs").insert({
    actor_id: params.actorId,
    organization_id: params.organizationId,
    action: params.action,
    entity_type: params.entityType || "organization",
    entity_id: params.entityId || params.organizationId,
    metadata: params.metadata || {},
    ip_address: params.ipAddress || null,
  });

  if (error) {
    console.error("[audit_log] Failed to write audit entry:", error.message);
  }
}
