export interface QuizQuestion {
  id?: number;
  correctAnswer: string;
  year: number;
  image: string; // URL or filename in /public/cars/
  options: [string, string, string, string]; // A, B, C, D — correct answer is somewhere in here
  correctIndex: number; // 0=A, 1=B, 2=C, 3=D
  funFact: string;
  voiceoverUrl?: string; // optional ElevenLabs audio URL
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    correctAnswer: "Jaguar E-Type",
    year: 1961,
    image: "jaguar-e-type.jpg",
    options: ["Triumph TR4", "Jaguar E-Type", "Sunbeam Alpine", "MGB Roadster"],
    correctIndex: 1,
    funFact: "Enzo Ferrari nannte ihn das schönste Auto der Welt.",
  },
  {
    id: 2,
    correctAnswer: "Aston Martin DB5",
    year: 1963,
    image: "aston-martin-db5.jpg",
    options: ["Aston Martin DB5", "Bristol 408", "Jensen CV8", "Jaguar Mk2"],
    correctIndex: 0,
    funFact: "James Bonds berühmtestes Auto — erstmals in Goldfinger (1964).",
  },
  {
    id: 3,
    correctAnswer: "Austin-Healey 3000",
    year: 1964,
    image: "austin-healey-3000.jpg",
    options: ["Morgan Plus 4", "Triumph TR4A", "Austin-Healey 3000", "Sunbeam Tiger"],
    correctIndex: 2,
    funFact: "Gewann zahlreiche Rallye-Rennen in den frühen 1960ern.",
  },
  {
    id: 4,
    correctAnswer: "Triumph TR6",
    year: 1969,
    image: "triumph-tr6.jpg",
    options: ["Lotus Elan +2", "Triumph TR6", "TVR Vixen", "MGB GT"],
    correctIndex: 1,
    funFact: "Mit 150 PS der stärkste serienmäßige Triumph seiner Zeit.",
  },
  {
    id: 5,
    correctAnswer: "MGB GT",
    year: 1965,
    image: "mgb-gt.jpg",
    options: ["MGB GT", "Austin-Healey Sprite", "Triumph Spitfire", "Lotus Cortina"],
    correctIndex: 0,
    funFact: "Über 18 Jahre gebaut — einer der meistverkauften Sportwagen Britanniens.",
  },
  {
    id: 6,
    correctAnswer: "Rolls-Royce Silver Shadow",
    year: 1965,
    image: "rolls-royce-silver-shadow.jpg",
    options: ["Daimler DS420", "Jaguar Mark X", "Bentley T1", "Rolls-Royce Silver Shadow"],
    correctIndex: 3,
    funFact: "Erster Rolls-Royce mit selbsttragender Karosserie statt Leiterrahmen.",
  },
  {
    id: 7,
    correctAnswer: "Lotus Elan",
    year: 1962,
    image: "lotus-elan.jpg",
    options: ["TVR Grantura", "Lotus Elan", "Elva Courier", "Lotus Seven"],
    correctIndex: 1,
    funFact: "Wog nur 680 kg — Colin Chapman's Prinzip: add lightness.",
  },
  {
    id: 8,
    correctAnswer: "Bentley R-Type Continental",
    year: 1952,
    image: "bentley-r-type-continental.jpg",
    options: ["Bentley R-Type Continental", "Alvis TC21/100", "Jaguar XK120", "Rolls-Royce Silver Dawn"],
    correctIndex: 0,
    funFact: "Das schnellste viersitzige Serienauto der Welt — 1952.",
  },
];

export const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export const OPTION_COLORS = [
  "#e63946", // A — Rot
  "#457b9d", // B — Blau
  "#f4a261", // C — Orange
  "#2a9d8f", // D — Teal
] as const;
