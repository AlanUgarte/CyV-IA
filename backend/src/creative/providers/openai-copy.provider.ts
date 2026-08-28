import { Injectable } from '@nestjs/common';
import { CopyProvider } from './types';
import { OpenaiService } from '../openai.service';

// El "cerebro" de texto (análisis, estrategia, copy, prompts) vía OpenAI chat.
@Injectable()
export class OpenAICopyProvider implements CopyProvider {
  readonly name = 'openai';
  constructor(private readonly openai: OpenaiService) {}
  get enabled(): boolean { return this.openai.enabled; }
  generateJSON<T = any>(system: string, user: string, maxTokens = 900): Promise<T> {
    return this.openai.chatJSON<T>(system, user, maxTokens);
  }
}
