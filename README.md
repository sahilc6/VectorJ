# VectorJ: From-Scratch Vector Database & RAG Pipeline

![VectorJ Architecture](https://img.shields.io/badge/Architecture-Spring_Boot_%2B_React_%2B_PostgreSQL-blue.svg)
![Build](https://img.shields.io/badge/Build-Passing-brightgreen.svg)
![Version](https://img.shields.io/badge/Version-2.0.0-blue.svg)

VectorJ is a Java-based vector database implementation with a React frontend, PostgreSQL persistence, and an integrated Retrieval-Augmented Generation (RAG) pipeline. It demonstrates the core concepts behind vector search systems, including vector indexing, similarity search, document storage, and retrieval, providing a practical understanding of how modern vector databases are built and used in RAG applications.

This document serves as the **Single Source of Truth (SSOT)** for VectorJ. It is designed to be a comprehensive knowledge base for understanding the architecture, algorithms, and design decisions, making it an ideal resource for system design deep-dives and interview preparation.

---

## Table of Contents

1. [Project Overview and Purpose](#1-project-overview-and-purpose)
2. [Problem Statement and Motivation](#2-problem-statement-and-motivation)
3. [Architecture and System Design](#3-architecture-and-system-design)
4. [Tech Stack & Justification](#4-tech-stack--justification)
5. [Folder Structure](#5-folder-structure)
6. [End-to-End Workflow & Request Lifecycle](#6-end-to-end-workflow--request-lifecycle)
7. [Database Schema & Relationships](#7-database-schema--relationships)
8. [API Documentation](#8-api-documentation)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Core Business Logic & Algorithms](#10-core-business-logic--algorithms)
11. [Design Decisions & Trade-offs](#11-design-decisions--trade-offs)
12. [Performance Optimizations & Scalability](#12-performance-optimizations--scalability)
13. [Security Measures & Best Practices](#13-security-measures--best-practices)
14. [Challenges & Solutions](#14-challenges--solutions)
15. [Interview Preparation Guide](#15-interview-preparation-guide)
16. [Future Improvements & Extensibility](#16-future-improvements--extensibility)
17. [Deployment & Environment Configuration](#17-deployment--environment-configuration)
18. [Step-by-Step Local Setup](#18-step-by-step-local-setup)

---

## 1. Project Overview and Purpose

Vector databases are at the core of the generative AI revolution, providing long-term memory for Large Language Models (LLMs). VectorJ demystifies this technology by implementing the core storage and retrieval mechanisms from scratch.

VectorJ features:

- **Custom Search Engines:** Implementations of Brute Force, KD-Tree, and Hierarchical Navigable Small World (HNSW) algorithms.
- **Multiple Distance Metrics:** Euclidean (L2), Cosine Similarity, and Manhattan (L1).
- **RAG Integration:** Direct integration with locally hosted LLMs (via Ollama) to embed documents and generate context-aware answers.
- **Persistent Storage:** PostgreSQL integration via Spring Data JPA for ACID-compliant, durable vector storage.
- **Performance Benchmarking:** Real-time algorithmic benchmarking via the API.

---

## 2. Problem Statement and Motivation

**The Problem:** Most developers use vector databases as black boxes. When systems scale, understanding the underlying index structures is critical to tuning parameters (like `ef_search`, `ef_construction`, `M`) and managing memory overhead vs. search latency.
**The Motivation:** To build a system that exposes the internal mechanics of approximate nearest neighbor (ANN) search. By building the algorithms from scratch in Java, VectorJ provides a transparent, debuggable environment to understand spatial partitioning (KD-Trees) vs. graph-based navigation (HNSW). The recent introduction of PostgreSQL demonstrates how modern systems bridge durable disk storage with blazing-fast in-memory indexing.

---

## 3. Architecture and System Design

VectorJ uses a layered, decoupled Client-Server architecture with a Database-backed In-Memory Search Engine.

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                       │
│              (Vite dev server — port 3000)              │
└────────────────────────┬────────────────────────────────┘
                         │
                     HTTP / REST
                         │
┌────────────────────────▼────────────────────────────────┐
│               Spring Boot Backend                       │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │                Controllers                       │   │
│  │ VectorController | DocumentController            │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                               │
│  ┌──────────────────────▼───────────────────────────┐   │
│  │                Service Layer                     │   │
│  │ VectorDBService | DocumentDBService | Ollama     │   │
│  └───────────────┬───────────────┬──────────────────┘   │
│                  │               │                      │
│                  │               └────► Ollama          │
│                  │                                      │
│        ┌─────────▼─────────┐                            │
│        │ Spring Data JPA   │                            │
│        │   Repositories    │                            │
│        └─────────┬─────────┘                            │
│                  │                                      │
│        ┌─────────▼─────────┐                            │
│        │    PostgreSQL     │                            │
│        └─────────┬─────────┘                            │
│                  │                                      │
│     (Initial Load & Incremental Updates)                │
│                  │                                      │
│        ┌─────────▼─────────┐                            │
│        │ In-Memory Indexes │                            │
│        │ HNSW · KDTree     │                            │
│        │ Brute Force       │                            │
│        └───────────────────┘                            │
└─────────────────────────────────────────────────────────┘
```

### Component Roles:

1. **Frontend:** React SPA handling user interactions, API proxying, and rendering results (e.g., PCA scatter plots).
2. **Controllers:** Spring REST controllers mapping HTTP requests to service methods, enforcing strict API contracts using Request/Response DTOs.
3. **Services:**
   - `VectorDBService` & `DocumentDBService`: Coordinate data flow. On startup, they load data from PostgreSQL to initialize the in-memory search engines (HNSW, KDTree). On insert, they save to the DB first, then update the in-memory graphs.
   - `OllamaService`: WebFlux-based HTTP client communicating with the local Ollama instance.
4. **Data Access & Engine:**
   - **JPA Repositories:** Handle CRUD operations to PostgreSQL.
   - **Custom Engines:** Low-level data structures handling vector arithmetic and neighbor routing in memory.

---

## 4. Tech Stack & Justification

| Technology                        | Role           | Justification                                                                                                     |
| :-------------------------------- | :------------- | :---------------------------------------------------------------------------------------------------------------- |
| **Java 17**                       | Backend Core   | Strongly typed, excellent memory management (JVM), highly performant for algorithmic implementations.             |
| **Spring Boot 3.2**               | API Framework  | Industry standard for enterprise REST APIs, robust Dependency Injection, easy integration with WebFlux and JPA.   |
| **Spring Data JPA & Hibernate 6** | ORM            | Abstracts SQL complexity, provides clean `@Entity` mapping, and integrates perfectly with Postgres.               |
| **PostgreSQL**                    | Database       | ACID compliant, highly reliable, and supports native multi-dimensional array mapping (`real[]`).                  |
| **React 18 & Vite**               | Frontend       | Vite provides ultra-fast HMR and building. React is standard for dynamic interactive UIs.                         |
| **Ollama**                        | Local LLM Host | Completely free, local, privacy-preserving way to run embedding (`nomic-embed-text`) and generation (`llama3.2`). |

---

## 5. Folder Structure

```text
VectorJ/
├── backend/                       # Spring Boot Application
│   ├── pom.xml                    # Maven dependencies
│   └── src/main/java/com/vectorj/
│       ├── config/                # Configuration (CORS, Beans)
│       ├── controller/            # REST API endpoints (/api/doc, /api/)
│       ├── dto/                   # Strict API Contracts
│       │   ├── request/           # e.g., DocInsertRequest, VecInsertRequest
│       │   └── response/          # e.g., DocSearchHit, VecSearchResponse
│       ├── engine/                # Core algorithms (HNSW, KDTree, BruteForce)
│       ├── model/                 # JPA Entities (VectorItem, DocItem)
│       ├── repository/            # Spring Data JPA Interfaces
│       └── service/               # Business logic & LLM integrations
├── frontend/                      # React Application
│   ├── package.json               # Node dependencies
│   ├── vite.config.js             # Vite config (proxy setup)
│   └── src/                       # React components, styles, API client
```

---

## 6. End-to-End Workflow & Request Lifecycle

### Scenario: The RAG Pipeline ("Ask AI")

1. **User Input:** User submits a question via the React UI.
2. **Controller Routing:** Request hits `POST /api/doc/ask` (`DocumentController.java`) via a `DocSearchRequest` DTO.
3. **Embedding Generation:** Controller calls `ollamaService.embed(question)`. The service makes an HTTP request to the local Ollama instance running `nomic-embed-text` to generate a 768D float array.
4. **Vector Search:** Controller calls `documentDBService.search(queryEmbedding, k=3)`.
5. **HNSW Graph Traversal (In-Memory):**
   - Starts at the `topLayer` entry point of the HNSW engine.
   - Greedily descends layers using the `DistanceMetrics` function until Layer 0.
   - Performs a beam search (priority queue) at Layer 0 to find exact K nearest neighbors.
6. **Context Assembly:** The top 3 matching `DocItem` objects are retrieved. Their text content is appended into a prompt template.
7. **LLM Generation:** Controller calls `ollamaService.generate(prompt)`. Ollama processes the prompt using `llama3.2`.
8. **Response:** The answer and context references are mapped to a `Map` (or DTO) and returned to the frontend.

---

## 7. Database Schema & Relationships

VectorJ leverages PostgreSQL for persistent storage.

**Table: `documents` (Mapped by `DocItem.java`)**

- `id` (INT, Primary Key, Auto-Increment/Identity)
- `title` (VARCHAR)
- `text` (TEXT)
- `embedding` (REAL[]) - _Mapped natively using Hibernate 6's `@JdbcTypeCode(SqlTypes.ARRAY)`_

**Table: `vectors` (Mapped by `VectorItem.java`)**

- `id` (INT, Primary Key, Auto-Increment/Identity)
- `metadata` (VARCHAR)
- `category` (VARCHAR)
- `embedding` (REAL[])

_Relationship:_ Currently, these tables are independent as they serve two distinct demonstration purposes (16D demo vectors vs. 768D RAG documents).

---

## 8. API Documentation

Base URL: `http://localhost:8080/api`

### Core Vector Endpoints (`VectorController`)

- `GET /search`: Performs ANN search. Returns `VecSearchResponse`.
- `POST /insert`: Inserts a vector. Expects `VecInsertRequest`.
- `DELETE /delete/{id}`: Deletes a vector.
- `GET /benchmark`: Runs a query against all 3 algorithms and returns latency metrics.

### RAG Endpoints (`DocumentController`)

- `POST /doc/insert`: Chunks text, generates embeddings, and inserts into DB and HNSW. Expects `DocInsertRequest`.
- `POST /doc/search`: Semantic search over documents. Expects `DocSearchRequest`. Returns list of `DocSearchHit`.
- `POST /doc/ask`: Full Retrieval-Augmented Generation flow. Expects `DocSearchRequest`. Returns AI answer and context.

_Note: All endpoints validate request body shapes and utilize strict DTOs._

---

## 9. Authentication & Authorization

**Current State:** VectorJ is designed for local deployment and educational demonstration. It operates entirely over `localhost` without API keys or JWT authentication. CORS is configured strictly to only allow requests from `http://localhost:3000`.

**Future Scope for Production:**

- Implement Spring Security with OAuth2 / JWT.
- Row-level security to separate user namespaces/tenants.

---

## 10. Core Business Logic & Algorithms

### 1. Brute Force (Exact Search)

- **Time Complexity:** $O(N \cdot d)$ where $N$ is vector count, $d$ is dimensions.
- **Logic:** Iterates through every single vector, calculates distance, and maintains a Priority Queue of size $K$.
- **Use Case:** Ground truth. Used to calculate recall of the approximate algorithms.

### 2. KD-Tree (K-Dimensional Tree)

- **Time Complexity:** $O(\log N)$ for low dimensions, degrades to $O(N)$ for high dimensions.
- **Logic:** Binary space partitioning. At each depth, splits the dataset based on the median value of a single dimension.
- **Limitation:** Curse of Dimensionality. Works perfectly for the 16D demo vectors, but fails to prune effectively on 768D text embeddings.

### 3. HNSW (Hierarchical Navigable Small World)

- **Time Complexity:** $O(\log N)$ regardless of dimensions.
- **Key Parameters:**
  - **M:** The maximum number of bidirectional links (neighbors) created for every new element during insertion.
  - **efConstruction:** Controls the size of the dynamic candidate list during index construction. A higher value improves index quality but slows down build time.
  - **efSearch:** Controls the size of the dynamic candidate list during search. A higher value improves recall (search quality) at the expense of latency.
- **Logic:** Based on Skip-Lists and Small World Networks.
  - Consists of multiple layers. Layer 0 contains all nodes.
  - Nodes are randomly assigned a maximum layer level (probabilistically, fewer nodes exist on higher layers).
  - **Search:** Starts at the top layer. Finds the nearest neighbor greedily. Drops down a layer, using the previous layer's nearest neighbor as the entry point. At Layer 0, a beam search (sized by `efSearch`) is performed.
- **Why it wins:** Avoids the curse of dimensionality because it relies on graph traversal, not axis-aligned spatial cuts.

---

## 11. Design Decisions & Trade-offs

1. **Database vs. In-Memory Indices:**
   - _Decision:_ Data is stored in PostgreSQL for durability, but indices (HNSW, KD-Tree) are constructed entirely in Java Heap memory on application boot (`@PostConstruct`). PostgreSQL acts as the durable source of truth, while the HNSW graph is treated as an in-memory query index. Persisting first guarantees durability before updating the search index.
   - _Trade-off:_ Lightning-fast search speeds ($< 1ms$), but memory bound. Total capacity is limited by JVM heap size. In enterprise scenarios, indices are mem-mapped to disk or delegated to DB extensions (like `pgvector`).
2. **Standardization with DTOs:**
   - _Decision:_ Separated JPA Entities (`DocItem`) from Request/Response models (`DocSearchHit`, `VecInsertRequest`).
   - _Trade-off:_ Requires mapping logic, but prevents accidental exposure of internal database fields, prevents lazy-loading exceptions, and strongly types the API swagger/contract.
3. **Hibernate Array Mapping:**
   - _Decision:_ Using `@JdbcTypeCode(SqlTypes.ARRAY)` for native Postgres `real[]`.
   - _Trade-off:_ Ties the application specifically to PostgreSQL (or dialects supporting arrays), but entirely eliminates the serialization penalty of converting vectors to JSON strings/blobs.

---

## 12. Performance Optimizations & Scalability

**Algorithmic Benchmarks:**
The in-memory engine provides sub-millisecond latencies for vector searches. Below are approximate search latencies for single queries across varying dataset sizes.

Benchmarks below were performed on up to 100,000 randomly generated 16-dimensional vectors using Euclidean distance with k=10. Benchmarks were collected on my local development machine using a custom test script. Actual latency varies depending on hardware, JVM configuration, dataset characteristics, and query vectors.

| Dataset Size | Brute Force | KD Tree | HNSW    |
| :----------- | :---------- | :------ | :------ |
| **1K**       | 0.86 ms     | 0.39 ms | 0.91 ms |
| **10K**      | 0.57 ms     | 0.60 ms | 0.37 ms |
| **100K**     | 11.21 ms    | 7.82 ms | 0.33 ms |

- **Priority Queues (Min/Max Heaps):** Heavily utilized in search algorithms to maintain the top `K` closest points efficiently without sorting the entire dataset.
- **Heuristic Neighbor Selection:** In HNSW, when a node exceeds `M` connections, we apply a heuristic to ensure connections spread out in different directions, preventing cluster isolation.
- **Transactional Consistency:** Services use `@Transactional` to ensure that if a Postgres save fails, the in-memory HNSW index is not improperly updated.
- **ConcurrentHashMap:** Ensures thread-safe reads/writes to the in-memory vector store across multiple HTTP threads.

---

## 13. Security Measures & Best Practices

- **Separation of Concerns:** Clear boundaries between Controllers (HTTP/JSON), Services (Business/Logic), and Repositories (Data Access).
- **SQL Injection Prevention:** By using Spring Data JPA / Hibernate, all SQL queries are parameterized under the hood, completely preventing SQL injection.
- **Clean Architecture:** Domain objects (Engines) do not depend on Web objects (Controllers).

---

## 14. Challenges & Solutions

**Challenge:** Handling high-dimensional vectors (768D) efficiently.
**Solution:** KD-Trees proved unusable for text embeddings due to the curse of dimensionality. Implementing HNSW from scratch solved this, bringing search times for 768D vectors down from linear scan times to sub-millisecond logarithmic times.

**Challenge:** Efficiently storing `float[]` arrays in relational databases.
**Solution:** Instead of falling back to JSONB or Base64 encoding strings, I utilized Hibernate 6's `@JdbcTypeCode(SqlTypes.ARRAY)` to map directly to PostgreSQL's native `real[]` column type. This drastically reduced disk footprint and eliminated serialization bottlenecks.

---

## 15. Interview Preparation Guide

_If asked about this project in an interview, use these Q&As to guide your answers._

**Q: Why did you build a vector database from scratch instead of using Pinecone or pgvector?**
_A: "While Pinecone is great for production, I wanted to deeply understand the core data structures that power LLM memory. Implementing HNSW from scratch taught me how graph-based approximate nearest neighbor searches solve the curse of dimensionality that plagues traditional spatial trees like KD-Trees. I paired this with PostgreSQL to demonstrate how modern databases combine disk durability with in-memory indexes."_

**Q: Can you explain how the HNSW algorithm works in your project?**
_A: "HNSW is a multilayer graph, conceptually similar to a skip-list. The top layer has very few nodes with long-range connections. When a query comes in, I start at the top layer, greedily find the closest node, and drop down to the next layer using that node as an entry point. By the time I reach the bottom layer, I'm already in the correct 'neighborhood', and I use a priority queue to perform a local beam search to find the exact K nearest neighbors. This gives $O(\log N)$ search time regardless of dimensions."_

**Q: How does your system handle data consistency and durability?**
_A: "I use PostgreSQL as the single source of truth. When an insert request arrives, I use Spring's `@Transactional`. I first persist the entity to Postgres using Spring Data JPA. If that succeeds, the auto-generated ID and the vector are inserted into the in-memory `ConcurrentHashMap` and the HNSW graph. If the DB fails, the transaction rolls back, and the in-memory state remains untouched."_

**Q: What is the biggest bottleneck in your system right now, and how would you fix it?**
_A: "Currently, startup time and memory footprint. Because the HNSW index is not mem-mapped to disk, the application must read all records from PostgreSQL (`findAll()`) and rebuild the entire graph in RAM on startup (`@PostConstruct`). Startup is $O(N \log N)$ because the graph is rebuilt from persistent storage. This is acceptable for the current scale but would become a bottleneck at very large datasets. To fix this at scale, I would either utilize the `pgvector` extension to offload indexing to Postgres, or implement memory-mapped files (like RocksDB) for the Java engine."_

**Q: Why didn't you use KDTree for RAG?**
_A: "KD-Trees suffer from the curse of dimensionality. They work well for low-dimensional data (like our 16D demo vectors), but for 768D embeddings generated by LLMs, spatial partitioning becomes highly inefficient, causing performance to degrade to almost a linear search. HNSW relies on graph traversal, navigating small world networks to bypass this issue entirely."_

---

## 16. Future Improvements & Extensibility

- **Batch Startup Loading:** Implement Pagination/Streaming in `@PostConstruct` instead of `findAll()` to prevent OOM errors on startup with massive datasets.
- **pgvector Integration:** Support optional `pgvector` integration for benchmarking against the custom HNSW implementation, keeping the custom engine as the centerpiece.
- **Quantization:** Implement Scalar Quantization (SQ) or Product Quantization (PQ) to reduce the memory footprint of `float[]` arrays by converting them to `byte[]` chunks.

---

## 17. Deployment & Environment Configuration

**Prerequisites:**

- Java 17+
- Node 18+
- Maven
- PostgreSQL (running locally on port 5432)
- Ollama (running locally on port 11434)

**Environment Variables (`application.properties`):**

```properties
server.port=8080
spring.main.allow-bean-definition-overriding=true
ollama.host=127.0.0.1
ollama.port=11434
ollama.embed-model=nomic-embed-text
ollama.gen-model=llama3.2
vectorj.demo-dims=16
spring.web.resources.static-locations=classpath:/static/
spring.datasource.url=jdbc:postgresql://localhost:5432/your_database
spring.datasource.username=${DB_USERNAME:your_username}
spring.datasource.password=${DB_PASSWORD:your_password}
# Spring Boot can infer this from the URL
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

```

---

## 18. Step-by-Step Local Setup

1. **Setup Database:**
   Ensure PostgreSQL is running. Create a database named `mydatabase` (or match your `application.properties` URL).
2. **Start Ollama & Pull Models:**
   ```bash
   ollama serve
   ollama pull nomic-embed-text
   ollama pull llama3.2
   ```
3. **Build and Run Backend:**

   ```bash
   cd backend
   mvn clean install -DskipTests

   # 1. Copy the example configuration file
   cp src/main/resources/application.properties.example src/main/resources/application.properties

   # 2. Set your database credentials either by editing application.properties directly or setting env vars
   export DB_USERNAME=postgres
   export DB_PASSWORD=admin123

   mvn spring-boot:run
   ```

   _Note: On first boot, Hibernate will automatically generate the `documents` and `vectors` tables._

4. **Run Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Access the app at `http://localhost:3000`.

To create a single production bundle, run `npm run build` in the frontend, which injects the static files into Spring Boot's `/static/` folder.
