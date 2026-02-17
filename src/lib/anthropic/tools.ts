import type Anthropic from "@anthropic-ai/sdk";

export const agentTools: Anthropic.Tool[] = [
  {
    name: "search_properties",
    description:
      "Busca propiedades en el catálogo de la inmobiliaria. Usa esta herramienta cuando el visitante pregunte por propiedades disponibles, busque algo específico, o quiera filtrar por tipo, precio, ubicación, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Texto de búsqueda libre (ej: 'apartamento en Chapinero', 'casa con piscina')",
        },
        property_type: {
          type: "string",
          description:
            "Tipo de propiedad: apartamento, casa, casa_campestre, apartaestudio, duplex, penthouse, local, oficina, lote, finca, bodega, consultorio",
        },
        business_type: {
          type: "string",
          description: "Tipo de negocio: venta, arriendo, venta_arriendo",
        },
        city: {
          type: "string",
          description: "Ciudad (ej: Bogotá, Medellín)",
        },
        min_price: {
          type: "number",
          description: "Precio mínimo",
        },
        max_price: {
          type: "number",
          description: "Precio máximo",
        },
        bedrooms: {
          type: "number",
          description: "Número mínimo de habitaciones",
        },
      },
      required: [],
    },
  },
  {
    name: "get_property_details",
    description:
      "Obtiene los detalles completos de una propiedad específica por su ID. Usa esto cuando el visitante quiera más información sobre una propiedad particular.",
    input_schema: {
      type: "object" as const,
      properties: {
        property_id: {
          type: "string",
          description: "ID de la propiedad",
        },
      },
      required: ["property_id"],
    },
  },
  {
    name: "register_lead",
    description:
      "Registra un nuevo lead (contacto interesado). Usa esta herramienta cuando el visitante proporcione su información de contacto o muestre interés real en una propiedad (quiere agendar cita, pide contacto, etc.).",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Nombre completo del visitante",
        },
        email: {
          type: "string",
          description: "Email del visitante",
        },
        phone: {
          type: "string",
          description: "Teléfono del visitante",
        },
        notes: {
          type: "string",
          description:
            "Notas sobre lo que busca el visitante, preferencias, presupuesto, etc.",
        },
        interested_property_id: {
          type: "string",
          description:
            "ID de la propiedad en la que está interesado (si aplica)",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Tags a asignar al lead según la conversación. Valores válidos: TIPO: comprador, vendedor, arrendatario, inversionista | TEMPERATURA: caliente, tibio, frio | PROPIEDAD: apartamento, casa, local, lote, finca | FINANCIERO: contado, credito-aprobado, credito-en-proceso, sin-verificar",
        },
      },
      required: ["name"],
    },
  },
];
