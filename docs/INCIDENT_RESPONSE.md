# Plan de Respuesta a Incidentes de Seguridad de la Información (PIR)
## Bentian ERP Bridge — Conforme a RGPD (UE 2016/679) y LOPDGDD 3/2018

> **ESTADO:** DOCUMENTO OFICIAL DE GOBERNANZA Y CIBERSEGURIDAD  
> **ÚLTIMA REVISIÓN:** Octubre 2026  
> **RESPONSABLE:** Cristian Jiménez Martínez (Responsable de Tratamiento & CISO)  
> **ÁMBITO:** Toda la infraestructura de Bentian ERP Bridge (Servidores Hetzner, Base de Datos Supabase Frankfurt, Agentes de Escritorio Windows, Repositorios y Pasarelas de Integración).

---

## 1. Propósito y Base Jurídica

Este procedimiento formal establece el protocolo operativo para la detección, contención, investigación, erradicación, recuperación y notificación obligatoria de cualquier incidente de ciberseguridad o brecha de seguridad de los datos personales (Personal Data Breach) que afecte a **Bentian ERP Bridge** y a sus usuarios u organizaciones conectadas.

Cumple de forma estricta con:
1. **Artículo 33 del RGPD:** Notificación de una violación de la seguridad de los datos personales a la autoridad de control (**Agencia Española de Protección de Datos - AEPD**) en un plazo máximo de **72 horas** desde que se tenga constancia de la misma.
2. **Artículo 34 del RGPD:** Comunicación de la violación de seguridad de los datos a los interesados sin dilación indebida cuando sea probable que la violación entrañe un alto riesgo para los derechos y libertades de las personas físicas.
3. **Ley 34/2002 (LSSI-CE)** y **Directiva NIS2 (UE 2022/2555)** en lo aplicable a servicios y software de integración empresarial.

---

## 2. Clasificación de Severidad del Incidente

Los incidentes se clasifican inmediatamente tras la confirmación de indicios según la siguiente matriz:

| Nivel | Clasificación | Definición y Criterio de Activación | Plazo Máximo de Reacción | Obligación Notificación AEPD |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | **CRÍTICO** | • Acceso no autorizado o exfiltración confirmada de bases de datos de clientes o claves privadas maestras (ej: Ed25519 de firma de ejecutables, secretos JWT).<br>• Compromiso de la cadena de suministro (binarios de actualización suplantados).<br>• Caída global del servicio por ataque malicioso. | Inmediato (< 15 minutos) | **SÍ (Obligatorio < 72h)** si afecta a datos personales |
| **P1** | **ALTO** | • Fuga parcial o potencial de datos personales o credenciales de usuarios/partners.<br>• Vulnerabilidad crítica explotable en endpoints públicos sin mitigación.<br>• Intrusión o anomalía en infraestructura Hetzner / Supabase. | < 1 hora | Evaluación jurídica inmediata (< 24h para determinar si aplica art. 33) |
| **P2** | **MEDIO** | • Intentos masivos de fuerza bruta con evasión de rate limiting.<br>• Denegación parcial de servicio no crítica.<br>• Infección o alerta EDR en un puesto de trabajo de administración aislado sin propagación. | < 4 horas | En principio NO, salvo impacto imprevisto en disponibilidad de datos |
| **P3** | **BAJO** | • Escaneo o sondas automatizadas bloqueadas por WAF/Firewall.<br>• Intentos fallidos de autenticación rutinarios.<br>• Fallos de configuración menores sin exposición de datos. | < 24 horas | NO |

---

## 3. Equipo de Respuesta a Incidentes (CSIRT Interno)

- **Comandante del Incidente (Incident Commander / CISO):** Cristian Jiménez Martínez. Lidera las decisiones operativas, autoriza medidas drásticas (aislamiento de red, revocación de tokens) y valida informes forenses.
- **Delegado de Protección de Datos (DPD / Asesoría Legal RGPD):** Responsable de cumplimentar el formulario oficial de brecha de datos en la Sede Electrónica de la AEPD y redactar la comunicación a los afectados según art. 34.
- **Líder Técnico de Infraestructura & Backend:** Ejecuta el aislamiento en Hetzner (Docker, Caddy, iptables) y la rotación atómica de credenciales en Supabase y Stripe.
- **Portavoz de Comunicación Externa:** Cristian Jiménez Martínez. Canaliza la comunicación oficial con clientes, partners y medios si fuese requerido, garantizando veracidad y evitando especulaciones.

---

