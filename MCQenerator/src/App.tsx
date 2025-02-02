import React, { useState, useRef } from 'react';
import { FileText, Upload, Link, Settings, Check, X, AlertCircle, Brain, Layers, Shuffle } from 'lucide-react';

type InputMethod = 'text' | 'file' | 'url';
type Difficulty = 'easy' | 'medium' | 'hard';
type CognitiveLevel = 'remember' | 'understand' | 'apply' | 'analyze';

interface TextEntities {
  processes: string[];
  structures: string[];
  concepts: string[];
  relationships: Array<[string, string]>;
}

interface GenerationSettings {
  questionCount: number;
  difficulty: Difficulty;
  includeExplanations: boolean;
  cognitiveDistribution: boolean;
}

interface MCQOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface MCQuestion {
  id: string;
  question: string;
  options: MCQOption[];
  explanation?: string;
  selectedOption?: string;
  cognitiveLevel: CognitiveLevel;
  type: 'definition' | 'cause-effect' | 'comparison' | 'sequencing' | 'scenario';
  sourceReference: string;
}

const questionPatterns = {
  definition: {
    templates: [
      "What is the primary function of {term}?",
      "Which statement best defines {term}?",
      "What characterizes {term}?",
    ],
    level: 'remember' as CognitiveLevel,
  },
  'cause-effect': {
    templates: [
      "What happens when {condition}?",
      "What is the direct result of {action}?",
      "Which outcome follows {event}?",
    ],
    level: 'understand' as CognitiveLevel,
  },
  comparison: {
    templates: [
      "How does {term1} differ from {term2}?",
      "What distinguishes {term1} from {term2}?",
      "Which feature separates {term1} from {term2}?",
    ],
    level: 'analyze' as CognitiveLevel,
  },
  sequencing: {
    templates: [
      "What is the correct order of {process}?",
      "Which step follows {event} in {process}?",
      "What is the initial step in {process}?",
    ],
    level: 'understand' as CognitiveLevel,
  },
  scenario: {
    templates: [
      "In which situation would {principle} be most applicable?",
      "Which example demonstrates {concept}?",
      "How would {term} be applied in a real-world context?",
    ],
    level: 'apply' as CognitiveLevel,
  },
};

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function extractEntities(text: string): TextEntities {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const words = text.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  
  // Extract multi-word terms and single words
  const processPatterns = /(?:process of |steps in |stages of |cycle of |mechanism of )([a-z\s]+)/gi;
  const structurePatterns = /(?:structure of |composed of |made up of |contains |within )([a-z\s]+)/gi;
  const conceptPatterns = /(?:concept of |principle of |theory of |law of |definition of )([a-z\s]+)/gi;

  const processes = Array.from(text.matchAll(processPatterns), m => m[1].trim());
  const structures = Array.from(text.matchAll(structurePatterns), m => m[1].trim());
  const concepts = Array.from(text.matchAll(conceptPatterns), m => m[1].trim());

  // Extract relationships between terms
  const relationships: Array<[string, string]> = [];
  sentences.forEach(sentence => {
    const comparisonMatch = sentence.match(/(?:compared to|differs from|versus|vs\.|unlike)\s+([^,\.]+)/i);
    if (comparisonMatch) {
      const terms = comparisonMatch[1].split(/\s+(?:and|or)\s+/);
      if (terms.length === 2) {
        relationships.push([terms[0].trim(), terms[1].trim()]);
      }
    }
  });

  return {
    processes: [...new Set(processes)],
    structures: [...new Set(structures)],
    concepts: [...new Set(concepts)],
    relationships
  };
}

