# Bentian AI Commerce Assistant: Especificación Modular
## Sección 7: Topologías de Despliegue y Arquitectura de Red

### 7.1. Dos Entornos de Operativa

```
  [ TOPOLOGÍA 1: INTRANET / MOSTRADOR ]           [ TOPOLOGÍA 2: WIDGET WEB E-COMMERCE ]
  
     Dependiente / Vendedor de Tienda                 Comprador Online en Navegador
                    │                                                │
                    ▼                                                ▼
     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │  GUI Bentian Agent (Edge)   │                 │  Tienda Online (Woo/Shop)   │
     │  http://127.0.0.1:39281     │                 │  Plugin / Widget Embed      │
     └──────────────┬──────────────┘                 └──────────────┬──────────────┘
                    │                                                │
                    │ (Procesamiento Local)                          │ (Directo: BYOK del Cliente)
                    ▼                                                ▼
     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │  Ollama Local / GPU-CPU     │                 │  Google AI Studio / Groq    │
     │  (0 € / 100% Offline)       │                 │  (1.500 - 14.400 RPD Gratis)│
     └─────────────────────────────┘                 └─────────────────────────────┘
                    │                                                │
                    │ (Consulta ERP Local)                           │ (Consulta Stock Sincronizado)
                    ▼                                                ▼
     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │  ERP Local (Factusol / etc) │                 │  Hosting Propio del Cliente │
     │  WITH (NOLOCK) / OLEDB      │                 │  (Woo / PrestaShop MySQL)   │
     └─────────────────────────────┘                 └─────────────────────────────┘
  
   ═════════════════════════════════════════════════════════════════════════════════
   ⚡ ROL DEL SERVIDOR CENTRAL BENTIAN (bridge.cristianjm.com / Hetzner CX23):
      • ÚNICAMENTE entrega el archivo .js del widget estático (cacheado al 100% en Cloudflare CDN).
      • NUNCA actúa como proxy ni procesador de mensajes de chat.
      • Consumo en Hetzner: 0% de CPU adicional, 0 MB de ancho de banda y 0,00 € en tokens.
   ═════════════════════════════════════════════════════════════════════════════════
```

---

### 7.2. Topología 1: Mostrador Físico y Televenta (Intranet Local)
* **Destinatarios:** Vendedores en tienda, comerciales telefónicos y operarios de almacén.
* **Acceso:** Pestaña local en la GUI de Bentian: `http://127.0.0.1:39281/assistant`.
* **Capacidades:** Respuestas técnicas inmediatas (*"¿qué broca encaja con este taladro?"*), desglose por almacenes físicos y modo 100% offline con Ollama en caso de corte de internet.

---

### 7.3. Topología 2: Widget Web E-commerce (Cero Puertos Abiertos)
* **Destinatarios:** Compradores online en WooCommerce, PrestaShop o Shopify.
* **Integración:** Inyección de un script ligero (<25 KB):
  `<script src="https://bridge.cristianjm.com/widgets/bentian-ai.js" data-tenant-id="..."></script>`
* **Aprovechamiento del Ciclo Delta de 30 Segundos:**
  Como Bentian ya sincroniza el stock y catálogo cada 30s con la web:
  1. **Modo Nube (0ms de latencia, cero carga para el PC de la tienda):** Las preguntas de catálogo, compatibilidad y stock general se resuelven en la nube usando el catálogo seguro ya sincronizado. Mil visitas simultáneas en la web **no consumen ni 1 MHz de CPU del servidor del ERP**.
  2. **Modo Túnel Saliente TLS 1.3:** Para consultas puntuales de pedidos recién creados, la petición viaja por el canal saliente seguro que el agente ya mantiene con `bridge.cristianjm.com`, sin abrir ningún puerto en el router de la empresa.

---

### 7.4. Los 4 Candados Anti-Sobrecoste del Servidor Central (Hetzner CX23)

Para garantizar que el crecimiento comercial de Bentian jamás incremente la factura ni sature los recursos del servidor central del fundador:

1. **La tarjeta bancaria de Bentian no existe en el flujo:**
   El cliente introduce SU propia clave API gratuita de Google AI Studio o Groq (BYOK). Cualquier consumo se debita de su cuota gratuita personal. Para Bentian el coste en tokens es estrictamente **0,00 €**.
2. **Hetzner NO procesa ni hace de proxy de los chats (Cero CPU / Cero RAM):**
   Las peticiones de chat y las respuestas del LLM viajan de forma directa entre el navegador del comprador (o el plugin en el hosting del cliente) y los endpoints oficiales de Google/Groq. El servidor `bridge.cristianjm.com` no se encuentra en la ruta de datos de los mensajes.
3. **Distribución por Cloudflare CDN (Ancho de banda gratuito):**
   El script JavaScript del widget (`bentian-ai.js`) se entrega íntegramente a través de la red perimetral de Cloudflare con cabeceras `Cache-Control: public, max-age=86400`. Si 50.000 compradores abren el chat a la vez, las peticiones se sirven desde el Edge de Cloudflare sin llegar a Hetzner.
4. **Consultas de existencias en el hosting de la tienda:**
   La comprobación de existencias se ejecuta sobre la base de datos de la propia tienda (donde Bentian ya vuelca el stock cada 30 segundos). El servidor de Bentian no almacena historiales ni realiza consultas pesadas.

> **Garantía Operativa:** Con 10 tiendas o con 10.000 tiendas activas, el servidor central de Bentian mantiene su carga de CPU por debajo del 3% y el coste mensual permanece inmutable en exactamente **6 €/mes**.
