import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { AIGateway, AIGatewayGenerateInput, AINotesDraft } from '@app/ports/ai-gateway';
import { ActionItem } from '@domain/value-objects/action-item';
import { ValidationError } from '@domain/errors/domain-error';

const TOOL_NAME = 'save_session_notes';

const TOOL_DEFINITION = {
  name: TOOL_NAME,
  description:
    'Save structured coaching session notes extracted from a transcript. Call this exactly once with the structured output.',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description: 'A concise session summary in 1-2 paragraphs (max 500 words).',
      },
      actionItems: {
        type: 'array',
        minItems: 1,
        maxItems: 7,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'A specific, actionable task title.' },
            dueDate: {
              type: ['string', 'null'],
              description: 'Optional ISO 8601 due date, or null if not specified.',
            },
          },
          required: ['title', 'dueDate'],
        },
      },
      nextSessionBrief: {
        type: 'string',
        description: 'A brief for the next session (max 300 words) describing what to focus on.',
      },
    },
    required: ['summary', 'actionItems', 'nextSessionBrief'],
  },
};

const SYSTEM_PROMPT = `You are an expert coaching assistant. Given the transcript of a coaching session, extract structured notes in three sections:
1. summary — what was discussed, the client's state, key themes (max 500 words).
2. actionItems — 1-7 specific, actionable next steps for the client. Each item has a title and an optional ISO 8601 due date.
3. nextSessionBrief — a brief the coach can use as a starting point next time (max 300 words).

Use the save_session_notes tool exactly once. Do not return any other text.`;

export class AnthropicAIGateway implements AIGateway {
  private readonly client: Anthropic;

  constructor(apiKey: string, private readonly defaultModel = 'claude-sonnet-4-5') {
    this.client = new Anthropic({ apiKey });
  }

  async generateNotes(input: AIGatewayGenerateInput): Promise<AINotesDraft> {
    const model = input.model ?? this.defaultModel;
    const system = input.systemPrompt ?? SYSTEM_PROMPT;
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        system,
        tools: [TOOL_DEFINITION],
        tool_choice: { type: 'tool', name: TOOL_NAME },
        messages: [{ role: 'user', content: input.transcript }],
      });
      const toolUse = response.content.find((b) => b.type === 'tool_use' && b.name === TOOL_NAME);
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('Anthropic did not return a tool_use block');
      }
      const input2 = toolUse.input as unknown as {
        summary?: unknown;
        actionItems?: unknown;
        nextSessionBrief?: unknown;
      };
      if (!input2 || typeof input2 !== 'object') {
        throw new ValidationError('Anthropic tool input is not an object');
      }
      const summary = String(input2.summary ?? '');
      const actionItemsRaw = Array.isArray(input2.actionItems) ? input2.actionItems : [];
      const nextSessionBrief = String(input2.nextSessionBrief ?? '');
      const items = actionItemsRaw.map((r) => ActionItem.fromJSON(r));
      return {
        summary,
        actionItems: items,
        nextSessionBrief,
        model,
        rawResponse: JSON.stringify(response),
      };
    } catch (err) {
      // Re-throw as plain Error so the use case can mark failed
      if (err instanceof Error) throw err;
      throw new Error(String(err));
    }
  }
}