## 4. Fases del Protocolo de Respuesta

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. Detección │ ──> │ 2. Contención│ ──> │3.Erradicación│
│  y Triage    │     │  y Aislamiento     │  y Saneado   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
┌──────────────┐     ┌──────────────┐            │
│ 5. Post-     │ <── │ 4. Recupe-   │ <──────────┘
│    Mortem    │     │    ración    │
└──────────────┘     └──────────────┘
```

### Fase 1: Detección, Registro y Triage
1. **Canales de entrada de alertas:**
   - Telemetría y Deadman Switch del sistema de monitorización (`/api/v1/monitoring/agents/health`).
   - Alertas del Webhook de Stripe o Resend API.
   - Informes de vulnerabilidad recibidos en el canal oficial de seguridad (`seguridad@cristianjm.com` o formulario web).
   - Detección de anomalías en logs de Hetzner o base de datos Supabase.
2. **Apertura del Registro de Incidente:**
   - Todo incidente P0/P1 debe quedar registrado inmediatamente en `docs/security/incident-logs/INCIDENT-YYYYMMDD-ID.md` (o repositorio seguro privado offline), cronometrando minuto a minuto las acciones tomadas.

### Fase 2: Contención y Aislamiento (Minimización del Daño)
1. **Para incidentes P0 en Servidor Central (API / Hetzner):**
   - Aislar el contenedor afectado: `docker stop bentian-api-prod`.
   - Si se sospecha compromiso de red: bloquear tráfico entrante mediante Firewall Hetzner / Cloudflare Tunnel excepto IP de administración.
   - En caso de compromiso de claves JWT: cambiar inmediatamente `ADMIN_JWT_SECRET` y reiniciar la API para invalidar todas las sesiones activas en bloque.
2. **Para incidentes en Clave Privada de Actualizaciones (Ed25519):**
   - Retirar inmediatamente el binario o manifiesto del directorio `/releases/latest/`.
   - Activar el protocolo de Release Puente y Revocación documentado en `docs/KEY_ROTATION.md`.
3. **Preservación Forense de Evidencias:**
   - Prohibido apagar o reiniciar destructivamente máquinas sin antes volcar logs volátiles (`docker logs`, logs del sistema en `/var/log/`, memoria swap).
   - Generar sumas SHA-256 de los ficheros de log para garantizar la cadena de custodia probatoria.

### Fase 3: Erradicación y Saneado
1. Identificar el vector de entrada exacto (exploit en endpoint, credencial expuesta, phishing, dependencia vulnerable).
2. Aplicar el parche de código o remediación en rama protegida.
3. Rotar el 100% de los secretos y contraseñas potencialmente comprometidos según el manual `docs/KEY_ROTATION.md`.
4. Reconstruir las imágenes de Docker desde cero asegurando dependencias verificadas (`pnpm install --frozen-lockfile`).

### Fase 4: Recuperación y Retorno al Servicio
1. Desplegar los servicios saneados en modo monitorizado y con nivel de log ampliado.
2. Ejecutar la batería de tests completa de seguridad y calidad (`pnpm run quality:check`).
3. Verificar la integridad de los datos de base de datos comparando con el último snapshot verificado y validando firmas de licencias.

### Fase 5: Notificación Legal RGPD (< 72 Horas)

Si el incidente supone una violación de la seguridad que entrañe la destrucción, pérdida, alteración o comunicación no autorizada de datos personales:

1. **Notificación a la AEPD (Art. 33 RGPD):**
   - Debe tramitarse en la Sede Electrónica de la AEPD (`https://sedeagpd.gob.es/sede-electronica-web/`) dentro del plazo improrrogable de **72 horas**.
   - El informe debe contener como mínimo:
     * Naturaleza de la violación, categorías y número aproximado de interesados y registros afectados.
     * Nombre y datos de contacto del DPD / Responsable de Seguridad.
     * Consecuencias probables de la brecha.
     * Medidas adoptadas o propuestas para poner remedio a la violación y mitigar posibles efectos negativos.
   - Si no es posible facilitar toda la información simultáneamente, se facilitará por fases sin dilación indebida.
2. **Comunicación a los Usuarios Afectados (Art. 34 RGPD):**
   - Obligatoria si la brecha entraña un **alto riesgo** para sus derechos (ej: contraseñas expuestas, datos bancarios, información comercial crítica).
   - Redacción en lenguaje claro y sencillo, indicando las recomendaciones al usuario (ej: rotar contraseña, verificar movimientos de cuenta).

### Fase 6: Lecciones Aprendidas y Post-Mortem

En un plazo no superior a 5 días laborables tras el cierre del incidente:
1. Redactar el informe de autopsia técnica (**Post-Mortem**) detallando:
   - Cronología precisa (*Timeline*).
   - Causa raíz (*Root Cause Analysis* - 5 Porqués).
   - Qué funcionó bien y qué falló en la respuesta.
   - Plan de acciones preventivas con responsables y fechas límite de ejecución.
2. Incorporar las nuevas reglas de prevención a `AGENTS.md` y `GEMINI.md` para evitar regresiones futuras por cualquier desarrollador o agente de IA.

---

## 5. Simulacros y Verificación Periódica

- Se realizará al menos **un simulacro de respuesta a incidentes y brecha RGPD al año**.
- Se comprobará semestralmente la capacidad de restauración de las copias de seguridad de la base de datos Supabase/PostgreSQL.
- Este documento debe ser revisado anualmente o tras cualquier cambio arquitectónico sustancial en el ecosistema Bentian.
