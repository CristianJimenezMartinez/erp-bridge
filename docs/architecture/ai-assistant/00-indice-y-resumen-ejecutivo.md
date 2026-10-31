# Bentian AI Commerce Assistant: Especificación Modular
## Sección 0: Índice General y Resumen Ejecutivo

> **ESTADO:** Aprobado / Especificación de Arquitectura Modular  
> **FECHA:** 31 de Octubre de 2026  
> **ÁMBITO:** Apps Agent, API Gateway, Connectors Multi-ERP, Widgets E-Commerce  
> **UBICACIÓN MODULAR:** `docs/architecture/ai-assistant/`

---

### Estructura de Secciones de la Documentación

Esta especificación se encuentra dividida modularmente en 8 secciones de referencia técnica:

| Sección | Archivo | Contenido Principal |
| :--- | :--- | :--- |
| **00** | [`00-indice-y-resumen-ejecutivo.md`](./00-indice-y-resumen-ejecutivo.md) | Visión general, objetivos, dilema económico y resumen arquitectónico. |
| **01** | [`01-benchmarking-ia-gratuita-2026.md`](./01-benchmarking-ia-gratuita-2026.md) | Comparativa detallada de cuotas gratuitas (Google AI Studio, Groq Cloud, Ollama, Cloudflare). |
| **02** | [`02-onboarding-byok-y-credenciales.md`](./02-onboarding-byok-y-credenciales.md) | Asistente en 60s sin tarjeta, cifrado local DPAPI en AppData y cascada multi-proveedor. |
| **03** | [`03-seguridad-blindaje-datos-anti-fuga.md`](./03-seguridad-blindaje-datos-anti-fuga.md) | DTO `SafePublicCatalogItem`, purga de costes/márgenes y doble factor para pedidos. |
| **04** | [`04-rag-hibrido-y-function-calling.md`](./04-rag-hibrido-y-function-calling.md) | RAG semántico + Function Calling determinista (evita alucinaciones de stock) y JSON schemas. |
| **05** | [`05-mapeo-datos-multi-erp.md`](./05-mapeo-datos-multi-erp.md) | Mapeo exacto de tablas y campos para Factusol, SimplyGest, Sage 50, a3ERP y Ágora POS. |
| **06** | [`06-motor-vectorial-local-simd.md`](./06-motor-vectorial-local-simd.md) | Embeddings locales ONNX (Transformers.js), JSON atómico en AppData y similitud coseno SIMD. |
| **07** | [`07-topologias-despliegue-y-red.md`](./07-topologias-despliegue-y-red.md) | Intranet en `:39281`, Widget E-commerce, Caché Delta Cloud y cero puertos abiertos. |
| **08** | [`08-hoja-de-ruta-y-contratos-implementacion.md`](./08-hoja-de-ruta-y-contratos-implementacion.md) | Fases 1, 2 y 3, mantenimiento del Gate 7 (módulos sellados) e interfaces TypeScript. |

---

### Resumen Ejecutivo del Paradigma "Zero-Cost AI"

1. **Cero Costes Ocultos para la Empresa:**
   - La empresa no paga cuotas de tokens gracias a las capas gratuitas oficiales de **Google AI Studio (1.500 consultas/día)** y **Groq Cloud (14.400 consultas/día)** o al **Modo Local 100% Offline (Ollama / Llama 3.1 / Phi-3.5)**.
2. **Separación Estricta: Intención vs Datos Vivos:**
   - **RAG Semántico:** Resuelve exclusivamente la intención humana y el descubrimiento de productos en el catálogo.
   - **Function Calling:** Obtiene de forma matemática y exacta el stock real (`DISSTO = ACTSTO - Reservado`), precio con IVA y estado del pedido.
3. **Respeto a las Reglas Mandatarias de Bentian:**
   - **Persistencia en AppData:** Ficheros JSON estructurados con escritura atómica (`.tmp` + `renameSync`) y respaldo `.bak` (Regla 1).
   - **Cero Puertos Abiertos:** Comunicación saliente segura TLS 1.3 sin modificar routers (Regla 7).
   - **Módulos Congelados:** Los 13 módulos sellados en Gate 7 permanecen inalterados; la IA se desarrollará en `apps/agent/src/ai/` sobre la interfaz [`IErpConnector`](../../apps/agent/src/erp/erp-connector.interface.ts) (Regla 9).
