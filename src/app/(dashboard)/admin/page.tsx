import { getAdminContext } from "@/lib/auth/get-admin-context";
import { AdminDashboard, type DashboardData } from "@/components/dashboard/admin-dashboard";
import { getI18nText } from "@/lib/utils/format";

export const metadata = {
  title: "Panel de administración",
};

export default async function DashboardPage() {
  const { supabase, organizationId } = await getAdminContext();

  // ── Parallel data fetch ─────────────────────────────────
  const [
    // Properties counts
    { count: totalProperties },
    { count: publishedProperties },
    { count: soldProperties },
    { count: rentedProperties },
    { count: reservedProperties },
    { count: availableProperties },
    { count: featuredProperties },
    // Properties aggregation
    { data: propertiesRaw },
    { data: topPropertiesRaw },
    // Leads
    { count: totalLeads },
    { count: newLeads },
    { count: closedLeads },
    { count: lostLeads },
    { data: leadsRaw },
    { data: recentLeads },
    // Conversations
    { count: activeConversations },
    { count: closedConversations },
    { count: totalConversations },
    { data: conversationsRaw },
    { data: messagesAgg },
    // WhatsApp
    { count: whatsappConversations },
    { data: whatsappInstance },
    // Organization
    { data: orgData },
    // Team
    { data: agentsRaw },
    { count: pendingInvitations },
  ] = await Promise.all([
    // Properties counts
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("is_published", true),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("availability", "vendido"),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("availability", "arrendado"),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("availability", "reservado"),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("availability", "disponible"),
    supabase.from("properties").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("is_featured", true),
    // Properties for breakdowns (type, business_type, views)
    supabase.from("properties").select("property_type, business_type, views_count").eq("organization_id", organizationId),
    // Top 10 by views
    supabase.from("properties").select("id, title, city, property_type, views_count").eq("organization_id", organizationId).order("views_count", { ascending: false }).limit(10),
    // Leads counts
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("pipeline_stage", "nuevo"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("pipeline_stage", "cerrado"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("pipeline_stage", "perdido"),
    // Leads by stage (for chart)
    supabase.from("leads").select("pipeline_stage").eq("organization_id", organizationId),
    // Recent leads
    supabase.from("leads").select("id, full_name, pipeline_stage, created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(5),
    // Conversations
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "closed"),
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("organization_id", organizationId),
    // Conversations by channel
    supabase.from("conversations").select("channel, message_count").eq("organization_id", organizationId),
    // Messages total (sum via raw conversations message_count)
    supabase.from("conversations").select("message_count").eq("organization_id", organizationId),
    // WhatsApp conversations
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("channel", "whatsapp"),
    // WhatsApp instance
    supabase.from("whatsapp_instances").select("connection_status").eq("organization_id", organizationId).maybeSingle(),
    // Organization plan usage
    supabase.from("organizations").select("conversations_used_this_month, max_conversations_per_month").eq("id", organizationId).single(),
    // Team agents
    supabase.from("user_profiles").select("id, full_name, last_login_at, role").eq("organization_id", organizationId).eq("is_active", true),
    // Pending invitations
    supabase.from("invitations").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "pending"),
  ]);

  // ── Process properties breakdowns ───────────────────────
  const typeCounts: Record<string, number> = {};
  const businessCounts: Record<string, number> = {};
  let totalViews = 0;

  for (const p of propertiesRaw || []) {
    typeCounts[p.property_type] = (typeCounts[p.property_type] || 0) + 1;
    businessCounts[p.business_type] = (businessCounts[p.business_type] || 0) + 1;
    totalViews += p.views_count || 0;
  }

  const BUSINESS_LABELS: Record<string, string> = {
    venta: "Venta",
    arriendo: "Arriendo",
    venta_arriendo: "Venta y arriendo",
  };

  const TYPE_LABELS: Record<string, string> = {
    apartamento: "Apto",
    casa: "Casa",
    casa_campestre: "Campestre",
    apartaestudio: "Aptaestudio",
    duplex: "Dúplex",
    penthouse: "Penthouse",
    local: "Local",
    oficina: "Oficina",
    lote: "Lote",
    finca: "Finca",
    bodega: "Bodega",
    consultorio: "Consultorio",
  };

  const propertiesByType = Object.entries(typeCounts)
    .map(([name, value]) => ({ name: TYPE_LABELS[name] || name, value }))
    .sort((a, b) => b.value - a.value);

  const propertiesByBusiness = Object.entries(businessCounts)
    .map(([name, value]) => ({ name: BUSINESS_LABELS[name] || name, value }))
    .sort((a, b) => b.value - a.value);

  // ── Process leads pipeline ──────────────────────────────
  const STAGE_ORDER = [
    "nuevo", "contactado", "calificado", "visita_tour",
    "oferta", "bajo_contrato", "cerrado", "perdido",
  ];
  const STAGE_LABELS: Record<string, string> = {
    nuevo: "Nuevo",
    contactado: "Contactado",
    calificado: "Calificado",
    visita_tour: "Visita/Tour",
    oferta: "Oferta",
    bajo_contrato: "Bajo contrato",
    cerrado: "Cerrado",
    perdido: "Perdido",
  };
  const STAGE_COLORS: Record<string, string> = {
    nuevo: "#3B82F6",
    contactado: "#06B6D4",
    calificado: "#8B5CF6",
    visita_tour: "#F59E0B",
    oferta: "#EC4899",
    bajo_contrato: "#6366F1",
    cerrado: "#10B981",
    perdido: "#EF4444",
  };

  const stageCounts: Record<string, number> = {};
  for (const l of leadsRaw || []) {
    stageCounts[l.pipeline_stage] = (stageCounts[l.pipeline_stage] || 0) + 1;
  }

  const leadsByStage = STAGE_ORDER.map((stage) => ({
    name: STAGE_LABELS[stage] || stage,
    value: stageCounts[stage] || 0,
    color: STAGE_COLORS[stage] || "#94A3B8",
  }));

  // ── Process conversations ───────────────────────────────
  let webConvs = 0;
  let waConvs = 0;
  let totalMessages = 0;

  for (const c of conversationsRaw || []) {
    if (c.channel === "whatsapp") waConvs++;
    else webConvs++;
  }
  for (const m of messagesAgg || []) {
    totalMessages += m.message_count || 0;
  }

  const conversationsByChannel = [
    { name: "Web", value: webConvs },
    { name: "WhatsApp", value: waConvs },
  ];

  // ── Process top properties ──────────────────────────────
  const topProperties = (topPropertiesRaw || [])
    .filter((p: any) => (p.views_count || 0) > 0)
    .map((p: any) => ({
      id: p.id,
      title: getI18nText(p.title),
      city: p.city,
      property_type: p.property_type,
      views_count: p.views_count || 0,
    }));

  // ── Process team ────────────────────────────────────────
  // Count assigned properties and leads per agent
  const agentIds = (agentsRaw || []).map((a: any) => a.id);

  let propertyCounts: Record<string, number> = {};
  let leadCounts: Record<string, number> = {};

  if (agentIds.length > 0) {
    const [{ data: agentProperties }, { data: agentLeads }] = await Promise.all([
      supabase
        .from("properties")
        .select("assigned_agent_id")
        .eq("organization_id", organizationId)
        .in("assigned_agent_id", agentIds),
      supabase
        .from("leads")
        .select("assigned_agent_id")
        .eq("organization_id", organizationId)
        .in("assigned_agent_id", agentIds),
    ]);

    for (const p of agentProperties || []) {
      if (p.assigned_agent_id) {
        propertyCounts[p.assigned_agent_id] = (propertyCounts[p.assigned_agent_id] || 0) + 1;
      }
    }
    for (const l of agentLeads || []) {
      if (l.assigned_agent_id) {
        leadCounts[l.assigned_agent_id] = (leadCounts[l.assigned_agent_id] || 0) + 1;
      }
    }
  }

  const agents = (agentsRaw || []).map((a: any) => ({
    id: a.id,
    full_name: a.full_name,
    last_login_at: a.last_login_at,
    properties_count: propertyCounts[a.id] || 0,
    leads_count: leadCounts[a.id] || 0,
  }));

  // ── Build dashboard data ────────────────────────────────
  const dashboardData: DashboardData = {
    totalProperties: totalProperties || 0,
    publishedProperties: publishedProperties || 0,
    soldProperties: soldProperties || 0,
    rentedProperties: rentedProperties || 0,
    reservedProperties: reservedProperties || 0,
    availableProperties: availableProperties || 0,
    featuredProperties: featuredProperties || 0,
    totalViews,
    totalLeads: totalLeads || 0,
    newLeads: newLeads || 0,
    activeConversations: activeConversations || 0,
    closedConversations: closedConversations || 0,
    totalConversations: totalConversations || 0,
    totalMessages,
    propertiesByType,
    propertiesByBusiness,
    leadsByStage,
    conversationsByChannel,
    recentLeads: (recentLeads || []) as any,
    topProperties,
    agents,
    pendingInvitations: pendingInvitations || 0,
    conversationsUsed: orgData?.conversations_used_this_month || 0,
    conversationsMax: orgData?.max_conversations_per_month || 0,
    whatsappStatus: whatsappInstance?.connection_status || null,
    whatsappConversations: whatsappConversations || 0,
    closedLeads: closedLeads || 0,
    lostLeads: lostLeads || 0,
  };

  return <AdminDashboard data={dashboardData} />;
}
