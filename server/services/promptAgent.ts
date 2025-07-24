import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class PromptAgent {
  constructor() {}

  async processExcelRow(row: any): Promise<string> {
    const baseDescription = 
      `Scene Breakdown:\n` +
      `- Shot Type: ${row['Shot Type'] || row.shotType || row.shot_type || 'Medium Shot'}\n` +
      `- Lens: ${row['Lens'] || row.lens || '50mm'}\n` +
      `- Camera Movement: ${row['Movement/Equipment'] || row.cameraMovement || row.camera_movement || 'Static'}\n` +
      `- Location: ${row['Location'] || row.location || 'Interior'} (${row['Time of Day'] || row.timeOfDay || row.time_of_day || 'Day'})\n` +
      `- Mood & Ambience: ${row['Mood & Ambience'] || row.moodAndAmbience || row.mood_and_ambience || 'Neutral'}\n` +
      `- Tone: ${row['Tone'] || row.tone || 'Dramatic'}\n` +
      `- Lighting: ${row['Lighting'] || row.lighting || 'Natural lighting'}\n` +
      `- Key Props: ${row['Props'] || row.props || 'Scene props'}\n` +
      `- Sound Design: ${row['Sound Design'] || row.soundDesign || row.sound_design || 'Ambient sound'}\n` +
      `- Director's Notes: ${row['Notes'] || row.notes || 'Standard shot'}\n` +
      `- Action: ${row['Shot Description'] || row.shotDescription || row.shot_description || 'Scene action'}\n`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: (
              "You are a professional filmmaker, storyboard artist, and scene visualizer. " +
              "Your job is to deeply analyze scene breakdowns and understand what is happening in the scene. " +
              "Think like a director visualizing a shot before it is filmed. " +
              "Imagine the characters, setting, atmosphere, lighting, camera angles, and key props in the scene. " +
              "Then write a clear, detailed visual description of exactly what should be seen in the storyboard frame. " +
              "The description must focus on accurate visual elements — not poetic or exaggerated words. " +
              "Describe the characters' look, clothes, facial expressions, and positions. " +
              "Describe the environment, background, color tones, lighting type, and camera viewpoint. " +
              "Always conclude the description by stating this is for a cinematic graphic novel comic book style storyboard image."
            )
          },
          {
            role: "user",
            content: (
              `Scene details provided below:\n\n${baseDescription}\n\n` +
              "Step 1: Understand the scene carefully.\n" +
              "Step 2: Visualize the exact look of the scene like a filmmaker imagining the shot.\n" +
              "Step 3: Write a detailed, accurate visual description (150-200 words) of the scene as if describing it to an artist who will draw it.\n" +
              "Cover characters' appearance, their emotions, background details, key props, camera angle, lighting, color palette, and environment.\n" +
              "Keep it direct and precise — avoid poetic or abstract terms.\n" +
              "End by stating this is in cinematic animated art style."
            )
          }
        ]
      });

      const finalPrompt = response.choices[0].message.content?.trim();
      return finalPrompt || baseDescription;

    } catch (error) {
      console.error(`[ERROR] Failed to generate descriptive prompt: ${error}`);
      return baseDescription;
    }
  }
}

export const promptAgent = new PromptAgent();
