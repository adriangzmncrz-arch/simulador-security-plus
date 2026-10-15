import type { DomainKey, Question } from "./types";
import d1 from "../data/questions/domain-1.json";
import d2 from "../data/questions/domain-2.json";
import d3 from "../data/questions/domain-3.json";
import d4 from "../data/questions/domain-4.json";
import d5 from "../data/questions/domain-5.json";

export const BANK = [d1, d2, d3, d4, d5].flat() as unknown as Question[];
export const BY: Record<string, Question> = Object.fromEntries(BANK.map(q => [q.id, q]));

export const DOMAINS: readonly DomainKey[] = [1, 2, 3, 4, 5];

// Copiados textualmente del prototipo (reference/simulador-referencia.html).
export const DOM: Record<DomainKey, { n: string; en: string; w: number }> = {
  1:{n:"Conceptos generales de seguridad",en:"General Security Concepts",w:.12},
  2:{n:"Amenazas, vulnerabilidades y mitigaciones",en:"Threats, Vulnerabilities, and Mitigations",w:.22},
  3:{n:"Arquitectura de seguridad",en:"Security Architecture",w:.18},
  4:{n:"Operaciones de seguridad",en:"Security Operations",w:.28},
  5:{n:"Gestión y supervisión del programa",en:"Security Program Management and Oversight",w:.20}
};
export const OBJ: Record<string, string> = {
"1.1":"Tipos de controles de seguridad","1.2":"Conceptos fundamentales (CIA, AAA, Zero Trust, deception)","1.3":"Gestión de cambios","1.4":"Soluciones criptográficas y PKI",
"2.1":"Actores de amenaza y motivaciones","2.2":"Vectores de amenaza y superficies de ataque","2.3":"Tipos de vulnerabilidades","2.4":"Indicadores de actividad maliciosa","2.5":"Técnicas de mitigación",
"3.1":"Modelos de arquitectura (cloud, IaC, ICS, IoT)","3.2":"Infraestructura empresarial segura","3.3":"Protección de datos","3.4":"Resiliencia y recuperación",
"4.1":"Seguridad en recursos de cómputo","4.2":"Gestión de activos","4.3":"Gestión de vulnerabilidades","4.4":"Alertas y monitoreo","4.5":"Mejora de capacidades (firewall, IDS/IPS, email, DLP)","4.6":"Gestión de identidades y accesos (IAM)","4.7":"Automatización y orquestación","4.8":"Respuesta a incidentes y forense","4.9":"Fuentes de datos para investigaciones",
"5.1":"Gobierno de seguridad","5.2":"Gestión de riesgos","5.3":"Riesgo de terceros","5.4":"Cumplimiento y privacidad","5.5":"Auditorías y evaluaciones","5.6":"Concientización en seguridad"
};

export const LETTERS = "ABCDEFGH";
