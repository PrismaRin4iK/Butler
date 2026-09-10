import { GoogleGenAI } from '@google/genai';
import { EnergyLevel, ItemType } from '../../types';

export interface AIEnrichmentResult {
  energy_level: EnergyLevel;
  tags: string[];
  ai_summary: string;
  estimated_minutes?: number;
}

const SYSTEM_INSTRUCTION = `Ты — персональный дворецкий по управлению вниманием и бэклогом ("Butler").
Твоя задача — объективно оценить поступивший материал (видео, статью или задачу) и вернуть строго валидный JSON без markdown-блоков (\`\`\`json) и лишнего текста.

Критерии energy_level (когнитивная нагрузка):
- "low": развлекательные видео, мемы, легкие новости, короткие простые заметки, отдых.
- "medium": прикладные статьи, продуктовые обзоры технологий, стандартные бытовые дела, понятные гайды.
- "high": сложная техническая документация, глубокие научные/философские лонгриды, архитектура, задачи требующие максимальной концентрации.

Формат JSON:
{
  "energy_level": "low" | "medium" | "high",
  "tags": ["тег1", "тег2", "тег3"],
  "ai_summary": "Ровно одно предложение на русском языке: почему это стоит открыть/сделать прямо сейчас, создающее интригу и мотивацию без спойлеров",
  "estimated_minutes": число_минут_если_задача
}`;

export async function enrichItemWithAI(params: {
  title: string;
  type: ItemType;
  contentSnippet?: string;
  estimatedMinutes?: number;
}): Promise<AIEnrichmentResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Проанализируй элемент бэклога:
Тип: ${params.type}
Название: "${params.title}"
${params.contentSnippet ? `Контент (выдержка): "${params.contentSnippet.slice(0, 1500)}"` : ''}
${params.estimatedMinutes ? `Расчетное время: ${params.estimatedMinutes} мин` : 'Время не указано'}

Верни JSON с полями: energy_level, tags, ai_summary, estimated_minutes.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const text = response.text?.trim();
      if (text) {
        // Strip any markdown code fences if present
        const cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(cleaned);

        const energyLevel: EnergyLevel = ['low', 'medium', 'high'].includes(parsed.energy_level)
          ? parsed.energy_level
          : 'medium';

        const tags: string[] = Array.isArray(parsed.tags)
          ? parsed.tags.slice(0, 3).map((t: unknown) => String(t).trim().toLowerCase())
          : [];

        const aiSummary = typeof parsed.ai_summary === 'string' && parsed.ai_summary.length > 0
          ? parsed.ai_summary.trim()
          : `Актуальный материал: «${params.title}».`;

        const estimatedMinutes =
          typeof parsed.estimated_minutes === 'number' && parsed.estimated_minutes > 0
            ? Math.round(parsed.estimated_minutes)
            : params.estimatedMinutes;

        return {
          energy_level: energyLevel,
          tags,
          ai_summary: aiSummary,
          estimated_minutes: estimatedMinutes,
        };
      }
    } catch (error) {
      console.warn('Gemini API enrichment failed, falling back to heuristics:', error);
    }
  }

  // Robust Heuristic Fallback (when API key is absent or network fails)
  return getHeuristicEnrichment(params);
}

function getHeuristicEnrichment(params: {
  title: string;
  type: ItemType;
  estimatedMinutes?: number;
}): AIEnrichmentResult {
  const titleLower = params.title.toLowerCase();

  let energy: EnergyLevel = 'medium';
  const tags: string[] = [];

  if (params.type === 'youtube') {
    tags.push('видео');
    if (
      titleLower.includes('music') ||
      titleLower.includes('clip') ||
      titleLower.includes('meme') ||
      titleLower.includes('юмор') ||
      titleLower.includes('shorts')
    ) {
      energy = 'low';
      tags.push('развлечение');
    } else if (
      titleLower.includes('lecture') ||
      titleLower.includes('tutorial') ||
      titleLower.includes('курс') ||
      titleLower.includes('архитектур')
    ) {
      energy = 'high';
      tags.push('обучение');
    }
  } else if (params.type === 'article') {
    tags.push('статья');
    if (
      titleLower.includes('paper') ||
      titleLower.includes('research') ||
      titleLower.includes('deep dive') ||
      titleLower.includes('исследование')
    ) {
      energy = 'high';
      tags.push('исследование');
    } else if (titleLower.includes('news') || titleLower.includes('новости')) {
      energy = 'low';
      tags.push('новости');
    }
  } else {
    tags.push('задача');
    if (params.estimatedMinutes && params.estimatedMinutes <= 10) {
      energy = 'low';
    } else if (params.estimatedMinutes && params.estimatedMinutes >= 45) {
      energy = 'high';
    }
  }

  const aiSummary =
    params.type === 'youtube'
      ? `Отличное видео для фокуса: погрузитесь в «${params.title}».`
      : params.type === 'article'
      ? `Полезный материал для расширения кругозора: стоит прочитать прямо сейчас.`
      : `Сфокусируйтесь на этой задаче без отвлечений прямо сейчас.`;

  return {
    energy_level: energy,
    tags: tags.slice(0, 3),
    ai_summary: aiSummary,
    estimated_minutes: params.estimatedMinutes || 15,
  };
}
