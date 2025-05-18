# Technical Requirements: mcp-client (Next.js Application) & Project Ecosystem

## 1. Frontend Application Development (Next.js & TypeScript)

- **TR_CLIENT_001**: Next.js Framework Utilization

  - **Description**: The client application MUST be built using the Next.js framework.
  - **Specification**: Utilize App Router (or Pages Router if explicitly decided). Leverage Next.js features for API routes, client-side rendering, and static generation where appropriate.
  - **Rationale**: Provides a robust framework for React-based web applications with server-side capabilities.

- **TR_CLIENT_002**: TypeScript for Type Safety

  - **Description**: All frontend code (components, hooks, utility functions, API route handlers) MUST be written in TypeScript.
  - **Specification**: Employ strong typing, interfaces, and types to ensure code quality, maintainability, and catch errors early. Use `tsconfig.json` configured for strictness.
  - **Rationale**: Improves developer experience, code robustness, and refactorability.

- **TR_CLIENT_003**: UI Component Library - MUI

  - **Description**: The user interface components (buttons, inputs, lists, layout) MUST primarily be implemented using the MUI (Material-UI) library.
  - **Specification**: Utilize MUI components according to their documentation and best practices. Custom styling should extend or theme MUI components rather than replacing them wholesale for common elements.
  - **Rationale**: Provides a rich set of pre-built, accessible, and customizable UI components, accelerating UI development.

- **TR_CLIENT_004**: State Management

  - **Description**: Client-side state management for UI elements not handled by the Vercel AI SDK (e.g., non-chat specific UI state, configuration display state) MUST use React Hooks (`useState`, `useEffect`, `useContext`, `useReducer`).
  - **Specification**: Avoid overly complex global state managers for this PoC unless a clear need arises beyond what React Hooks can manage effectively.
  - **Rationale**: Keeps state management simple and aligned with modern React practices for the scope of a PoC.

