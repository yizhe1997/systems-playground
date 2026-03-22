# Systems Playground

> An interactive portfolio and developer showcase by Chin Yi Zhe. 
> Instead of just listing technologies on a resume, this project visually demonstrates backend architecture concepts (Message Queues, Caching, WebSockets) in real-time.

## Tech Stack
* **Backend:** Golang (Fiber/Gin)
* **Frontend:** Next.js / React, Tailwind CSS, Framer Motion (for animations)
* **Infrastructure:** Docker, Redis, RabbitMQ
* **Deployment:** Self-hosted via Docker Compose

---

## 📝 Landing Page Content Draft

### 1. Hero / Bio Section
**Headline:** Hi, I'm Chin Yi Zhe.
**Sub-headline:** I build scalable, multi-tenant cloud systems.
**Body:** I'm a Backend-focused Software Engineer with deep expertise in .NET and Golang, alongside full-stack experience with Blazor, Angular, and React. I focus on architecting resilient distributed systems, automating complex cloud deployment pipelines, and modernizing enterprise applications. 
**Calls to Action:** 
- [Download Resume]
- [View LinkedIn]

---

### 2. The Interactive Playground
*This section contains live widgets connected to a real Golang backend.*

#### Widget A: The Message Queue (RabbitMQ)
* **Concept:** Demonstrating asynchronous task processing.
* **UI:** A text input with a "Send Job" button. Below it, a visual representation of a "Queue" and 3 "Workers" (servers).
* **Action:** User types a message and clicks Send.
* **Visual:** The message appears in the Queue. One of the Workers lights up (simulating picking up the job), a spinner runs for 2 seconds, and then outputs: `[Worker 2] Processed job: <message>`.

#### Widget B: The Cache Hit (Redis)
* **Concept:** Demonstrating in-memory data store performance.
* **UI:** A "Fetch Database Records" button. Two metric boxes: "Latency" and "Source".
* **Action:** User clicks the button.
* **Visual:** 
  * *First Click (Cache Miss):* Takes ~1500ms. Source says "PostgreSQL".
  * *Second Click (Cache Hit):* Takes ~10ms. Source says "Redis Cache". 

#### Widget C: Real-Time Sync (WebSockets)
* **Concept:** Demonstrating bidirectional full-duplex communication.
* **UI:** A shared digital whiteboard or a live chat-box element.
* **Action:** "Open this page in a new tab." 
* **Visual:** Anything the user types/draws in Tab A instantly replicates in Tab B with zero HTTP polling.

---

### 3. Architecture Case Studies
*Short, high-impact blog posts proving deep systems knowledge.*

#### Case Study 1: Designing Idempotent Webhooks for ATS Integration
* **The Problem:** Synchronizing candidate data from a legacy ATS (Bullhorn) into a multi-tenant portal without creating duplicate records or race conditions during high-volume bursts.
* **The Solution:** Building a Golang ingestion handler with strict idempotency keys, distributed locking via Redis, and a retry mechanism.
* **The Impact:** 100% data integrity for the Singapore market pilot, eliminating manual data entry.

#### Case Study 2: Modernizing an Enterprise Job Portal
* **The Problem:** A legacy architecture that was difficult to scale and slow to onboard new developers across global teams.
* **The Solution:** A phased rewrite leveraging Golang and React, orchestrated via GCP and Pulumi.
* **The Impact:** Drastically improved system responsiveness, reduced technical debt, and cleaner separation of concerns across 9 regional enterprise tenants.
