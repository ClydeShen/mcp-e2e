# Functional Requirements: mcp-client (Next.js Application)

## 1. Core User Interaction & Chat Interface (Leveraging Vercel AI SDK)

- **FR_CLIENT_001**: User Message Input

  - **Description**: The system MUST provide a user interface element (e.g., text input field) for the user to type and submit their textual queries or messages.
  - **Acceptance_Criteria**:
    - User can type text into an input field.
    - User can submit the message (e.g., by clicking a "Send" button or pressing "Enter").

- **FR_CLIENT_002**: Conversation Display

  - **Description**: The system MUST display the conversation history in a chronological, chat-like format.
  - **Acceptance_Criteria**:
    - User's submitted messages are displayed.
    - Responses from the AI system (Amazon Bedrock Agent or via MCP Servers) are displayed.
    - Messages from the user and the AI system are clearly distinguishable (e.g., alignment, color, avatar).
    - The display area scrolls automatically to show the latest message.

- **FR_CLIENT_003**: Send User Query to Primary AI Orchestrator (Amazon Bedrock Agent)

  - **Description**: Upon user message submission, the system MUST send the user's query to the configured primary AI orchestrator (Amazon Bedrock Agent) via a backend mechanism (e.g., Next.js API route).
  - **Acceptance_Criteria**:
    - User's message is successfully transmitted from the frontend to a backend API route.
    - The backend API route successfully relays this message to the designated Amazon Bedrock Agent.

- **FR_CLIENT_004**: Receive and Display Final Response from Primary AI Orchestrator
  - **Description**: The system MUST receive the final textual response from the Amazon Bedrock Agent (via the backend API route) and display it in the chat interface as an agent message.
  - **Acceptance_Criteria**:
    - Textual response from Bedrock Agent is received by the frontend.
    - Response is added to the conversation display, attributed to the agent.
    - Streaming responses (if supported by Bedrock Agent and Vercel AI SDK) are displayed incrementally.

## 2. MCP Server Interaction (Configuration-Driven via `mcp.config.json` & `@modelcontextprotocol/sdk`)

- **FR_CLIENT_005**: Load and Process `mcp.config.json`

  - **Description**: The system (specifically, its client-side logic or Next.js API routes using the SDK) MUST load and parse the `mcp.config.json` file (as defined in Technical Requirement, now simplified without `inputMode`/`outputMode` at the provider level) to identify available MCP Providers and their configurations.
  - **Acceptance_Criteria**:
    - The `mcp.config.json` file is successfully read from `packages/mcp-client/`.
    - The `mcpProviders` array and individual provider objects (including `id`, `name`, `type`, and type-specific `config`) are correctly parsed.
    - Parsed configurations are available to the `@modelcontextprotocol/typescript-sdk` initialization logic.
    - Invalid or malformed configurations are handled gracefully.

- **FR_CLIENT_006**: UI to Select or Indicate Target MCP Provider (for Demo/Testing)

  - **Description**: For PoC/demonstration purposes, the UI SHOULD provide a mechanism for the user (developer/tester) to see available MCP Providers (using `name` from enabled providers in `mcp.config.json`) and potentially select or target a specific example MCP Provider for direct interaction tests.
  - **Acceptance_Criteria**:
    - A list of `name`s from `enabled` providers (if `enabled` key is used, otherwise all providers) in `mcp.config.json` can be displayed in the UI.
    - User can trigger an interaction specifically with one of these listed example providers, using its configured `id`.

- **FR_CLIENT_007**: Initiate Communication with MCP Providers via SDK (All Supported Transports)

  - **Description**: The system (via `@modelcontextprotocol/typescript-sdk` as used by frontend or Next.js API routes) MUST be able to initiate communication with configured MCP Providers using the transport `type` and specific `config` details (e.g., `command` for `stdio`, `url` for `sse`/`websocket`/`http`) specified for each provider in `mcp.config.json`.
  - **Acceptance_Criteria**:
    - For an `stdio` provider: The system can trigger its Next.js API route, which then successfully executes the configured `command` and establishes stdio communication.
    - For an `sse` provider: The system can connect to the `config.url` and receive events.
    - For a `websocket` provider: The system can establish a WebSocket connection to `config.url` and send/receive messages.
    - For an `http` provider: The system can make HTTP requests to `config.url` using the specified `config.method`.

