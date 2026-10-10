import type { AIGateway } from '@app/ports/ai-gateway';
import type { AIGatewayGenerateInput, AINotesDraft } from '@app/ports/ai-gateway';
import { ActionItem } from '@domain/value-objects/action-item';

/**
 * AIGateway stub that returns a deterministic, well-formed draft.
 * Used in environments without ANTHROPIC_API_KEY (local dev, CI).
 */
export class StubAIGateway implements AIGateway {
  async generateNotes(input: AIGatewayGenerateInput): Promise<AINotesDraft> {
    return {
      summary: `Summary stub (${input.transcript.length} chars): the session covered the client's goals.`,
      actionItems: [ActionItem.create({ title: 'Follow up on the main theme', dueDate: null })],
      nextSessionBrief: 'Stub brief: focus on outcomes next time.',
      model: 'stub',
      rawResponse: JSON.stringify({ length: input.transcript.length }),
    };
  }
}