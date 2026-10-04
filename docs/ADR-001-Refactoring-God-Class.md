# Context

The legacy `LegacySubscriptionManager` was a classic "God Class" anti-pattern. It was tightly coupled to specific infrastructure technologies (PostgreSQL via `pg`, Stripe via direct HTTP calls using `axios`), directly accessed the system clock (`new Date()`), and mixed business rules with database queries and network operations. 

This tight coupling resulted in several critical issues:
1. **Untestable Business Rules**: Testing business logic (like the December discount or expiration checks) required a live database connection and mocked HTTP endpoints.
2. **Temporal Coupling**: Relying on the system clock made tests non-deterministic and impossible to test future/past scenarios reliably.
3. **I/O Interleaving**: Database queries and external API calls were mixed directly with business logic, making it impossible to swap out the database or payment provider without rewriting the core business rules.
4. **Hidden Dependencies**: The class instantiated its own database pool and made direct network calls, hiding its dependencies and violating the Dependency Inversion Principle.

# Decision

We decided to refactor the legacy subscription billing engine using **Hexagonal Architecture (Ports & Adapters)** and **SOLID principles**. 

The core domain logic is completely isolated inside the `SubscriptionBillingService` and depends only on abstract interfaces (Ports) rather than concrete implementations (Adapters).

### Key Architectural Components:
1. **Domain Models**: Pure TypeScript classes (`User`, `Subscription`) representing the core business entities, completely free of database annotations or framework code.
2. **Ports (Interfaces)**:
   - `IUserRepository`: Abstract contract for user data access.
   - `ISubscriptionRepository`: Abstract contract for subscription data access.
   - `IPaymentGateway`: Abstract contract for charging customers.
   - `ITimeProvider`: Abstract contract for retrieving the current time.
3. **Domain Service**: `SubscriptionBillingService` coordinates the ports to execute the business rules. It uses **Constructor Injection** to receive its dependencies.
4. **Infrastructure Adapters**: Concrete implementations of the ports:
   - `PostgresUserRepository` & `PostgresSubscriptionRepository` using plain `pg`.
   - `MockStripePaymentGateway` simulating external payment processing.
   - `SystemTimeProvider` wrapping the system clock.
5. **API Layer**: Express controllers and the **Composition Root** (`server.ts`) where the concrete dependency graph is assembled and injected.

# Consequences

### Benefits:
- **Deterministic Unit Testing**: The core business logic can now be tested with 100% coverage in milliseconds without requiring a database, network, or Docker.
- **Decoupled Infrastructure**: We can easily swap PostgreSQL for MongoDB, or Stripe for PayPal, by simply writing a new adapter that implements the corresponding port interface. The domain service remains completely untouched.
- **No Temporal Coupling**: By injecting `ITimeProvider`, we can mock any date/time in our unit tests, allowing us to test the December discount and expiration rules deterministically.
- **Clear Separation of Concerns**: The Express controller only handles HTTP request parsing and response formatting, while the domain service handles business rules.

### Trade-offs:
- **More Files and Abstractions**: Refactoring a single file into a structured directory layout introduces more files and interfaces, which slightly increases the initial cognitive load for new developers.
- **Additional Wiring**: Requires a Composition Root to manually wire up and inject dependencies.

# Code Smells Addressed

| Legacy Code Smell | Refactored Solution |
| :--- | :--- |
| **Temporal Coupling** (`new Date()`) | **`ITimeProvider`**: Time is injected as a dependency, allowing deterministic testing of time-sensitive business rules. |
| **I/O Interleaving** (SQL queries mixed with business logic) | **Repository Ports**: Database operations are abstracted behind `IUserRepository` and `ISubscriptionRepository`. |
| **Hidden Dependencies** (Instantiating `Pool` inside constructor) | **Dependency Injection**: All dependencies are passed into the constructor of `SubscriptionBillingService`. |
| **God Class** (`LegacySubscriptionManager`) | **Separated Responsibilities**: Split into Domain Service, Infrastructure Adapters, and API Controllers. |
| **Untestable Business Rules** | **Deterministic Unit Tests**: Business rules are tested in isolation using lightweight mocks. |
