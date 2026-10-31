# Bentian AI Commerce Assistant: Especificación Modular
## Sección 1: Benchmarking Exhaustivo de IA Gratuita (2026)

### 1.1. Comparativa Global de Opciones de Coste Cero

| Proveedor / Motor | Modelo | Cuota Gratuita Oficial | Límites de Frecuencia | Tarjeta de Crédito | Privacidad / Datos | Rol Recomendado |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **Google AI Studio** | `gemini-2.0-flash` / `1.5-flash` | **1.500 peticiones / día** | 15 RPM / 1M TPM | **NO** | Revisor Google (datos públicos) | Proveedor principal para e-commerce y catálogos grandes |
| **Groq Cloud** | `llama-3.1-8b-instant` | **14.400 peticiones / día** | 30 RPM / 30k TPM | **NO** | Cero almacenamiento / No entrena | Proveedor de alta velocidad (<100ms) para chats interactivos |
| **Groq Cloud** | `llama-3.3-70b-versatile` | **1.000 peticiones / día** | 30 RPM / 12k TPM | **NO** | Cero almacenamiento / No entrena | Razonamiento avanzado en consultas complejas de compatibilidad |
| **Cloudflare Workers AI**| `@cf/meta/llama-3.1-8b-instruct` | **10.000 neuronas / día** | Variable (~150 chats/día) | **NO** | Edge regional en España (<15ms) | Capa intermedia de enrutamiento rápido en el borde |
| **Ollama Local (Windows)**| `qwen2.5:7b` / `phi3.5:3.8b` | **Ilimitado (0 € para siempre)** | Ilimitado (según hardware) | **NO** | **100% privado y confidencial** | Empresas con datos sensibles o sin internet estable |

---

### 1.2. Análisis Técnico por Proveedor

#### A) Google AI Studio (Gemini 2.0 Flash / 1.5 Flash)
* **Ventana de Contexto:** Hasta 1.000.000 de tokens (1M). Permite inyectar fichas técnicas extensas, manuales en PDF y esquemas completos.
* **Multimodalidad Nativa:** Capaz de procesar las fotografías de los productos resueltas por [`ImageSyncService`](../../apps/agent/src/sync/image-sync.service.ts).
* **Coste:** 0,00 €. Requiere únicamente una cuenta Google estándar (Gmail o Google Workspace). No solicita datos bancarios.

#### B) Groq Cloud (Inferencia LPU Ultra-Rápida)
* **Velocidad:** 250 a 750 tokens por segundo con latencias *Time to First Token* (TTFT) inferiores a 90 ms.
* **Experiencia de Usuario:** Elimina la sensación de "espera" en la tienda online. La respuesta aparece prácticamente instantánea en pantalla.
* **Cuota Gratuita:** El modelo de 8B permite hasta 14.400 peticiones diarias gratuitas (suficiente para más de 400.000 consultas al mes sin pagar nada).

#### C) Ollama Local en Windows (Soberanía de Datos)
* **Requisitos Hardware Mínimos:**
  - **Phi-3.5 Mini (3.8B):** Requiere **2,2 GB** de RAM libre. Funciona de forma fluida en CPUs Intel Core i5/Ryzen de oficina estándar sin tarjeta gráfica dedicada (~15 tokens/seg).
  - **Qwen 2.5 (7B):** Requiere **4,7 GB** de RAM/VRAM. Ideal para puestos con tarjeta NVIDIA (GTX 1650 / RTX 3050 en adelante). Extraordinaria precisión en seguimiento de instrucciones en español.
* **Garantía:** Los datos del cliente jamás salen del PC donde corre `BentianAgent.exe`.

#### D) Embeddings Locales: Transformers.js (ONNX Runtime)
* **Modelo Seleccionado:** `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensiones, 118 MB en disco).
* **Rendimiento:** Vectoriza en 8-12 ms por artículo en CPU; **busca similitud coseno sobre 25.000 artículos en <2,5 ms** mediante `Float32Array` y optimización SIMD de V8 en Node.js. Cero costes de red y cero dependencias de servicios externos.
