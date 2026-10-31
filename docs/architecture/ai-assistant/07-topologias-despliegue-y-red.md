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
     │  http://127.0.0.1:39281     │                 │  Widget JS Embeddable       │
     └──────────────┬──────────────┘                 └──────────────┬──────────────┘
                    │                                                │
                    │                                                ▼ (HTTPS Seguro)
                    │                                ┌─────────────────────────────┐
                    │                                │  bridge.cristianjm.com      │
                    │                                │  (API Gateway Cloud)        │
                    │                                └──────────────┬──────────────┘
                    │                                                │ (Túnel Saliente TLS 1.3)
                    ▼                                                ▼
     ┌─────────────────────────────────────────────────────────────────────────────┐
     │                     BENTIAN AGENT EN EL SERVIDOR LOCAL                      │
     │                     - Motor RAG + Function Calling                          │
     │                     - Acceso Directo OLEDB / SQL Server                     │
     └─────────────────────────────────────────────────────────────────────────────┘
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
