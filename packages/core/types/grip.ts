export interface GripSessionResponse {
  token: string;
  expiresAt: string;
}

export interface GripMessage {
  role: 'system' | 'user';
  content: string;
}

export interface GripJsonSchema {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
}

export interface GripResponseFormat {
  type: 'json_schema';
  json_schema: GripJsonSchema;
}

export interface GripCompletionRequest {
  model: string;
  messages: [GripMessage, GripMessage];
  response_format: GripResponseFormat;
}

export interface GripCompletionChoiceMessage {
  role: 'assistant';
  content: string;
}

export interface GripCompletionChoice {
  message: GripCompletionChoiceMessage;
  index?: number;
  finish_reason?: string;
}

export interface GripCompletionUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface GripCompletionResponse {
  choices: GripCompletionChoice[];
  usage?: GripCompletionUsage;
}
