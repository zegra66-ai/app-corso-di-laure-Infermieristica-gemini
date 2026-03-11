import { Type } from "@google/genai";

export enum Year {
  FIRST = "1° Anno",
  SECOND = "2° Anno",
  THIRD = "3° Anno",
}

export interface Competency {
  id: string;
  category: string;
  description: string;
}

export interface Evaluation {
  studentName: string;
  tutorName: string;
  department: string;
  directorNotes: string;
  year: Year;
  scores: Record<string, number>;
  notes: string;
  date: string;
}

export const EVALUATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overallFeedback: {
      type: Type.STRING,
      description: "Feedback complessivo sulla performance dello studente.",
    },
    ethicalReflection: {
      type: Type.STRING,
      description: "Riflessione sull'aspetto etico-umanistico basata sulle linee guida Marcelline.",
    },
    improvementAreas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Aree di miglioramento suggerite.",
    },
    gradeSuggestion: {
      type: Type.NUMBER,
      description: "Suggerimento di voto finale in trentesimi.",
    },
  },
  required: ["overallFeedback", "ethicalReflection", "improvementAreas", "gradeSuggestion"],
};