function generateContextualQuestion(
  type: keyof typeof questionPatterns,
  entities: TextEntities,
  text: string,
  paragraphNumber: number
): { question: string; correctAnswer: string; sourceReference: string } {
  const paragraph = text.split(/\n\n/)[paragraphNumber - 1] || text;
  
  switch (type) {
    case 'definition': {
      const concept = entities.concepts[Math.floor(Math.random() * entities.concepts.length)];
      const conceptSentence = paragraph.split(/[.!?]+/).find(s => s.toLowerCase().includes(concept)) || '';
      return {
        question: `What is ${concept}?`,
        correctAnswer: conceptSentence.trim(),
        sourceReference: `Paragraph ${paragraphNumber}`
      };
    }
    case 'comparison': {
      const [term1, term2] = entities.relationships[Math.floor(Math.random() * entities.relationships.length)] || [];
      const comparisonSentence = paragraph.split(/[.!?]+/).find(s => 
        s.toLowerCase().includes(term1) && s.toLowerCase().includes(term2)
      ) || '';
      return {
        question: `How does ${term1} differ from ${term2}?`,
        correctAnswer: comparisonSentence.trim(),
        sourceReference: `Paragraph ${paragraphNumber}`
      };
    }
    case 'sequencing': {
      const process = entities.processes[Math.floor(Math.random() * entities.processes.length)];
      const processSentence = paragraph.split(/[.!?]+/).find(s => s.toLowerCase().includes(process)) || '';
      return {
        question: `What is the correct sequence in ${process}?`,
        correctAnswer: processSentence.trim(),
        sourceReference: `Paragraph ${paragraphNumber}`
      };
    }
    case 'cause-effect': {
      const sentences = paragraph.split(/[.!?]+/);
      const causeSentence = sentences.find(s => 
        /(?:causes|results in|leads to|produces|triggers)/i.test(s)
      ) || '';
      return {
        question: `What is the effect of ${causeSentence.split(/causes|results in|leads to|produces|triggers/i)[0].trim()}?`,
        correctAnswer: causeSentence.trim(),
        sourceReference: `Paragraph ${paragraphNumber}`
      };
    }
    case 'scenario': {
      const concept = entities.concepts[Math.floor(Math.random() * entities.concepts.length)];
      const conceptSentence = paragraph.split(/[.!?]+/).find(s => s.toLowerCase().includes(concept)) || '';
      return {
        question: `Which scenario best demonstrates ${concept}?`,
        correctAnswer: conceptSentence.trim(),
        sourceReference: `Paragraph ${paragraphNumber}`
      };
    }
    default:
      return {
        question: '',
        correctAnswer: '',
        sourceReference: ''
      };
  }
}

function generatePlausibleDistractors(
  correctAnswer: string,
  entities: TextEntities,
  difficulty: Difficulty
): string[] {
  const distractors: string[] = [];
  
  // Use related terms but with incorrect relationships
  if (entities.relationships.length > 0) {
    const [term1, term2] = entities.relationships[0];
    distractors.push(`${term2} is responsible for ${term1}'s function`);
  }

  // Use similar structures with incorrect functions
  if (entities.structures.length > 0) {
    const structure = entities.structures[0];
    distractors.push(`${structure} is involved in a different process`);
  }

  // Use related concepts with common misconceptions
  if (entities.concepts.length > 0) {
    const concept = entities.concepts[0];
    distractors.push(`${concept} operates independently of other processes`);
  }

  // Fill remaining slots with difficulty-appropriate distractors
  while (distractors.length < 3) {
    const difficultyDistractors = {
      easy: ['The process occurs in reverse', 'No interaction takes place', 'The structure is inactive'],
      medium: ['The relationship is indirect', 'Multiple steps are skipped', 'The effect is temporary'],
      hard: ['The mechanism is substrate-independent', 'Regulation occurs at a different level', 'The pathway is non-linear']
    };
    
    distractors.push(difficultyDistractors[difficulty][distractors.length]);
  }

  return distractors;
}

