import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad — Redbot",
  description:
    "Política de Tratamiento y Protección de Datos Personales de Redbot (Grupo V3 Investment SAS) en cumplimiento de la Ley 1581 de 2012.",
};

/* ─── Helpers ─── */

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold text-text-primary mt-12 mb-4">
      {number}. {title}
    </h2>
  );
}

function InfoTable({
  rows,
}: {
  rows: { label: string; value: string | React.ReactNode }[];
}) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-sm border border-border-glass rounded-lg overflow-hidden">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.05]"}
            >
              <td className="px-4 py-3 font-medium text-text-primary border-b border-border-glass w-1/3">
                {row.label}
              </td>
              <td className="px-4 py-3 text-text-secondary border-b border-border-glass">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulletList({ items }: { items: (string | React.ReactNode)[] }) {
  return (
    <ul className="list-disc list-inside space-y-2 text-text-secondary ml-2 my-4">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/* ─── Page ─── */

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="border-b border-border-glass py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-accent-blue hover:text-accent-blue/80 text-sm transition-colors"
          >
            ← Volver a Redbot
          </Link>
          <span className="text-xs text-text-muted">Versión 1.0 — Marzo 2026</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <p className="text-accent-blue font-semibold text-sm uppercase tracking-wider mb-2">
            Redbot
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Política de Tratamiento y Protección de Datos Personales
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            En cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto
            Reglamentario 1377 de 2013
          </p>
          <div className="mt-4 text-sm text-text-muted">
            <p>Grupo V3 Investment SAS · NIT: 901474433</p>
            <p>Cali, Valle del Cauca, Colombia</p>
          </div>
        </div>

        <div className="prose-custom text-text-secondary leading-relaxed">
          {/* 1 */}
          <SectionTitle number="1" title="Identificación del Responsable del Tratamiento" />
          <p className="mb-4">
            En cumplimiento de lo dispuesto en la Ley Estatutaria 1581 de 2012, el Decreto
            Reglamentario 1377 de 2013 y demás normas concordantes, GRUPO V3 INVESTMENT SAS,
            sociedad comercial legalmente constituida en la República de Colombia, identificada
            con NIT 901474433, con domicilio principal en la ciudad de Cali, Valle del Cauca,
            actuando bajo la marca comercial REDBOT (en adelante &quot;Redbot&quot; o &quot;el
            Responsable&quot;), presenta la siguiente Política de Tratamiento y Protección de
            Datos Personales.
          </p>

          <InfoTable
            rows={[
              { label: "Razón social", value: "Grupo V3 Investment SAS" },
              { label: "Marca comercial", value: "Redbot (Agencia Redbot)" },
              { label: "NIT", value: "901474433" },
              { label: "Domicilio", value: "Cali, Valle del Cauca, Colombia" },
              { label: "Correo electrónico", value: "agencia@theredbot.com" },
              { label: "Teléfono / WhatsApp", value: "+57 301 947 2361" },
              { label: "Sitio web", value: <a href="https://redbot.app" className="text-accent-blue hover:underline">https://redbot.app</a> },
              { label: "Canal de datos personales", value: "datos@theredbot.com" },
            ]}
          />

          <p className="mb-4">
            Esta política es de obligatorio cumplimiento para Redbot, sus empleados,
            contratistas, aliados y cualquier tercero que actúe como Encargado del
            Tratamiento por cuenta del Responsable.
          </p>

          {/* 2 */}
          <SectionTitle number="2" title="Marco Legal Aplicable" />
          <BulletList
            items={[
              "Artículo 15 de la Constitución Política de Colombia: Consagra el derecho fundamental de toda persona a conocer, actualizar y rectificar las informaciones que se hayan recogido sobre ella en bases de datos o archivos.",
              "Ley Estatutaria 1581 de 2012: Disposiciones generales para la protección de datos personales.",
              "Decreto Reglamentario 1377 de 2013: Reglamenta parcialmente la Ley 1581 de 2012.",
              "Decreto 1074 de 2015: Decreto Único Reglamentario del Sector Comercio, Industria y Turismo.",
              "Decreto 886 de 2014: Reglamenta el Registro Nacional de Bases de Datos (RNBD).",
            ]}
          />

          {/* 3 */}
          <SectionTitle number="3" title="Definiciones" />
          <InfoTable
            rows={[
              { label: "Dato personal", value: "Cualquier información vinculada o que pueda asociarse a una o varias personas naturales determinadas o determinables." },
              { label: "Dato público", value: "Dato que no es semiprivado, privado o sensible. Incluye datos relativos al estado civil, profesión u oficio." },
              { label: "Dato semiprivado", value: "Dato cuyo conocimiento puede interesar no solo al titular sino a cierto sector o grupo de personas." },
              { label: "Dato privado", value: "Dato que por su naturaleza íntima o reservada solo es relevante para el titular." },
              { label: "Dato sensible", value: "Dato que afecta la intimidad del titular o cuyo uso indebido puede generar discriminación." },
              { label: "Titular", value: "Persona natural cuyos datos personales sean objeto de tratamiento." },
              { label: "Responsable del Tratamiento", value: "Persona natural o jurídica que decide sobre la base de datos y/o el tratamiento de los datos personales." },
              { label: "Encargado del Tratamiento", value: "Persona natural o jurídica que realiza el tratamiento de datos personales por cuenta del Responsable." },
              { label: "Tratamiento", value: "Cualquier operación sobre datos personales: recolección, almacenamiento, uso, circulación o supresión." },
              { label: "Autorización", value: "Consentimiento previo, expreso e informado del titular para el tratamiento de sus datos personales." },
              { label: "Transferencia", value: "Envío de datos personales por el Responsable a un receptor que también es Responsable, dentro o fuera de Colombia." },
              { label: "Transmisión", value: "Comunicación de datos personales para que un Encargado realice el tratamiento por cuenta del Responsable." },
            ]}
          />

          {/* 4 */}
          <SectionTitle number="4" title="Principios Rectores del Tratamiento" />
          <p className="mb-4">
            Redbot se compromete a que todo tratamiento de datos personales se realice conforme
            a los siguientes principios establecidos en el artículo 4 de la Ley 1581 de 2012:
          </p>
          <BulletList
            items={[
              "Principio de legalidad: El tratamiento se realizará conforme a las disposiciones legales vigentes.",
              "Principio de finalidad: El tratamiento obedecerá a una finalidad legítima informada al titular.",
              "Principio de libertad: Solo podrá ejercerse con el consentimiento previo, expreso e informado del titular.",
              "Principio de veracidad o calidad: La información deberá ser veraz, completa, exacta y actualizada.",
              "Principio de transparencia: El titular tendrá derecho a obtener información sobre sus datos en cualquier momento.",
              "Principio de acceso y circulación restringida: El tratamiento se sujeta a los límites de la autorización.",
              "Principio de seguridad: La información será manejada con las medidas necesarias para otorgar seguridad.",
              "Principio de confidencialidad: Todas las personas que intervengan garantizarán la reserva de la información.",
            ]}
          />

          {/* 5 */}
          <SectionTitle number="5" title="Ámbito de Aplicación" />
          <p className="mb-4">
            Esta política aplica al tratamiento de datos personales que Redbot realice en el
            territorio colombiano. Rige para todas las bases de datos que contengan datos
            personales, incluyendo:
          </p>
          <BulletList
            items={[
              "Datos de usuarios registrados en la plataforma redbot.app.",
              "Datos de prospectos y leads capturados a través del agente de IA, formularios web, WhatsApp u otros canales.",
              "Datos de clientes que contratan los servicios de suscripción SaaS.",
              "Datos de visitantes del portal web y catálogo de propiedades.",
              "Datos de aliados comerciales, afiliados y socios estratégicos.",
              "Datos de proveedores y contratistas.",
              "Datos de empleados y colaboradores de Grupo V3 Investment SAS.",
            ]}
          />

          {/* 6 */}
          <SectionTitle number="6" title="Datos Personales Recolectados y Finalidades" />
          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">6.1 Datos recolectados</h3>
          <BulletList
            items={[
              "Datos de identificación: Nombre completo, número de identificación, correo electrónico, teléfono, dirección, ciudad, país.",
              "Datos comerciales y profesionales: Nombre de la inmobiliaria, cargo, tamaño de la empresa, número de propiedades gestionadas.",
              "Datos de uso de la plataforma: Conversaciones con el agente de IA, historial de interacciones, propiedades consultadas, registros de actividad.",
              "Datos de navegación: Dirección IP, tipo de navegador, sistema operativo, páginas visitadas, cookies.",
              "Datos financieros y de facturación: Información de pago procesada a través de Mercado Pago (Redbot no almacena datos completos de tarjetas).",
            ]}
          />
          <p className="mb-4">
            Redbot no recolecta de manera deliberada datos sensibles. En caso de que un titular
            suministre datos sensibles voluntariamente a través del agente de IA, dicha
            información será tratada con las garantías reforzadas previstas en la ley.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">6.2 Finalidades del tratamiento</h3>
          <p className="font-medium text-text-primary mb-2">Finalidades primarias:</p>
          <BulletList
            items={[
              "Registrar y gestionar la cuenta del usuario en la plataforma.",
              "Proveer los servicios contratados: agente de IA, CRM, portal web y red de oportunidades.",
              "Procesar y gestionar los leads capturados a través de los canales automatizados.",
              "Calificar y etiquetar prospectos mediante inteligencia artificial.",
              "Gestionar la facturación, pagos y renovaciones de suscripción.",
              "Brindar soporte técnico y atención al cliente.",
              "Cumplir con obligaciones legales, contables y fiscales.",
            ]}
          />
          <p className="font-medium text-text-primary mb-2">Finalidades secundarias:</p>
          <BulletList
            items={[
              "Enviar comunicaciones comerciales, promociones y actualizaciones de producto.",
              "Realizar análisis estadísticos y de uso para mejorar la plataforma.",
              "Compartir información dentro de la Red de Oportunidades con consentimiento previo.",
              "Contactar al titular para encuestas de satisfacción.",
              "Gestionar el programa de afiliados y alianzas comerciales.",
            ]}
          />

          {/* 7 */}
          <SectionTitle number="7" title="Autorización del Titular" />
          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">7.1 Mecanismos de obtención</h3>
          <BulletList
            items={[
              "Aceptación electrónica al registrarse en la plataforma redbot.app.",
              "Consentimiento explícito al interactuar con el agente de IA por primera vez.",
              "Firma física o electrónica de formato de autorización en contratos.",
              "Aceptación del aviso de privacidad al diligenciar formularios de contacto.",
              "Conductas inequívocas del titular conforme al artículo 7 del Decreto 1377 de 2013.",
            ]}
          />
          <p className="mb-4">
            En ningún caso el silencio del titular se entenderá como autorización.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">7.2 Prueba de la autorización</h3>
          <p className="mb-4">
            Redbot conservará prueba de la autorización otorgada por los titulares, en formato
            físico o electrónico, por el tiempo necesario para cumplir las finalidades del
            tratamiento.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">7.3 Casos en que no es necesaria</h3>
          <BulletList
            items={[
              "Información requerida por una entidad pública en ejercicio de sus funciones.",
              "Datos de naturaleza pública.",
              "Casos de urgencia médica o sanitaria.",
              "Tratamiento autorizado por la ley para fines históricos, estadísticos o científicos.",
              "Datos relacionados con el Registro Civil de las Personas.",
            ]}
          />

          {/* 8 */}
          <SectionTitle number="8" title="Derechos de los Titulares" />
          <p className="mb-4">
            De conformidad con el artículo 8 de la Ley 1581 de 2012, los titulares tienen los
            siguientes derechos:
          </p>
          <BulletList
            items={[
              "Conocer, actualizar y rectificar sus datos personales.",
              "Solicitar prueba de la autorización otorgada para el tratamiento.",
              "Ser informado respecto del uso que se le ha dado a sus datos.",
              "Presentar quejas ante la Superintendencia de Industria y Comercio.",
              "Revocar la autorización y/o solicitar la supresión de sus datos personales.",
              "Acceder de forma gratuita a sus datos personales.",
              "Exportar sus datos en formato CSV en cualquier momento, sin restricciones y sin costos adicionales.",
            ]}
          />

          {/* 9 */}
          <SectionTitle number="9" title="Procedimiento para Consultas y Reclamos" />
          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">9.1 Canal de atención</h3>
          <InfoTable
            rows={[
              { label: "Correo electrónico", value: "datos@theredbot.com" },
              { label: "Correo alternativo", value: "agencia@theredbot.com" },
              { label: "WhatsApp", value: "+57 301 947 2361" },
              { label: "Dirección", value: "Cali, Valle del Cauca, Colombia" },
            ]}
          />

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">9.2 Consultas</h3>
          <p className="mb-4">
            Las consultas serán atendidas en un plazo máximo de diez (10) días hábiles. Si no
            es posible atender dentro de dicho término, se informará al interesado, sin que el
            plazo pueda superar cinco (5) días hábiles adicionales.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">9.3 Reclamos</h3>
          <p className="mb-4">
            El reclamo deberá contener: identificación del titular, descripción de los hechos,
            datos de contacto y documentos de soporte. Una vez recibido completo, se atenderá
            en un plazo máximo de quince (15) días hábiles, prorrogables por ocho (8) días
            hábiles adicionales.
          </p>

          {/* 10 */}
          <SectionTitle number="10" title="Deberes de Redbot como Responsable" />
          <BulletList
            items={[
              "Garantizar el pleno y efectivo ejercicio del derecho de hábeas data.",
              "Solicitar y conservar copia de la autorización otorgada.",
              "Informar debidamente al titular sobre la finalidad de la recolección.",
              "Conservar la información bajo condiciones de seguridad adecuadas.",
              "Actualizar y rectificar los datos cuando sea necesario.",
              "Tramitar las consultas y reclamos conforme a los términos legales.",
              "Informar a la SIC las eventuales violaciones a los códigos de seguridad.",
            ]}
          />

          {/* 11 */}
          <SectionTitle number="11" title="Encargados del Tratamiento y Terceros" />
          <BulletList
            items={[
              "Anthropic (Claude): Proveedor de inteligencia artificial para el agente conversacional. Las conversaciones no se almacenan por Anthropic para fines distintos al servicio.",
              "Mercado Pago: Pasarela de pagos. Redbot no almacena datos financieros completos.",
              "Proveedores de infraestructura en la nube: Para alojamiento de la plataforma y bases de datos.",
              "Aliados comerciales: En el marco del programa de afiliados y la Red de Oportunidades, con consentimiento explícito del titular.",
            ]}
          />

          {/* 12 */}
          <SectionTitle number="12" title="Transferencias Internacionales de Datos" />
          <p className="mb-4">
            Dado que Redbot opera en Colombia, México y Estados Unidos, y utiliza proveedores
            con infraestructura global, los datos podrán ser transferidos fuera de Colombia
            garantizando niveles adecuados de protección conforme al artículo 26 de la Ley 1581
            de 2012.
          </p>

          {/* 13 */}
          <SectionTitle number="13" title="Medidas de Seguridad" />
          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Medidas técnicas</h3>
          <BulletList
            items={[
              "Cifrado de datos en tránsito y en reposo.",
              "Protocolos HTTPS/TLS para todas las comunicaciones.",
              "Control de acceso basado en roles dentro de la plataforma.",
              "Monitoreo y registro de actividad.",
              "Respaldo periódico de bases de datos.",
            ]}
          />
          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Medidas administrativas</h3>
          <BulletList
            items={[
              "Cláusulas de confidencialidad en contratos.",
              "Políticas internas de manejo de información.",
              "Capacitación al equipo sobre tratamiento responsable de datos.",
              "Procedimientos documentados para gestión de incidentes de seguridad.",
            ]}
          />

          {/* 14 */}
          <SectionTitle number="14" title="Datos de Niños, Niñas y Adolescentes" />
          <p className="mb-4">
            Los servicios de Redbot están dirigidos exclusivamente a personas mayores de edad
            (18 años o más). Redbot no recolecta ni trata deliberadamente datos personales de
            menores de edad.
          </p>

          {/* 15 */}
          <SectionTitle number="15" title="Cookies y Tecnologías de Rastreo" />
          <BulletList
            items={[
              "Cookies esenciales: Necesarias para el funcionamiento de la plataforma (autenticación, preferencias).",
              "Cookies analíticas: Para medir el tráfico y mejorar la experiencia del usuario.",
              "Cookies de marketing: Para contenido personalizado y medición de campañas (solo con consentimiento).",
            ]}
          />

          {/* 16 */}
          <SectionTitle number="16" title="Uso de Inteligencia Artificial" />
          <BulletList
            items={[
              "El agente de IA procesa conversaciones en tiempo real para generar respuestas relevantes y calificar prospectos.",
              "Las conversaciones son almacenadas en el CRM con las mismas medidas de protección que cualquier otro dato personal.",
              "La calificación automática de prospectos no produce efectos jurídicos y está sujeta a revisión humana.",
              "El titular puede solicitar información sobre la lógica del tratamiento automatizado.",
              "Redbot no utiliza los datos de los titulares para entrenar modelos de IA de terceros.",
            ]}
          />

          {/* 17 */}
          <SectionTitle number="17" title="Vigencia y Conservación" />
          <p className="mb-4">
            Los datos serán conservados durante el tiempo necesario para cumplir las finalidades
            del tratamiento y las obligaciones legales. Una vez finalizada la relación o cumplida
            la finalidad, se procederá a la supresión en un plazo razonable.
          </p>

          {/* 18 */}
          <SectionTitle number="18" title="Modificaciones a la Política" />
          <p className="mb-4">
            Cualquier cambio sustancial será comunicado a través del sitio web, correo electrónico
            y aviso dentro de la plataforma. Si el cambio afecta sustancialmente las finalidades,
            se solicitará nueva autorización.
          </p>

          {/* 19 */}
          <SectionTitle number="19" title="Autoridad de Vigilancia" />
          <p className="mb-4">
            La Superintendencia de Industria y Comercio (SIC) es la autoridad encargada de vigilar
            el cumplimiento de la Ley 1581 de 2012 en Colombia.
          </p>
          <InfoTable
            rows={[
              { label: "Sitio web", value: <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">www.sic.gov.co</a> },
              { label: "Línea de atención", value: "601 592 04 00" },
              { label: "Dirección", value: "Carrera 13 No. 27-00, Bogotá D.C., Colombia" },
            ]}
          />

          {/* 20 */}
          <SectionTitle number="20" title="Vigencia del Documento" />
          <InfoTable
            rows={[
              { label: "Versión", value: "1.0" },
              { label: "Última actualización", value: "Marzo 2026" },
              { label: "Aprobado por", value: "Santiago Vini García — Representante Legal" },
              { label: "Publicación", value: "redbot.app" },
              { label: "Canal de datos personales", value: "datos@theredbot.com" },
            ]}
          />

          <div className="mt-12 pt-8 border-t border-border-glass text-center text-sm text-text-muted">
            <p className="font-semibold text-text-primary">GRUPO V3 INVESTMENT SAS</p>
            <p>Santiago Vini García</p>
            <p>Representante Legal</p>
            <p className="mt-1">Cali, Valle del Cauca — Marzo 2026</p>
          </div>
        </div>
      </main>
    </div>
  );
}
