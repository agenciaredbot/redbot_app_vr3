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
      "Registra un nuevo lead (contacto interesado). Usa esta herramienta cuando el visitante proporcione su información de contacto o muestre interés real en una propiedad (quiere agendar cita, pide contacto, etc.). Captura TODA la información disponible de la conversación.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Nombre completo del visitante (nombre y apellido)",
        },
        email: {
          type: "string",
          description: "Email del visitante",
        },
        phone: {
          type: "string",
          description: "Teléfono del visitante (con indicativo si lo da)",
        },
        budget: {
          type: "number",
          description:
            "Presupuesto aproximado en COP. Convertir a número sin puntos ni separadores (ej: 350000000 para $350.000.000 COP)",
        },
        property_summary: {
          type: "string",
          description:
            "Resumen de lo que busca: tipo de propiedad, tamaño, número de habitaciones, características especiales, estilo de vida (ej: 'Apartamento de 3 habitaciones, mínimo 80m², con parqueadero, cerca a colegios')",
        },
        preferred_zones: {
          type: "string",
          description:
            "Zonas, barrios o sectores de preferencia separados por coma (ej: 'Chapinero, Usaquén, Cedritos')",
        },
        timeline: {
          type: "string",
          description:
            "Urgencia o plazo para la compra/arriendo: 'inmediato', '1-3 meses', '3-6 meses', '6+ meses', 'indefinido'",
        },
        notes: {
          type: "string",
          description:
            "Notas adicionales relevantes: situación financiera, motivación de mudanza, restricciones, cualquier dato útil que no encaje en los otros campos",
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