function App() {
  const [inputMethod, setInputMethod] = useState<InputMethod>('text');
  const [inputText, setInputText] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<MCQuestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState<GenerationSettings>({
    questionCount: 10,
    difficulty: 'medium',
    includeExplanations: true,
    cognitiveDistribution: true,
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);

    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size must be less than 10MB');
      return;
    }

    const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Only TXT, PDF, and DOCX files are supported');
      return;
    }

    try {
      const text = await file.text();
      setInputText(text);
    } catch (error) {
      setFileError('Error reading file. Please try again.');
    }
  };

  const generateMockQuestions = (text: string, count: number, difficulty: Difficulty): MCQuestion[] => {
    const entities = extractEntities(text);
    const questions: MCQuestion[] = [];
    const questionTypes = ['definition', 'cause-effect', 'comparison', 'sequencing', 'scenario'] as const;
    
    for (let i = 0; i < count; i++) {
      const questionType = questionTypes[i % questionTypes.length];
      const paragraphNumber = Math.floor(i / questionTypes.length) + 1;
      
      const { question, correctAnswer, sourceReference } = generateContextualQuestion(
        questionType,
        entities,
        text,
        paragraphNumber
      );

      if (!question || !correctAnswer) continue;

      const distractors = generatePlausibleDistractors(correctAnswer, entities, difficulty);
      const options = shuffleArray([
        { id: `q${i + 1}_a`, text: correctAnswer, isCorrect: true },
        ...distractors.map((d, j) => ({
          id: `q${i + 1}_${String.fromCharCode(98 + j)}`,
          text: d,
          isCorrect: false
        }))
      ]);

      questions.push({
        id: `q${i + 1}`,
        question,
        options,
        type: questionType,
        cognitiveLevel: questionPatterns[questionType].level,
        explanation: settings.includeExplanations
          ? `As stated in ${sourceReference}: "${correctAnswer}"`
          : undefined,
        sourceReference
      });
    }

    return questions;
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text or upload a file');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const questions = generateMockQuestions(inputText, settings.questionCount, settings.difficulty);
      setGeneratedQuestions(questions);
    } catch (error) {
      alert('Error generating questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setGeneratedQuestions(questions =>
      questions.map(q =>
        q.id === questionId
          ? { ...q, selectedOption: optionId }
          : q
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI MCQ Generator</h1>
          <p className="text-lg text-gray-600">Transform any text into multiple-choice questions instantly</p>
        </header>

        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6">
          {/* Input Method Selection */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setInputMethod('text')}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border ${
                inputMethod === 'text' ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Paste Text</span>
            </button>
            <button
              onClick={() => setInputMethod('file')}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border ${
                inputMethod === 'file' ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-5 h-5" />
              <span>Upload File</span>
            </button>
            <button
              onClick={() => setInputMethod('url')}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border ${
                inputMethod === 'url' ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Link className="w-5 h-5" />
              <span>Enter URL</span>
            </button>
          </div>

          {/* Input Area */}
          <div className="mb-6">
            {inputMethod === 'text' && (
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your text here (500-5000 characters)"
                className="w-full h-48 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
            {inputMethod === 'file' && (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Drag and drop your file here, or click to browse</p>
                  <p className="text-sm text-gray-500 mt-2">Supported formats: PDF, TXT, DOCX (Max 10MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.pdf,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                {fileError && (
                  <div className="mt-2 text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {fileError}
                  </div>
                )}
              </>
            )}
            {inputMethod === 'url' && (
              <input
                type="url"
                placeholder="Enter webpage URL"
                className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => setInputText(e.target.value)}
              />
            )}
          </div>

          {/* Settings */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold">Generation Settings</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Questions
                </label>
                <select
                  value={settings.questionCount}
                  onChange={(e) => setSettings({ ...settings, questionCount: Number(e.target.value) })}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                >
                  {[5, 10, 15, 20].map((num) => (
                    <option key={num} value={num}>{num} questions</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={settings.difficulty}
                  onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as Difficulty })}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Include Explanations
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeExplanations}
                    onChange={(e) => setSettings({ ...settings, includeExplanations: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cognitive Distribution
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.cognitiveDistribution}
                    onChange={(e) => setSettings({ ...settings, cognitiveDistribution: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Generating...' : 'Generate MCQs'}
          </button>
        </div>

        {/* Results Section */}
        {generatedQuestions.length > 0 && (
          <div className="max-w-3xl mx-auto mt-8 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Generated Questions</h2>
            <div className="space-y-8">
              {generatedQuestions.map((q, index) => (
                <div key={q.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start gap-4">
                    <span className="bg-blue-100 text-blue-800 font-medium px-3 py-1 rounded-full">
                      Q{index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">
                          {q.type}
                        </span>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">
                          {q.cognitiveLevel}
                        </span>
                      </div>
                      <p className="text-lg font-medium text-gray-900 mb-4">{q.question}</p>
                      <div className="grid grid-cols-1 gap-3">
                        {q.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionSelect(q.id, option.id)}
                            className={`w-full p-4 rounded-lg border text-left transition-all ${
                              q.selectedOption
                                ? option.id === q.selectedOption
                                  ? option.isCorrect
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-red-500 bg-red-50'
                                  : option.isCorrect
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 bg-gray-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {q.selectedOption && (
                                option.id === q.selectedOption
                                  ? option.isCorrect
                                    ? <Check className="w-5 h-5 text-green-500" />
                                    : <X className="w-5 h-5 text-red-500" />
                                  : option.isCorrect && <Check className="w-5 h-5 text-green-500" />
                              )}
                              <span>{option.text}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {q.selectedOption && q.explanation && (
                        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Explanation:</span> {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;