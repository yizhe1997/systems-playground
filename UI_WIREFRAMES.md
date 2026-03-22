# UI Wireframes & Layouts

Since we want to avoid heavy design tools like Figma or Miro for simple conceptualization, we use **Markdown & ASCII Wireframing** to communicate layouts quickly.

## 1. Public Landing Page (`/`)

```text
+--------------------------------------------------------------------+
|  [Logo/Name]                 [Demos]  [Architecture]  [Admin]      |
+--------------------------------------------------------------------+
|                                                                    |
|  Hi, I'm Chin Yi Zhe.                                              |
|  I build scalable, multi-tenant cloud systems.                     |
|                                                                    |
|  [ Download Resume ]  [ View LinkedIn ]                            |
|                                                                    |
+--------------------------------------------------------------------+
|                                                                    |
|  🚀 INTERACTIVE SYSTEMS PLAYGROUND                                   |
|  (Containers scale-to-zero when not in use)                        |
|                                                                    |
|  +-----------------------+   +-----------------------+             |
|  | Message Queue Demo    |   | Redis Cache Demo      |             |
|  | [Status: OFFLINE]     |   | [Status: ONLINE ]     |             |
|  |                       |   |                       |             |
|  | [ Power On Demo ]     |   | [ Fetch Data ]        |             |
|  +-----------------------+   +-----------------------+             |
|                                                                    |
+--------------------------------------------------------------------+
|                                                                    |
|  📚 ARCHITECTURE DECISION RECORDS (ADRs)                           |
|  Read the engineering logs behind this portfolio.                  |
|                                                                    |
|  > ADR 001: Custom Go Control Plane vs. Portainer                  |
|  > Case Study: Designing Idempotent Webhooks                       |
|  > Case Study: .NET to Golang Migration                            |
|                                                                    |
+--------------------------------------------------------------------+
```

## 2. Admin Dashboard (`/admin`)

```text
+--------------------------------------------------------------------+
|  ⚙️ SYSTEMS PLAYGROUND CONTROL PLANE                 [ Back to Site ]|
+--------------------------------------------------------------------+
|  Scale-to-Zero Auto-Shutdown is active. (Idle timeout: 10m)        |
|                                                                    |
|  INFRASTRUCTURE TARGETS:                                           |
|                                                                    |
|  [ RabbitMQ (Queue) ]                                              |
|  Status: 🔴 Exited            [ TURN ON ]                          |
|  Last Active: N/A                                                  |
|                                                                    |
|  [ Redis (Cache) ]                                                 |
|  Status: 🟢 Running           [ TURN OFF ]                         |
|  Last Active: 2 mins ago      (Auto-shutdown in 8 mins)            |
|                                                                    |
+--------------------------------------------------------------------+
```
