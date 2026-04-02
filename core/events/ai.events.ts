export enum AiEvents {
  Suggestion = "ai:suggestion",
  Accept = "ai:accept",
  Reject = "ai:reject",
  Stream = "ai:stream",
  ChatMessage = "ai:chat-message",
  ChatRequest = "ai:chat-request",
  ChatResponse = "ai:chat-response",
  Status = "ai:status",
  Error = "ai:error",
  Cost = "ai:cost",
  Explain = "ai:explain",
  Generate = "ai:generate",
  Fix = "ai:fix",
  CopilotToggle = "copilot:toggle",
  /** Add a file to the chat context (from explorer or editor) */
  AttachFile = "ai:attach-file",
  /** Add a folder to the chat context (from explorer) */
  AttachFolder = "ai:attach-folder",
  /** Open the chat panel */
  OpenChat = "ai:open-chat",
}