- **FR_CLIENT_008**: Send Data to MCP Providers (Application Handles Formatting)

  - **Description**: The application logic using the SDK MUST format data appropriately (e.g., `JSON.stringify` for objects if the target MCP Provider expects JSON, or send raw text) _before_ passing it to the SDK's send methods for transmission to the selected/targeted MCP Provider.
  - **Acceptance_Criteria**:
    - Application code correctly prepares the payload (e.g., serializes to JSON if necessary) before calling the SDK's send function.
    - The SDK transmits the provided (already formatted) payload.

- **FR_CLIENT_009**: Receive and Display Data from MCP Providers (Application Handles Parsing)
  - **Description**: The application logic using the SDK MUST parse data appropriately (e.g., `JSON.parse` if the MCP Provider is known to return JSON, or handle raw text) _after_ receiving it via the SDK's receive/onMessage callbacks from an MCP Provider.
  - **Acceptance_Criteria**:
    - Application code correctly processes the raw data received from the SDK (e.g., deserializes from JSON if necessary).
    - Processed data is displayed in the chat UI or made available for further processing.
    - For streaming transports (SSE, WebSocket), incoming raw data chunks are handled and parsed/processed by the application logic.

## 3. Handling Amazon Bedrock Agent "Return of Control"

- **FR_CLIENT_010**: Detect and Interpret "Return of Control" Instructions

  - **Description**: The system (Next.js API route primarily, with frontend being notified) MUST be able to detect when the Amazon Bedrock Agent initiates a "Return of Control" and parse any instructions provided by the agent (e.g., which local MCP Provider `id` to invoke, what parameters/payload to use).
  - **Acceptance_Criteria**:
    - Backend API route identifies a "Return of Control" signal from Bedrock Agent.
    - Instructions, including the target MCP Provider `id` (referencing `mcp.config.json`) and necessary input data, are correctly extracted.

- **FR_CLIENT_011**: Execute Local MCP Provider Action during "Return of Control" (Application Formats/Parses)

  - **Description**: Upon receiving "Return of Control" instructions that specify a local MCP Provider action, the system (Next.js API route or frontend, using `@modelcontextprotocol/typescript-sdk` and the parsed `mcp.config.json`) MUST:
    1. Identify the correct MCP Provider from `mcp.config.json` using its `id`.
    2. Prepare/format the payload according to the target provider's expected input format.
    3. Invoke the provider using the SDK.
    4. Parse the response from the provider according to its expected output format.
  - **Acceptance_Criteria**:
    - The correct MCP Provider is identified.
    - The application logic correctly formats the payload before sending it via the SDK.
    - The application logic correctly parses the response received via the SDK.
    - Interaction is completed with the local MCP Provider.

- **FR_CLIENT_012**: Forward Data from Local MCP Provider back to Bedrock Agent
  - **Description**: After successfully interacting with a local MCP Provider during "Return of Control" and processing its response, the system MUST send any relevant resulting data back to the Amazon Bedrock Agent to allow it to continue its processing.
  - **Acceptance_Criteria**:
  - Data obtained from the local MCP Provider is correctly formatted and sent to the Bedrock Agent via the backend API route.
  - Bedrock Agent acknowledges receipt or uses the data in its subsequent response.

## 4. General UI & System Behavior

- **FR_CLIENT_013**: Status Indication

  - **Description**: The UI SHOULD provide visual feedback to the user about the system's status (e.g., "Connecting...", "Sending...", "Agent is typing...", "Executing local action with [Provider Name]...", "Error").
  - **Acceptance_Criteria**: User has a general understanding of the system's current operational state.

- **FR_CLIENT_014**: Basic Error Handling and Display

  - **Description**: The system MUST handle common errors gracefully (e.g., network issues, MCP Provider connection failures based on `mcp.config.json` details, errors from Bedrock Agent, misconfigurations in `mcp.config.json` if a provider type lacks essential config like a URL) and display user-friendly (for PoC, can be technical) error messages in the UI.
  - **Acceptance_Criteria**:
    - Connection failures or execution errors with MCP Providers are reported.
    - Errors returned by Bedrock Agent are displayed or logged.
    - The application does not crash on common, expected errors.

- **FR_CLIENT_015**: Configuration Driven UI Elements (Optional Enhancement)
  - **Description**: The UI MAY dynamically render options or information based on the `mcpProviders` array in `mcp.config.json` (e.g., listing available demo MCP providers using their `name`).
  - **Acceptance_Criteria**: If implemented, UI elements correctly reflect the current `mcp.config.json` server configurations for enabled providers (if `enabled` key is used).
