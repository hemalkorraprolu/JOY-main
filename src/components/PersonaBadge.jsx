import React from 'react';

/**
 * PersonaBadge — Displays the currently active host persona
 * in the studio header.
 * 
 * Props:
 *  - persona: { id, emoji, name, style }
 */

export const HOST_PERSONAS = {
  alex: {
    id: 'alex',
    emoji: '🎯',
    name: 'JOY',
    style: 'Analytical Mode',
    description: 'Sharp, data-driven follow-ups. Probes compute trade-offs, megawatts, and concrete efficiency metrics at Next Wave.',
    pitch: 1.1,
    rate: 1.0,
    systemPromptFlavor: `You are JOY in Analytical Mode at Next Wave. Your podcast interviewing style:
- Speak in brief, punchy conversational volleys (20-40 words max).
- Probe for hard energy metrics, compute cost per watt, and thermal trade-offs.
- Listen actively to the speaker or student, acknowledge their point, then throw a sharp follow-up.
- Never lecture or explain. You are a curious host digging into the engineering reality.`
  },
  elena: {
    id: 'elena',
    emoji: '🌱',
    name: 'JOY',
    style: 'Visionary Mode',
    description: 'Inspiring connections between green computing and planetary impact. Big-picture systemic thinking at Next Wave.',
    pitch: 1.15,
    rate: 0.95,
    systemPromptFlavor: `You are JOY in Visionary Mode at Next Wave. Your podcast interviewing style:
- Speak in warm, concise conversational bursts (20-40 words max).
- Connect the speaker's or student's breakthrough to broader climate modeling, clean energy grids, and net-zero futures.
- Keep the mic moving—validate their vision with genuine excitement, then pose a thought-provoking future question.`
  },
  marcus: {
    id: 'marcus',
    emoji: '⚡',
    name: 'JOY',
    style: "Devil's Advocate Mode",
    description: 'Provocative and contrarian. Challenges greenwashing, grid reliability, and hidden supply chain costs at Next Wave.',
    pitch: 1.05,
    rate: 1.05,
    systemPromptFlavor: `You are JOY in Devil's Advocate Mode at Next Wave. Your podcast interviewing style:
- Speak in fast, candid conversational volleys (20-40 words max).
- Respectfully challenge claims: What about intermittent renewable grids, embodied carbon in chips, and greenwashing?
- Push speakers and students to defend the real-world economics of their sustainable solution.`
  }
};

export function PersonaBadge({ personaId = 'alex' }) {
  const persona = HOST_PERSONAS[personaId] || HOST_PERSONAS.alex;

  return (
    <div className="persona-badge" title={persona.description}>
      <span className="persona-badge__emoji">{persona.emoji}</span>
      <span>{persona.style}</span>
    </div>
  );
}
