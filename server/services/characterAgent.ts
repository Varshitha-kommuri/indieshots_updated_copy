import { OpenAI } from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHARACTER_MEMORY_FILE = "memory/character_memory.json";

export class CharacterAgent {
  private characterMemory: { [key: string]: string } = {};

  constructor() {
    this.loadMemory();
  }

  private async loadMemory(): Promise<void> {
    try {
      // Ensure the memory directory exists
      await fs.mkdir(path.dirname(CHARACTER_MEMORY_FILE), { recursive: true });
      
      const content = await fs.readFile(CHARACTER_MEMORY_FILE, 'utf8');
      if (!content.trim()) {
        console.log("[INFO] character_memory.json is empty. Initializing.");
        this.characterMemory = {};
        return;
      }
      this.characterMemory = JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log("[INFO] character_memory.json not found. Creating new memory.");
        this.characterMemory = {};
      } else if (error instanceof SyntaxError) {
        console.log("[WARNING] character_memory.json is corrupted. Reinitializing.");
        this.characterMemory = {};
      } else {
        console.error("[ERROR] Failed to load character memory:", error);
        this.characterMemory = {};
      }
    }
  }

  private async saveMemory(): Promise<void> {
    try {
      // Create memory directory if it doesn't exist (matching Python logic)
      await fs.mkdir("memory", { recursive: true });
      await fs.writeFile(CHARACTER_MEMORY_FILE, JSON.stringify(this.characterMemory, null, 2));
    } catch (error) {
      console.error("[ERROR] Failed to save character memory:", error);
    }
  }

  async extractCharacters(prompt: string): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: (
              "You are an AI assistant that extracts only human character names from cinematic scene descriptions. " +
              "Return a valid Python list of unique names as strings. Do not include non-human entities or objects."
            )
          },
          {
            role: "user",
            content: (
              `Extract the human character names from this scene description:\n\n${prompt}\n\n` +
              "Return only the names as a Python list of strings. Example: ['John', 'Alice']"
            )
          }
        ]
      });

      const responseText = response.choices[0].message.content?.trim();
      if (!responseText) {
        return [];
      }

      try {
        // Parse Python list format like your original code (using eval equivalent)
        // Convert Python list format ['name'] to JavaScript array
        const pythonListMatch = responseText.match(/\[.*\]/);
        if (pythonListMatch) {
          // Convert Python single quotes to double quotes for JSON parsing
          const jsonCompatible = pythonListMatch[0].replace(/'/g, '"');
          const characterList = JSON.parse(jsonCompatible);
          return Array.isArray(characterList) ? characterList : [];
        }
        return [];
      } catch (parseError) {
        console.error(`[ERROR] Failed to parse character list from: ${responseText}`);
        return [];
      }
    } catch (error) {
      console.error(`[ERROR] Failed to extract character names: ${error}`);
      return [];
    }
  }

  async getOrGenerateDescription(character: string): Promise<string> {
    if (this.characterMemory[character]) {
      return this.characterMemory[character];
    }

    console.log(`[🧠] Generating detailed description for: ${character}`);
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: (
              "You are a professional character designer for cinematic graphic novels. " +
              "Your task is to imagine and describe a highly detailed visual appearance of a human character. " +
              "The description must include:\n" +
              "- Gender\n" +
              "- Age\n" +
              "- Skin tone\n" +
              "- Facial features (face shape, eyes, eyebrows, lips, nose)\n" +
              "- Hair (color, length, style)\n" +
              "- Height and body build\n" +
              "- Clothing style, color, and accessories\n" +
              "- Expression and posture\n" +
              "- Any distinctive traits (scars, tattoos, marks)\n" +
              "- Overall personality vibe reflected in appearance\n" +
              "Make it vivid but factual, not poetic. The description should help a visual artist draw the exact same character every time.\n" +
              "Keep the description between 250-300 words.\n" +
              "Base the style and cultural fit on the character's name if possible."
            )
          },
          {
            role: "user",
            content: `Write a highly detailed visual description of a person named ${character}.`
          }
        ]
      });

      const description = response.choices[0].message.content?.trim();
      if (description) {
        this.characterMemory[character] = description;
        await this.saveMemory();
        return description;
      } else {
        return "A person with undefined but human features.";
      }
    } catch (error) {
      console.error(`[ERROR] Failed to generate description for ${character}: ${error}`);
      return "A person with undefined but human features.";
    }
  }

  async enhancePromptWithCharacters(prompt: string): Promise<string> {
    try {
      // Extract characters from the prompt
      const characters = await this.extractCharacters(prompt);
      
      if (characters.length === 0) {
        return prompt;
      }

      console.log(`[🎭] Found ${characters.length} characters: ${characters.join(', ')}`);

      // Get descriptions for all characters
      const characterDescriptions: string[] = [];
      for (const character of characters) {
        const description = await this.getOrGenerateDescription(character);
        characterDescriptions.push(`${character}: ${description}`);
      }

      // Enhance the prompt with character descriptions
      const enhancedPrompt = `${prompt}\n\nCharacter Appearance Details:\n${characterDescriptions.join('\n\n')}`;
      
      return enhancedPrompt;
    } catch (error) {
      console.error(`[ERROR] Failed to enhance prompt with characters: ${error}`);
      return prompt;
    }
  }

  getCharacterMemory(): { [key: string]: string } {
    return { ...this.characterMemory };
  }
}

export const characterAgent = new CharacterAgent();
