# MCP-E2E Project: Task Plan

This plan outlines the development tasks for the mcp-e2e project, focusing on LLM-achievable steps, based on the provided technical and functional requirements.

## Phase 1: Core Client Foundation (`packages/mcp-client`)

### 1.1. UI Setup & Styling
- **Task**: Install and configure MUI (Material-UI) for UI components in the Next.js application.
  - *Related Requirements*: TR_CLIENT_003
- **Task**: Implement the basic application layout using Next.js App Router and MUI components.
  - *Considerations*: Ensure basic responsiveness for common desktop viewports (TR_CLIENT_005).
  - *Related Requirements*: TR_CLIENT_001, TR_CLIENT_005

### 1.2. Chat Interface Implementation
- **Task**: Install the Vercel AI SDK (`ai` package).
  - *Related Requirements*: TR_CLIENT_006
- **Task**: Implement the core chat user interface using the `useChat` hook from the Vercel AI SDK.
  - *UI Elements*: User message input field, send button (FR_CLIENT_001), and a conversation display area that distinguishes between user and AI messages (FR_CLIENT_002).
  - *Functionality*: Ensure streaming display of responses from the backend (TR_CLIENT_007, FR_CLIENT_004).
  - *Related Requirements*: TR_CLIENT_006, TR_CLIENT_007, FR_CLIENT_001, FR_CLIENT_002, FR_CLIENT_004
- **Task**: Implement UI status indicators for system states such as "Connecting...", "Sending...", "Agent is typing...", "Executing local action with [Provider Name]...", "Error".
  - *Related Requirements*: FR_CLIENT_013

### 1.3. Configuration Management
- **Task**: Develop logic within the Next.js application (e.g., in `packages/mcp-client/src/app/(lib)/mcp-client-config.ts`) to read and parse the `mcp.config.json` file. This involves parsing provider `id`, `name`, `type`, and type-specific `config` (e.g., `command`, `url`).
  - *Related Requirements*: TR_CLIENT_010, FR_CLIENT_005
- **Task**: Set up and utilize environment variables (e.g., via `.env.local`) for any sensitive configurations, ensuring these files are included in `.gitignore`.
  - *Related Requirements*: TR_CLIENT_015

## Phase 2: Backend Logic & SDK Integration (`packages/mcp-client/src/app/api`)

### 2.1. Bedrock Agent Communication API
- **Task**: Create the primary Next.js API route (e.g., `/api/chat-handler`) for handling interactions with the Amazon Bedrock Agent.
  - *Related Requirements*: TR_CLIENT_008
- **Task**: Integrate the AWS SDK (e.g., `@aws-sdk/client-bedrock-agent-runtime`) within this API route to send user messages to the configured Bedrock Agent.
  - *Related Requirements*: TR_CLIENT_008, FR_CLIENT_003
- **Task**: Implement functionality in the API route to stream responses received from the Bedrock Agent back to the Vercel AI SDK on the frontend.
  - *Related Requirements*: TR_CLIENT_008, TR_CLIENT_007

### 2.2. `@modelcontextprotocol/sdk` Integration & "Return of Control"
- **Task**: Install the `@modelcontextprotocol/sdk` package.
  - *Related Requirements*: TR_CLIENT_009
- **Task**: Initialize and configure the `@modelcontextprotocol/sdk` using the parsed data from `mcp.config.json` (provider `type` and type-specific `config` for connection details).
  - *Related Requirements*: TR_CLIENT_009, TR_CLIENT_010
- **Task**: Implement "Return of Control" logic within the `/api/chat-handler` (or a dedicated API route):
  - Detect the "Return of Control" signal and instructions (including target MCP Provider `id` and input data) from the Bedrock Agent (FR_CLIENT_010).
  - Identify the target MCP Provider from the parsed `mcp.config.json` using its `id`.
  - **Application logic to prepare/format the payload** according to the target provider's expected input format (e.g., `JSON.stringify` if the provider expects a JSON string) before sending via the SDK (FR_CLIENT_011, TR_CLIENT_009).
  - Use the configured MCP SDK to invoke the specified local MCP Provider (FR_CLIENT_011).
  - **Application logic to parse the response** from the provider according to its expected output format (e.g., `JSON.parse` if the provider returns a JSON string) after receiving via the SDK (FR_CLIENT_011, TR_CLIENT_009).
  - Forward the processed data/response obtained from the local MCP Provider back to the Bedrock Agent to continue processing (FR_CLIENT_012).
  - *Related Requirements*: TR_CLIENT_008, TR_CLIENT_009, FR_CLIENT_010, FR_CLIENT_011, FR_CLIENT_012