- **TR_CLIENT_005**: Responsive UI (Basic)
  - **Description**: The chat interface SHOULD be usable on common desktop browser viewport sizes.
  - **Specification**: Employ basic responsive design principles (e.g., using MUI's grid system or CSS flexbox/grid) to ensure readability and functionality. Full mobile optimization is a secondary concern for the PoC.
  - **Rationale**: Ensures the demo is presentable on standard developer screens.

## 2. Chat Interface Implementation (Vercel AI SDK)

- **TR_CLIENT_006**: Vercel AI SDK Integration for Chat

  - **Description**: The primary chat interface (message display, input handling, streaming) MUST be implemented using the Vercel AI SDK (`ai` package, e.g., `useChat` hook).
  - **Specification**: The `useChat` hook should be configured to communicate with a designated Next.js API route (`/api/chat-handler` or similar).
  - **Rationale**: Leverages a specialized SDK for optimized chat UI, streaming, and state management, reducing boilerplate.

- **TR_CLIENT_007**: Streaming Response Handling
  - **Description**: The client MUST correctly handle and display streaming text responses received from the backend (via Vercel AI SDK) for an improved user experience.
  - **Specification**: Text should appear incrementally in the chat UI as it's received.
  - **Rationale**: Provides real-time feedback to the user, characteristic of LLM interactions.

## 3. Backend Communication (Next.js API Routes & SDKs)

- **TR_CLIENT_008**: Next.js API Route for Bedrock Agent Interaction

  - **Description**: A Next.js API route (e.g., `/api/chat-handler`) MUST be implemented to:
    1. Receive chat messages from the Vercel AI SDK frontend.
    2. Interact with the Amazon Bedrock Agent (using `aws-sdk/client-bedrock-agent-runtime` or similar).
    3. Handle "Return of Control" logic from the Bedrock Agent.
    4. Stream responses from the Bedrock Agent back to the Vercel AI SDK frontend.
  - **Specification**: API route must be robust, handle errors, and manage the conversation context/session if required by the Bedrock Agent. Use TypeScript.
  - **Rationale**: Provides a secure backend intermediary for Bedrock Agent communication and complex orchestration logic.

- **TR_CLIENT_009**: `@modelcontextprotocol/typescript-sdk` Usage for MCP Providers

  - **Description**: For interactions with local/example MCP Providers (especially during "Return of Control" or for direct demo), the application (either client-side JavaScript or predominantly Next.js API routes) MUST use the `@modelcontextprotocol/typescript-sdk`.
  - **Specification**:
    - The SDK instance must be initialized and configured based on `mcp.config.json`.
    - Calls to MCP providers must use the methods provided by this SDK.
    - **Application logic using the SDK is responsible for serializing data (e.g., `JSON.stringify()`) before sending it via the SDK if the target provider expects a specific format like JSON.**
    - **Application logic using the SDK is responsible for deserializing data (e.g., `JSON.parse()`) received via the SDK if the target provider returns a specific format like JSON.**
  - **Rationale**: Leverages the existing SDK for standardized transport-level communication with diverse MCP provider types, with data format handling managed by the application.

- **TR_CLIENT_010**: `mcp.config.json` Parsing and Utilization (See Section 6 for structure)

  - **Description**: The application MUST implement logic (likely in `packages/mcp-client/src/app/(lib)/mcp-client-config.ts` or similar) to read and parse the `mcp.config.json` file.
  - **Specification**: The parsed configuration must be used to:
    1. Configure the `@modelcontextprotocol/typescript-sdk` with available MCP Provider details (primarily connection info like `type`, `url`, `command`).
    2. (Optional) Dynamically populate UI elements listing available demo providers.
  - **Rationale**: Enables configuration-driven connectivity to MCP Providers.

- **TR_CLIENT_011**: `stdio` Transport Handling via API Route
  - **Description**: Interactions with `stdio`-based MCP Providers defined in `mcp.config.json` MUST be handled via a Next.js API route.
  - **Specification**: The API route will use Node.js `child_process` module (or the `@modelcontextprotocol/typescript-sdk` if it supports `stdio` in a Node.js environment) to spawn and communicate with the configured `stdio` command. The frontend will call this API route via HTTP.
  - **Rationale**: Works around browser limitations for direct `stdio` access and keeps process management on the server-side.

## 4. Code Quality & Development Practices

- **TR_CLIENT_012**: Version Control with Git

  - **Description**: All source code, configuration files, and documentation for the project MUST be managed using Git version control.
  - **Specification**: A central repository (e.g., GitHub, GitLab) should be used. Commits should be meaningful.
  - **Rationale**: Essential for collaboration, tracking changes, and project history.

- **TR_CLIENT_013**: Monorepo Management with pnpm

  - **Description**: The project's multiple packages (frontend, example servers, shared types, IaC) MUST be managed as a monorepo using `pnpm` and its workspace features.
  - **Specification**: A `pnpm-workspace.yaml` file will define workspaces. Dependencies will be managed via `pnpm`.
  - **Rationale**: Efficiently manages dependencies, facilitates code sharing, and simplifies build/scripting across packages.

- **TR_CLIENT_014**: Modular Code Structure

  - **Description**: Code within packages, especially the Next.js client and API routes, SHOULD be organized into logical modules/components with clear responsibilities.
  - **Specification**: Utilize functions, classes, and React components to encapsulate logic. Avoid overly large files or components.
  - **Rationale**: Improves maintainability, readability, and testability.

- **TR_CLIENT_015**: Environment Variables for Sensitive Configuration

  - **Description**: Sensitive information (e.g., AWS credentials for local testing if not using profiles, API keys for MCP servers if any) MUST NOT be hardcoded.
  - **Specification**: Use environment variables (e.g., via `.env.local` for Next.js, securely injected into Lambda environments) for such configurations. Ensure `.env*.local` files are in `.gitignore`.
  - **Rationale**: Security best practice.

- **TR_CLIENT_016**: Basic Logging
  - **Description**:
    - Frontend: Key events, API calls, and errors SHOULD be logged to the browser console for debugging during development.
    - Next.js API Routes: Important operations, received requests, calls to external services (Bedrock Agent, MCP Servers), and errors MUST be logged to AWS CloudWatch Logs (or standard output if run locally).
  - **Specification**: Logs should be informative and help trace the flow of execution.
  - **Rationale**: Essential for debugging, monitoring, and understanding system behavior.

## 5. Example MCP Servers (Technical Characteristics)

## 5. Example MCP Servers (Technical Characteristics)

- **TR_CLIENT_017**: Example Server Adherence to `mcp.config.json` and Data Format Conventions

  - **Description**: Each example MCP server (stdio, SSE, WebSocket, HTTP) MUST operate according to the connection details (command, URL) specified for it in `mcp.config.json`.
  - **Specification**:
    - Example servers MUST have clearly defined (even if by convention for the PoC) input and output data formats (e.g., expects plain text, expects JSON string, returns plain text, returns JSON string).
    - This convention MUST be understood by the `mcp-client` application logic that formats data for sending and parses data upon receiving.
  - **Rationale**: Ensures the example servers can be correctly used by the client application logic which handles data formatting/parsing.

- **TR_CLIENT_018**: Example Server Simplicity
  - **Description**: The example MCP servers built for this PoC SHOULD be minimal and focus solely on demonstrating the transport protocol they represent.
  - **Specification**: E.g., echo functionality, simple data streaming. Avoid complex internal logic or dependencies unless directly related to showcasing an advanced SDK feature.
  - **Rationale**: Keeps the PoC focused on the client and SDK capabilities, not on building complex servers.

## 6. `mcp.config.json` Structure Requirement (KISS Hybrid Approach)

- **TR_CONFIG_001**: File Format and Location

  - **Description**: The MCP Provider configuration MUST be stored in a JSON file named `mcp.config.json` located within the `packages/mcp-client/` directory.
  - **Rationale**: Centralized configuration for client-side discovery of MCP providers.

- **TR_CONFIG_002**: Root Structure

  - **Description**: The root of the JSON object MAY contain optional metadata keys like `"$schema"` and `version`. The primary data MUST be under a key named `"mcpProviders"`, which MUST be an **object** where each key is a unique provider ID and each value is a provider configuration object.
  - **Rationale**: Key-value structure for direct provider lookup by ID.

- **TR_CONFIG_003**: Provider Object Structure (Value in `mcpProviders` map)

  - **Description**: Each provider object (the value associated with a provider ID key in `mcpProviders`) MUST contain:
    - `name` (String, Required): A human-readable name for display.
    - `type` (String, Optional): The transport/provider type (e.g., "stdio", "sse", "websocket", "http").
      - If `command` (see TR_CONFIG_004) is present directly in the provider object, `type` defaults to "stdio" if omitted.
  - **Provider-Specific Configuration**:
    - **For `stdio` providers**: See TR_CONFIG_004. STDIO specific fields (`command`, `args`, etc.) are direct properties of the provider object.
    - **For `http`, `sse`, `websocket` providers**: These types MUST have a `config` (Object, Required) property containing their type-specific connection details (see TR_CONFIG_005, TR_CONFIG_006, TR_CONFIG_007).
  - **Optional_Provider_Keys**: The following keys MAY also be present directly within the provider object:
    - `description` (String, Optional): A brief description of the provider.
    - `capabilities` (Array of Strings, Optional): Tags describing provider functionality.
    - `enabled` (Boolean, Optional, Default: true): To toggle provider availability.
  - **Note**: `inputMode` and `outputMode` are NOT part of this configuration structure. Data formatting/parsing is handled by the application logic using the SDK.
  - **Rationale**: Provides essential identification, typing, and connection information. STDIO configuration is flattened for directness, while other types use a nested `config` object for their parameters.

- **TR_CONFIG_004**: Direct Properties for `stdio` Providers

  - **Description**: Providers identified as `stdio` (either by an explicit `type: "stdio"` or implicitly by the presence of a `command: string` property directly in the provider object) MUST have the following direct properties:
    - `command` (String, Required): The executable command to run.
    - `args` (Array of Strings, Optional): Arguments for the command. If not provided, defaults to an empty array.
  - **Optional_stdio_direct_properties**: The following MAY also be direct properties on an STDIO provider object:
    - `cwd` (String, Optional): The working directory for the command.
    - `env` (Object, Optional): Environment variables for the command.
  - **Rationale**: Specifies how to launch stdio-based providers with direct properties for clarity and ease of use with `child_process.spawn`.

- **TR_CONFIG_005**: `config` Object for `type: "sse"`

  - **Description**: For providers with `type: "sse"`, the `config` object MUST contain:
    - `url` (String, Required): The HTTP(S) URL of the Server-Sent Events endpoint.
  - **Optional_sse_config_Keys**: `withCredentials`.
  - **Rationale**: Specifies how to connect to SSE providers.

- **TR_CONFIG_006**: `config` Object for `type: "websocket"`

  - **Description**: For providers with `type: "websocket"`, the `config` object MUST contain:
    - `url` (String, Required): The ws(s) URL of the WebSocket server.
  - **Optional_websocket_config_Keys**: `protocols`.
  - **Rationale**: Specifies how to connect to WebSocket providers.

- **TR_CONFIG_007**: `config` Object for `type: "http"`
  - **Description**: For providers with `type: "http"`, the `config` object MUST contain:
    - `url` (String, Required): The HTTP(S) URL.
    - `method` (String, Required): HTTP method.
  - **Optional_http_config_Keys**: `headers`.
  - **Rationale**: Specifies how to make HTTP requests. Application logic handles request body formatting (e.g., `JSON.stringify` if sending JSON) and response parsing (e.g., `response.json()` or `response.text()`).
- **TR_CONFIG_008**: Optional Global LLM Configuration
  - **Description**: The root of `mcp.config.json` MAY contain an optional object (e.g., `primaryLLMConfig`) to define a default/primary LLM configuration if the `mcp-client`'s backend (API routes) directly orchestrates an LLM.
  - **Specification_Example_If_Used**:
    - **Specification_Example_If_Used**:
    ```json
    // mcp.config.json
    {
      // ... other root level config if any ...
      "llm": {
        // Renamed from primaryLLMConfig
        "provider": "bedrock", // e.g., "bedrock", "openai"
        "model": "anthropic.claude-3-sonnet-20240229-v1:0",
        // Default system prompt string. Can contain simple placeholders.
        "defaultSystemPrompt": "You are a helpful AI for One NZ. Today is {today_datetime}.",
        // API keys/credentials MUST be handled server-side and not stored here.
        "temperature": 0.1 // Example parameter
      },
      "mcpProviders": [
        // ... provider definitions ...
      ]
    }
    ```
  - **Rationale**: Allows central configuration for a default system prompt and primary LLM parameters. More complex or scenario-specific prompts SHOULD be managed in the `/prompts` directory and loaded by the application logic, potentially overriding this default.

## 7. Project Folder Structure Requirement

- **TR_FOLDER_001**: Monorepo Root (`mcp-e2e/`)

  - **Description**: The entire project MUST be contained within a root directory named `mcp-e2e`.
  - **Specification**: This root directory contains global project files such as the root `package.json` (for `pnpm` workspace management and root-level scripts), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, a base `tsconfig.base.json` (optional), `.gitignore`, and `README.md`.
  - **Rationale**: Standard monorepo setup for centralized project management.

- **TR_FOLDER_002**: `packages/` Directory as Workspace Root

  - **Description**: All individual, self-contained modules or applications (workspaces) of the project MUST be organized as sub-directories within a `packages/` directory located directly under the `mcp-e2e/` root.
  - **Rationale**: Common `pnpm` workspace convention for organizing packages.

- **TR_FOLDER_003**: `packages/mcp-client/`

  - **Description**: This package MUST contain the Next.js application which serves as the primary User Application (UA) and MCP Client.
  - **Specification**:
    - Internal structure SHOULD follow Next.js App Router conventions (e.g., `src/app/`, `src/app/api/`, `src/app/(components)/`, `src/app/(lib)/`).
    - The `mcp.config.json` file MUST reside in this package's root (i.e., `packages/mcp-client/mcp.config.json`).
    - Its `package.json` SHOULD define its name as `@"mcp-e2e/mcp-client"`.
  - **Rationale**: Centralizes all frontend application code, configuration, and Next.js specific files.

- **TR_FOLDER_004**: `packages/mcp-servers-core/` (Removed / Not Used for Current Phase)

  - **Description**: This directory is not utilized for the current phase, which focuses on standalone, decoupled example servers under `packages/agents/`. Any previous plans for reusable core server logic in this package are deferred.
  - **Rationale**: Simplifies focus on demonstrating individual transport types via self-contained examples in `packages/agents/`.

- **TR_FOLDER_005**: `packages/agents/` (Formerly `packages/examples/`)

  - **Description**: This package MUST contain subdirectories for various runnable examples and agent-related components. This includes standalone example MCP servers demonstrating different transport protocols.
  - **Specification**:
    - **Example MCP Servers**: Subdirectories for each example MCP server, categorized directly by transport type, MUST exist within `packages/agents/`. For example:
      - `packages/agents/stdio/`
      - `packages/agents/sse/`
      - `packages/agents/websocket/`
      - `packages/agents/http/`
        Each of these directories will contain its respective example server script (e.g., `echo.js`, `server.js`) and a minimal `package.json` (e.g., named `@"mcp-e2e/agent-stdio-server"`). The `command` paths in `mcp.config.json` will reference these scripts (e.g., `node ./packages/agents/stdio/echo.js` if run from monorepo root, or a relative path if `cwd` is set).
    - **`agents/example-bedrock-agent-action-group/`**: (If still applicable) This sub-package MUST contain the source code (e.g., `src/index.ts`) and deployment configuration (e.g., SAM `template.yaml`) for an example AWS Lambda function designed to be used as an Action Group for Amazon Bedrock Agent. Its `package.json` might be named `@"mcp-e2e/example-action-group"`.
  - **Rationale**: Consolidates demonstration code and agent components, making them easy to find, run, and understand. The direct structure for example servers emphasizes their standalone nature.

- **TR_FOLDER_006**: `packages/shared-types/`

  - **Description**: This package MUST contain shared TypeScript interfaces, types, and enums that are used across multiple packages within the monorepo (e.g., by `mcp-client` and potentially by `example-mcp-servers` or `example-bedrock-agent-action-group`).
  - **Specification**: Contains an `src/index.ts` to export types. Its `package.json` SHOULD define its name as `@"mcp-e2e/shared-types"`.
  - **Rationale**: Promotes type safety and consistency, reduces code duplication across the monorepo.

- **TR_FOLDER_007**: `packages/iac-bedrock-agent/` (Optional, for Bedrock Agent Definition)

  - **Description**: This package MAY contain Infrastructure as Code (e.g., Terraform, CloudFormation, CDK) specifically for defining and deploying the Amazon Bedrock Agent resource itself (distinct from its Action Group Lambdas).
  - **Specification**: Its `package.json` (if scripts are managed via pnpm) might be named `@"mcp-e2e/iac-bedrock-agent"`.
  - **Rationale**: Separates the IaC for the agent from the IaC for its functional components like action groups.

- **TR_FOLDER_008**: `scripts/` (Root Level, Optional)
  - **Description**: The monorepo root MAY contain a `scripts/` directory for utility shell scripts or other automation helpers that operate across the entire monorepo (e.g., starting all example servers, running linters across all packages).
  - **Rationale**: Provides a convenient location for project-wide operational scripts.

## 8. Tech Stack Summary Requirement

- **TR_STACK_001**: Defined Technology Set
  - **Description**: The project MUST primarily use the following technologies:
    - **Monorepo Management**: pnpm (with workspaces)
    - **Frontend Framework**: Next.js (with TypeScript)
    - **Chat UI & Client-Side Logic**: Vercel AI SDK (`ai` package)
    - **General UI Components**: MUI (Material-UI)
    - **Client-Side MCP Server Communication**: `@modelcontextprotocol/typescript-sdk` (used by Next.js client/API routes)
    - **Backend Logic (API Routes, Example Servers)**: Node.js (with TypeScript)
    - **Primary AI Orchestrator**: Amazon Bedrock Agent
    - **Underlying LLMs (via Bedrock)**: Claude 3 Sonnet (or similar, as configured in Bedrock Agent and potentially called by example servers)
    - **Example MCP Server Transports**: stdio, Server-Sent Events (SSE), WebSockets, HTTP
    - **Configuration**: Custom `mcp.config.json` file
    - **Version Control**: Git
    - **IaC (Optional for Bedrock Agent infra)**: AWS SAM, AWS CDK, or Serverless Framework
    - **AWS SDK**: AWS SDK for JavaScript v3
    - **Logging**: Amazon CloudWatch Logs / Browser Console
  - **Rationale**: Provides a consistent and agreed-upon set of tools and frameworks for development.
