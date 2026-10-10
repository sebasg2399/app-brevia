import type { ActionItem } from '@domain/value-objects/action-item';

export interface AIGatewayGenerateInput {
  readonly transcript: string;
  readonly systemPrompt?: string;
  readonly model?: string;
}

export interface AINotesDraft {
  readonly summary: string;
  readonly actionItems: ReadonlyArray<ActionItem>;
  readonly nextSessionBrief: string;
  readonly model: string;
  readonly rawResponse: string;
}

export interface AIGateway {
  generateNotes(input: AIGatewayGenerateInput): Promise<AINotesDraft>;
}