### 2.3. `stdio` Transport Handling API
- **Task**: Create a dedicated Next.js API route to handle interactions with `stdio`-based MCP Providers listed in `mcp.config.json`.
  - *Related Requirements*: TR_CLIENT_011
- **Task**: Implement logic within this API route to use Node.js `child_process` module (or the SDK's `stdio` transport capabilities if suitable for Node.js environment) to spawn and communicate with the configured `stdio` commands.
  - *Related Requirements*: TR_CLIENT_011

## Phase 3: MCP Provider Interaction & Demo Features

### 3.1. General MCP Provider Communication
- **Task**: Systematically test and ensure that the `@modelcontextprotocol/sdk` (used by frontend or Next.js API routes) can initiate communication with all configured example MCP Provider types (stdio via its API route, SSE, WebSocket, HTTP) using their `type` and `config` from `mcp.config.json`.
  - *Verification*: Based on `mcp.config.json` settings and the functionality of the example servers.
  - *Functionality*: Test sending data and receiving/displaying data. This includes:
    - **Application logic formatting data** (e.g., `JSON.stringify` if the target provider expects JSON) before sending via the SDK (FR_CLIENT_008, TR_CLIENT_009).
    - **Application logic parsing data** (e.g., `JSON.parse` if the provider returns JSON) after receiving from the SDK (FR_CLIENT_009, TR_CLIENT_009).
  - *Related Requirements*: FR_CLIENT_007, FR_CLIENT_008, FR_CLIENT_009, TR_CLIENT_009

### 3.2. (Optional PoC) UI for MCP Provider Selection & Interaction
- **Task**: If implementing for PoC/demonstration (FR_CLIENT_006), create a UI section that dynamically lists available MCP Providers (using `name` from `mcp.config.json`).
  - *Related Requirements*: FR_CLIENT_006, FR_CLIENT_015
- **Task**: Enable users to trigger direct interaction (application formatting/parsing data as needed) with a selected example MCP Provider through this UI, for testing and demoing SDK capabilities.
  - *Related Requirements*: FR_CLIENT_006

## Phase 4: Code Quality, Finalization & Verification

### 4.1. Logging and Error Handling
- **Task**: Implement basic frontend logging to the browser console for key events, API calls, and errors.
  - *Related Requirements*: TR_CLIENT_016
- **Task**: Implement backend logging in Next.js API routes (to console for local, with an aim for CloudWatch compatibility) for important operations, requests, external calls, and errors.
  - *Related Requirements*: TR_CLIENT_016
- **Task**: Implement robust error handling in both frontend and backend components. Display user-friendly (or technically informative for PoC) error messages in the UI (e.g. for network issues, MCP provider connection failures, misconfigurations in `mcp.config.json` if essential details like a URL are missing).
  - *Related Requirements*: FR_CLIENT_014

### 4.2. Example MCP Server Adherence to `mcp.config.json` and Data Format Conventions
- **Task**: Verify that each example MCP server (`stdio/echo.js`, `sse/server.js`, `websocket/server.js`, `http/server.js`) operates according to the connection details (command, URL, port) defined for it in `mcp.config.json`.
  - *Related Requirements*: TR_CLIENT_017
- **Task**: Ensure example servers have clearly defined (by convention for PoC) input and output data formats (e.g., expects plain text, expects JSON string, returns plain text, returns JSON string). This convention MUST be understood and handled by the `mcp-client` application logic when formatting data for sending and parsing data upon receiving.
  - *Related Requirements*: TR_CLIENT_017
- **Task**: Ensure example servers remain minimal and focused on demonstrating their respective transport protocols, avoiding complex internal logic.
  - *Related Requirements*: TR_CLIENT_018

### 4.3. Adherence to Development Principles & Practices
- **Task (Ongoing)**: Consistently apply development principles (KISS, YAGNI, SOLID, DRY) throughout the project lifecycle.
  - *Reference*: Development Rules, TR_CLIENT_014 (Modular Code).
- **Task (Ongoing)**: Maintain a modular and organized code structure within all packages.
  - *Related Requirements*: TR_CLIENT_014

## Phase 5: Documentation & Review (Self-Correction / LLM Review)

- **Task**: Review all generated code and implemented features against the technical and functional requirements.
- **Task**: Validate that the solutions adhere to the outlined development principles (KISS, YAGNI, SOLID, DRY).
- **Task**: Ensure all project setup and folder structure requirements are met.
- **Task**: Prepare a summary document or checklist confirming how each requirement (TR_*, FR_*) has been addressed by the implemented tasks.
