
import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from "@google/genai";

const getAiInstance = () => {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not defined!");
    throw new Error("GEMINI_API_KEY is not defined!");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

import { 
  Subject, Grade, Question, StudyTopic, TestPrepPlan, 
  HistoryItem, HistoryAnalysis, DailyLesson, LessonPlan,
  InfographicData, PresentationData, ExamCheckResult, ClassroomMaterial, MaterialType,
  UserLearningProfile, GameType
} from "../types.ts";
import { STATIC_RESOURCES } from "./resourcesData.ts";

const MODEL_NAME = 'gemini-3-flash-preview';
const LITE_MODEL = 'gemini-3.1-flash-lite-preview';

/**
 * Helper to call Gemini with exponential backoff on 429 errors.
 */
async function callGemini<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      lastError = error;
      const isRateLimit = 
        error?.status === 429 || 
        error?.message?.includes('429') || 
        error?.message?.includes('RESOURCE_EXHAUSTED');

      if (isRateLimit && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.warn(`Lumdin: Gemini API Rate Limit (429) hit. Retry ${i + 1}/${maxRetries} in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

const TIPTAP_AI_INSTRUCTION = `
אתה מורה פרטי מומחה ומעצב תוכן לימודי. עליך להחזיר תוכן בפורמט HTML עשיר התואם לעורך Tiptap.

חוקים קריטיים לעיצוב התוכן:
1. נוסחאות מתמטיות: השתמש אך ורק בתגית: <span data-type="math-node" data-latex="LATEX_HERE"></span>. אל תשתמש ב-$$ או $.
2. שרטוטים גיאומטריים: כשאתה מסביר גיאומטריה, חובה להשתמש בתגית: <div data-type="geometry-node" data-shapes='JSON_ARRAY' data-show-labels="true"></div>. 
   מבנה אובייקט ב-JSON_ARRAY: {"id": "s1", "shapeType": "3_iso"|"3_right"|"4_rect"|"circle"|"line", "width": 120, "height": 120, "color": "#3B82F6", "rotation": 0, "xOffset": 0, "yOffset": 0, "sideLabels": ["א", "ב"], "vertexLabels": ["A", "B", "C"], "angleLabels": ["", "90°", ""]}.
3. גיאומטריה אנליטית (מערכת צירים): כשאתה מסביר פונקציות או נקודות, השתמש ב: <div data-type="analytic-geometry-node" data-objects='JSON_ARRAY' data-view-range='{"minX":-10,"maxX":10,"minY":-10,"maxY":10}' data-show-grid="true" data-show-numbers="true"></div>.
   סוגי אובייקטים ב-JSON_ARRAY: 
   - נקודה: {"type": "point", "label": "A", "params": {"x": 2, "y": 3}, "showEquation": true}
   - ישר: {"type": "line", "label": "f", "params": {"m": 1, "b": 0}, "showEquation": true}
   - פרבולה: {"type": "parabola", "label": "g", "params": {"a": 1, "b": 0, "c": 0}, "showEquation": true}
4. טבלאות: השתמש בתגיות HTML תקניות לטבלאות (<table>, <tr>, <td>, <th>) במידת הצורך להצגת נתונים השוואתיים או מאורגנים. הנחיה זו תקפה גם לתוצרי צ'אט וגם לתוצרי עורך עשיר.
5. עיצוב כללי: השתמש בתגיות HTML תקניות: <h1>, <h2>, <p>, <ul>, <li>, <strong>.
6. שפה: עברית בלבד.
7. חוק בל יעבור: אל תכלול שום טקסט מקדים, דברי פתיחה או דברי סיום. התחל מיד בתוכן הלימודי.
`;

const getConditionalInstruction = (subject: string, isChat: boolean = false) => {
  const isMath = subject.includes('מתמטיקה') || subject === Subject.MATH;
  const isEnglish = subject.includes('אנגלית') || subject === Subject.ENGLISH;
  
  let instructions = `אתה מורה פרטי מומחה במערכת החינוך הישראלית במקצוע ${subject}. 
תפקידך לעזור לתלמידים להבין חומר לימודי בצורה מעמיקה.

!!! חוק בטיחות ורווחה נפשית (קריטי ועליון) !!!
אם אתה מזהה בשיחה או בבקשה סימנים למצוקה רגשית, אלימות, חרם חברתי, בריונות, פגיעה עצמית או כל קושי אישי קשה שהתלמיד עובר:
1. עליך לעצור מיד את העיסוק בחומר הלימודי (גם אם נשאלת עליו במפורש).
2. עליך להגיב באמפתיה רבה, חום ותמיכה.
3. עליך להמליץ לתלמיד בצורה ברורה וחד-משמעית לדבר על כך עם מבוגר שהוא סומך עליו (הורים, מורים, יועצת בית הספר).
4. אסור לך בשום אופן להתעלם מהמצוקה או לומר "אני לא קשור לזה, בוא נלמד היסטוריה/מתמטיקה".
5. הבטיחות והרווחה הנפשית של התלמיד קודמים לכל תוכן לימודי.`;

  if (isChat) {
    instructions += `
עליך לנהל שיחה טבעית, אדיבה ומקצועית. 
1. אם המשתמש אומר "היי", "שלום" או מברך אותך - ענה לו בברכה חזרה ובקצרה, ואל תתחיל להרצות או לסכם חומר אם לא התבקשת.
2. ענה תשובות ממוקדות וקצרות יחסית. אל תכתוב סיכומים ארוכים אלא אם התבקשת במפורש.
3. זכור שאתה מודל שפה אינטראקטיבי, לא רק מחולל סיכומים. המטרה היא דיאלוג.
4. השתמש בפורמט Markdown בסיסי (בולטים, הדגשות) במידת הצורך.
5. אם השיחה היא על ${subject}, השתמש בידע המקצועי שלך כדי לענות.
`;
  } else {
    instructions += `\n${TIPTAP_AI_INSTRUCTION}`;
  }

  if (!isMath && !isEnglish) {
    instructions += `\n\n!!! חוק קריטי !!!
הנושא אינו אנגלית ואינו מתמטיקה.
אסור בהחלט להשתמש באותיות או במילים בשפה האנגלית בתוך התוכן. אל תכתוב תרגומים לאנגלית בסוגריים. השתמש אך ורק בעברית תקנית.`;
  }

  if (!isMath) {
    instructions += `\n\n!!! חוק קריטי למקצוע ${subject} - אסור בהחלט לשרטט !!!
הנושא אינו מתמטיקה. 
1. אסור להשתמש בתגית <div data-type="geometry-node">.
2. אסור להשתמש בתגית <div data-type="analytic-geometry-node">.
3. אל תייצר שום שרטוט, גרף, סקיצה או צורה גיאומטרית בכלל.`;
  }
  
  return instructions;
};

const cleanJSON = (text: string) => {
  if (!text) return "";
  // Remove markdown code blocks
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  // Sometimes Gemini adds text before or after the JSON, try to find the first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

export const detectSubjectAI = async (title: string): Promise<Subject | string> => {
  const ai = getAiInstance();
  const baseSubjects = Object.values(Subject).filter(s => s !== Subject.OTHER);
  const prompt = `נתח את הכותרת הבאה וקבע לאיזה מקצוע לימודי היא שייכת.
  כותרת: "${title}"
  
  חוקי זיהוי:
  - אם מדובר בתקופות היסטוריות, מלחמות -> החזר "היסטוריה".
  - אם מדובר במפות, מדינות, אקלים -> החזר "גיאוגרפיה".
  - אם מדובר בדקדוק עברי, פעלים -> החזר "עברית (לשון)".
  - אם מדובר במבנה האטום, כימיה, פיזיקה -> החזר "מדעים".
  - אם מדובר במספרים, משוואות, גיאומטריה -> החזר "מתמטיקה".
  - אם מדובר בסיפורי תנ"ך -> החזר "תנ״ך".
  - אם מדובר בדמוקרטיה, חוקים -> החזר "אזרחות".
  - אם באנגלית -> החזר "אנגלית".
  - אם הנושא אינו מתאים לאף אחד מהנ"ל, החזר את שם המקצוע המתאים ביותר במילה אחת (למשל: "ערבית", "מוזיקה", "אמנות").
  
  רשימת מקצועות בסיס: ${baseSubjects.join(', ')}.
  החזר אך ורק את שם המקצוע, ללא מילים נוספות.
  בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;

  return await callGemini<Subject | string>(async () => {
    const response = await ai.models.generateContent({
      model: LITE_MODEL,
      contents: prompt,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    });
    const detected = response.text?.trim() || "";
    const foundBase = baseSubjects.find(s => detected.includes(s));
    return foundBase || detected || Subject.MATH;
  });
};

export const detectGradeAI = async (title: string, content: string): Promise<Grade> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const grades = Object.values(Grade).filter(g => g !== Grade.NOT_DEFINED);
  const prompt = `נתח את הכותרת והתוכן הבאים וקבע לאיזו שכבת גיל/כיתה הם מתאימים ביותר במערכת החינוך הישראלית.
  כותרת: "${title}"
  תוכן: "${content.substring(0, 1000)}..."
  
  רשימת כיתות אפשריות: ${grades.join(', ')}.
  החזר אך ורק את שם הכיתה מהרשימה (למשל: "כיתה י׳"), ללא מילים נוספות.
  אם לא ניתן לקבוע בוודאות, החזר "כיתה י׳".`;

  try {
    const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
      model: LITE_MODEL,
      contents: prompt
    }));
    const detected = response.text?.trim() || "";
    const found = grades.find(g => detected.includes(g));
    return found || Grade.GRADE_10;
  } catch (e) {
    return Grade.GRADE_10;
  }
};

export const generateTeacherMaterial = async (
  subject: Subject | string,
  grade: Grade,
  type: MaterialType,
  title: string,
  customPrompt?: string,
  config?: { mcqCount?: number; openCount?: number },
  learningProfile?: UserLearningProfile
): Promise<{ content?: string; questions?: Question[] }> => {
  if (type === 'TEST') {
    const mcq = config?.mcqCount ?? 3;
    const open = config?.openCount ?? 2;
    const questions = await generateQuestions(
      subject,
      grade,
      title,
      [],
      mcq + open,
      'MEDIUM',
      mcq,
      open,
      customPrompt,
      learningProfile
    );
    return { questions };
  }

  if (type === 'ASSIGNMENT') {
    const content = await generateAssignment(subject, grade, title, customPrompt, learningProfile);
    return { content };
  }

  if (type === 'UPCOMING_TEST') {
    const content = await generateSummary(subject, grade, `מדריך הכנה למבחן בנושא: ${title}`, customPrompt, learningProfile);
    return { content };
  }

  if (type === 'GAME') {
    return { content: "בחר סוג משחק והגדר את התוכן" };
  }

  // Default to summary
  const content = await generateSummary(subject, grade, title, customPrompt, learningProfile);
  return { content };
};

export const generateSummary = async (
  subject: Subject | string, 
  grade: Grade, 
  topic: string, 
  customPrompt?: string, 
  learningProfile?: UserLearningProfile,
  attachments?: { mimeType: string, data: string }[]
): Promise<string> => {
  const ai = getAiInstance();
  const profileContext = learningProfile ? `\nהקשר למידה אישי של התלמיד:
  - נקודות חוזק: ${learningProfile.strengths.join(', ')}
  - נקודות קושי: ${learningProfile.weaknesses.join(', ')}
  התאם את רמת ההסבר והדגשים בהתאם לפרופיל זה.` : '';

  const prompt = `כתוב סיכום מקיף ומקצועי על "${topic}" עבור ${grade}. 
  הסיכום צריך להיות ברור, מאורגן היטב וקל להבנה, ולכלול את כל הנקודות החשובות.
  השתמש בטבלאות (<table>) לנתונים השוואתיים ובשרטוטים (geometry-node/analytic-geometry-node) להמחשות במתמטיקה.
  ${attachments && attachments.length > 0 ? 'השתמש במידע מהקבצים המצורפים כבסיס לסיכום.' : ''}
  ${profileContext}
  ${customPrompt ? `דגשים נוספים: ${customPrompt}` : ''}
  בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;
  
  return await callGemini<string>(async () => {
    const parts: any[] = [];
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => parts.push({ inlineData: att }));
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: { 
        systemInstruction: getConditionalInstruction(subject as string),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return response.text || "";
  });
};

export const generateAssignment = async (subject: Subject | string, grade: Grade, topic: string, customPrompt?: string, learningProfile?: UserLearningProfile): Promise<string> => {
    const ai = getAiInstance();
    const profileContext = learningProfile ? `\nפרופיל למידה אישי:
    - חוזקות: ${learningProfile.strengths.join(', ')}
    - חולשות: ${learningProfile.weaknesses.join(', ')}
    התאם את המטלה כך שתחזק את החולשות ותשתמש בחוזקות.` : '';

    const prompt = `צור מטלה להגשה על "${topic}" עבור ${grade}.
    שלב במידת הצורך טבלאות לנתונים או שרטוטים (geometry-node/analytic-geometry-node) להמחשת בעיות במתמטיקה.
    ${profileContext}
    ${customPrompt ? `דגשים למטלה: ${customPrompt}` : ''}
    בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;

    return await callGemini<string>(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction: getConditionalInstruction(subject),
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      return response.text || "";
    });
};

export const generateQuestions = async (
  subject: Subject | string, 
  grade: Grade, 
  topic: string, 
  recentMistakes?: string[],
  count: number = 5,
  difficulty: 'MEDIUM' | 'HARD' = 'MEDIUM',
  mcqCount?: number,
  openCount?: number,
  customPrompt?: string,
  learningProfile?: UserLearningProfile,
  attachment?: { mimeType: string, data: string }
): Promise<Question[]> => {
  const ai = getAiInstance();
  
  const mcq = mcqCount !== undefined ? mcqCount : Math.ceil(count / 2);
  const open = openCount !== undefined ? openCount : Math.floor(count / 2);

  const profileContext = learningProfile ? `\nפרופיל למידה אישי:
  - חוזקות: ${learningProfile.strengths.join(', ')}
  - חולשות: ${learningProfile.weaknesses.join(', ')}
  התאם את רמת הקושי והשאלות כך שיאתגרו את החוזקות ויחזקו את החולשות.` : '';

  const prompt = `צור ${mcq} שאלות אמריקאיות ו-${open} שאלות פתוחות על "${topic}" ל${grade} ברמת קושי ${difficulty === 'HARD' ? 'מתקדמת' : 'רגילה'}.
  ${attachment ? 'השתמש במידע מהקובץ המצורף כבסיס לשאלות.' : ''}
  ${recentMistakes && recentMistakes.length > 0 ? `שים דגש על נושאים אלו שהתלמיד התקשה בהם: ${recentMistakes.join(', ')}.` : ''}
  ${profileContext}
  ${customPrompt ? `הנחיות נוספות: ${customPrompt}` : ''}
  
  חוקים קריטיים לשאלות:
  1. טבלאות: אם נדרש להציג נתונים, השתמש בתגיות HTML תקניות לטבלאות (<table>, <tr>, <td>, <th>).
  2. גיאומטריה אנליטית: אם הנושא הוא מתמטיקה/גיאומטריה, שלב בטקסט השאלה או בהסבר תגיות <div data-type="analytic-geometry-node"> עם אובייקטים מתאימים (נקודות, ישרים, פרבולות) כדי להמחיש את השאלה.
  3. פורמט: החזר מערך JSON של אובייקטים עם השדות: id, text (ב-Markdown/LaTeX/HTML), type ('MCQ' או 'OPEN'), options (מערך של 4 ל-MCQ, ריק ל-OPEN), correctIndex (ל-MCQ), modelAnswer (לשאלות פתוחות), explanation (הסבר מפורט למה התשובה נכונה או שגויה), difficulty.
  
  בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;
  
  return await callGemini<Question[]>(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: attachment ? { parts: [{ inlineData: attachment }, { text: prompt }] } : prompt,
      config: { 
          responseMimeType: "application/json",
          systemInstruction: getConditionalInstruction(subject as string),
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    const text = response.text;
    if (!text) return [];
    return JSON.parse(cleanJSON(text));
  });
};

export const getStudyTopics = async (subject: Subject | string, grade: Grade, type: MaterialType = 'SUMMARY'): Promise<{summaries: StudyTopic[], tests: StudyTopic[]}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `הצע 5 נושאי לימוד מרכזיים עבור המקצוע ${subject} לכיתה ${grade}, המותאמים לסוג התוכן: ${type}. 
  חוק חשוב: ה-title של כל נושא חייב להיות שם הנושא בלבד (למשל: "מספרים מכוונים וציר המספרים") ללא תוספות כמו "בוחן" או "הצבה".
  החזר JSON במבנה: { "summaries": [{"title": "", "description": ""}], "tests": [{"title": "", "description": ""}] }`;
  
  try {
    const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(cleanJSON(response.text || '{"summaries":[], "tests":[]}'));
  } catch (e) {
    return { summaries: [], tests: [] };
  }
};

export const generateStudentAnalytics = async (
  studentName: string,
  stats: { averageScore: number | null; submissionRate: number; totalTasks: number; completedTasks: number }
): Promise<{ insight: string; recommendations: string[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `נתח את הביצועים של התלמיד ${studentName}: ממוצע ${stats.averageScore}%, אחוז הגשה ${stats.submissionRate}%. 
  החזר אובייקט JSON עם השדות insight (טקסט קצר) ו-recommendations (מערך של 3 טיפים).`;
  
  try {
    const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(cleanJSON(response.text || "{}"));
  } catch (e) {
    return { insight: "לא ניתן היה להפיק ניתוח כרגע.", recommendations: [] };
  }
};

export const generateClassroomAnalytics = async (
  className: string,
  subject: string,
  materials: ClassroomMaterial[]
): Promise<{ focus: string; strengths: string; recommendations: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `נתח את נתוני הכיתה "${className}" במקצוע ${subject}. חומרים: ${JSON.stringify(materials)}.
  החזר JSON עם: focus (מוקד הקושי), strengths (נקודות חוזק), recommendations (המלצות להמשך).`;

  try {
    const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(cleanJSON(response.text || "{}"));
  } catch (e) {
    return { focus: "אין מידע מספיק", strengths: "אין מידע מספיק", recommendations: "המשך לאסוף נתונים" };
  }
};

export const gradeOpenQuestion = async (question: string, modelAnswer: string, studentAnswer: string, attachment?: { mimeType: string, data: string }): Promise<{score: number, feedback: string}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `השאלה: ${question}\nתשובת מודל: ${modelAnswer}\nתשובת התלמיד: ${studentAnswer}\n
  ${attachment ? 'מצורף קובץ/תמונה להגשה של התלמיד. נתח גם את תוכן הקובץ במידת הצורך.' : ''}
  הערך את תשובת התלמיד מ-0 עד 100. תן משוב בונה ומפורט בעברית. המשוב צריך להסביר מה היה נכון, מה היה חסר ואיך להשתפר.
  החזר JSON: { "score": number, "feedback": string }`;
  
  try {
    const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: attachment ? { parts: [{ inlineData: attachment }, { text: prompt }] } : prompt,
      config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(cleanJSON(response.text || '{"score":0, "feedback":""}'));
  } catch (e) {
    return { score: 0, feedback: "שגיאה בבדיקה האוטומטית." };
  }
};

export const getChatResponseStream = async (history: any[], message: string, subject?: Subject, grade?: Grade, attachment?: { mimeType: string, data: string }): Promise<AsyncIterable<GenerateContentResponse>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const contents = [...history, { role: 'user', parts: attachment ? [{ inlineData: attachment }, { text: message }] : [{ text: message }] }];
  
  return await callGemini<AsyncIterable<GenerateContentResponse>>(() => ai.models.generateContentStream({
    model: MODEL_NAME,
    contents,
    config: {
      systemInstruction: (subject ? getConditionalInstruction(subject, true) : "אתה מורה פרטי מומחה. ענה תשובות קצרות וממוקדות, נהל שיחה טבעית ואל תרצה אם לא התבקשת.") + (subject ? ` כרגע השיעור הוא ב${subject} ל${grade}.` : "")
    }
  }));
};

export const generateTestPrepPlan = async (subject: Subject | string, grade: Grade, topic: string, days: number, attachment?: { mimeType: string, data: string }, learningProfile?: UserLearningProfile): Promise<TestPrepPlan | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const profileContext = learningProfile ? `\nפרופיל למידה אישי של התלמיד:
  - חוזקות: ${learningProfile.strengths.join(', ')}
  - חולשות: ${learningProfile.weaknesses.join(', ')}
  בנה את תוכנית ההכנה כך שתיתן מענה ממוקד לחולשות אלו.` : '';

  const prompt = `צור תוכנית הכנה למבחן ב${subject} ל${grade} בנושא "${topic}" למשך ${days} ימים.
  ${profileContext}
  החזר אובייקט JSON הכולל את השדות: 
  id, subject, targetTopic, totalDays, completedDays (מערך ריק), 
  days (מערך של אובייקטים לכל יום הכולל: dayNumber, title, summary, quiz (מערך 4 שאלות הכוללות: id, text, type, options, correctIndex, explanation - הסבר מפורט למה התשובה נכונה או שגויה), flashcards (מערך 4 כרטיסיות), conceptMap).
  
  חוקי תוכן ועיצוב קריטיים:
  1. summary: סיכום מפורט מאוד, מעמיק וארוך בפורמט HTML עשיר. אל תסתפק בפסקאות בודדות - כתוב סיכום מקיף שבאמת מכין למבחן.
  2. conceptMap: מפת מושגים איכותית המורכבת בדיוק מ-4 קשרים לוגיים מרכזיים. כל קשר מבוסס על המבנה של: נושא ← תוצאה/קשר. כל קשר הוא אובייקט: { "from": "נושא", "to": "תוצאה/קשר", "relation": "תיאור הקשר" }.
  3. עיצוב HTML: בכל שדה טקסט (summary, quiz[].text, quiz[].options, flashcards[].front, flashcards[].back) - השתמש אך ורק בפורמט HTML התואם להנחיות המורה הפרטי.
  4. טבלאות: השתמש בתגיות HTML תקניות (<table>, <tr>, <td>, <th>) להצגת נתונים מאורגנים בסיכום או בשאלות.
  5. מתמטיקה/גיאומטריה: במידה והמקצוע הוא מתמטיקה, שלב ב-summary ובשאלות לפחות 2 שרטוטים. השתמש ב-geometry-node לצורות או ב-analytic-geometry-node למערכת צירים (נקודות, ישרים, פרבולות). השתמש ב-<span data-type="math-node" data-latex="..."></span> עבור נוסחאות.
  6. מהירות: בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;
  
  try {
    const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: attachment ? { parts: [{ inlineData: attachment }, { text: prompt }] } : prompt,
      config: { 
          responseMimeType: "application/json",
          systemInstruction: getConditionalInstruction(subject as string) + "\n\nאתה מתכנן פדגוגי. החזר JSON בלבד על פי המבנה שהתבקש."
      }
    }));
    
    const plan = JSON.parse(cleanJSON(response.text || "null"));
    if (plan) plan.createdAt = Date.now();
    return plan;
  } catch (e) {
    console.error("Error generating test prep plan", e);
    return null;
  }
};

export const checkWorkForErrors = async (imageData: string, mimeType: string): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `נתח את התמונה המצורפת של דף עבודה או מבחן. חפש טעויות כתיב, דקדוק או טעויות בפתרון תרגילים מתמטיים.
    החזר JSON במבנה: {
      "spellingErrors": [{"original": "", "corrected": "", "explanation": ""}],
      "mathErrors": [{"problem": "", "error": "", "correction": ""}],
      "generalFeedback": "סיכום קצר של העבודה"
    }
    בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;

    try {
      const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
          model: MODEL_NAME,
          contents: { parts: [{ inlineData: { data: imageData, mimeType } }, { text: prompt }] },
          config: { responseMimeType: "application/json" }
      }));
      return JSON.parse(cleanJSON(response.text || "{}"));
    } catch (e) {
      return { spellingErrors: [], mathErrors: [], generalFeedback: "שגיאה בניתוח התמונה." };
    }
};

export const checkExamAI = async (imageData: string, mimeType: string, subject: string, grade: string): Promise<ExamCheckResult> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `נתח את התמונה המצורפת של מבחן פתור במקצוע ${subject} לכיתה ${grade}.
    עליך לזהות את השאלות, את תשובות התלמיד ואת התשובות הנכונות.
    עבור כל שאלה, קבע ציון (0-100) ותן הסבר מפורט למה זה הציון שניתן.
    בסוף, חשב ציון סופי משוקלל (0-100) ותן משוב כללי מעודד ומקצועי.
    
    חוקי בדיקה:
    1. אם התשובה נכונה לחלוטין -> CORRECT.
    2. אם התשובה נכונה בחלקה -> PARTIAL.
    3. אם התשובה שגויה -> WRONG.
    
    החזר JSON במבנה: {
      "finalScore": number,
      "overallFeedback": "משוב כללי",
      "questionsAnalysis": [
        {
          "questionNumber": "1",
          "status": "CORRECT" | "PARTIAL" | "WRONG",
          "pointsEarned": number,
          "totalPoints": number,
          "explanation": "הסבר מפורט לציון",
          "studentAnswer": "מה שהתלמיד כתב",
          "correctAnswer": "מה שהיה צריך לכתוב"
        }
      ]
    }
    בצע את המשימה במהירות המקסימלית (עד 20 שניות).`;

    try {
      const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
          model: LITE_MODEL,
          contents: { parts: [{ inlineData: { data: imageData, mimeType } }, { text: prompt }] },
          config: { responseMimeType: "application/json" }
      }));
      return JSON.parse(cleanJSON(response.text || "{}"));
    } catch (e) {
      console.error("Exam Check Error:", e);
      return { finalScore: 0, overallFeedback: "שגיאה בניתוח המבחן.", questionsAnalysis: [] };
    }
};

export const analyzeHistory = async (history: HistoryItem[]): Promise<HistoryAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `נתח את היסטוריית הלמידה הבאה: ${JSON.stringify(history)}. 
  זהה מגמות, נקודות חוזק, נקודות לשיפור והמלצות להמשך. 
  החזר JSON: { "insight": "ניתוח כללי", "recommendations": ["טיפ1", "טיפ2"], "strength": "נושא חזק", "weakness": "נושא לשיפור" }
  בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;

  try {
    const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(cleanJSON(response.text || "{}"));
  } catch (e) {
    return { insight: "לא ניתן לנתח כרגע.", recommendations: [], strength: "", weakness: "" };
  }
};

export const generateLessonPlan = async (topic: string, grade: Grade, extraInfo?: string): Promise<LessonPlan> => {
    const ai = getAiInstance();
    const subject = await detectSubjectAI(topic);
    const prompt = `צור מערך שיעור מקצועי ומפורט לכיתה ${grade} בנושא "${topic}". 
    ${extraInfo ? `דגשים מיוחדים: ${extraInfo}` : ''}
    החזר JSON במבנה של אובייקט LessonPlan הכולל שדות: 
    - title: כותרת השיעור
    - subject: המקצוע (חובה להשתמש באחד מהערכים: ${Object.values(Subject).join(', ')})
    - objectives: מערך של מטרות השיעור
    - introduction: פתיח לשיעור
    - mainContent: גוף השיעור בפורמט HTML עשיר
    - activity: פעילות קבוצתית או אישית מפורטת
    - summary: סיכום השיעור
    - resourcesNeeded: מערך של עזרים דרושים
    - homework: משימת המשך לבית
    - discussionQuestions: מערך של 3-5 שאלות מעמיקות לדיון בכיתה
    
    חוקי תוכן קריטיים:
    1. פעילות קבוצתית (activity): חובה לכלול פעילות יצירתית ומעניינת.
    2. שיעורי בית (homework): חובה לכלול משימת המשך לבית.
    3. שאלות לדיון (discussionQuestions): צור 3-5 שאלות פתוחות, מעוררות מחשבה ומעודדות דיון מעמיק. כל שאלה צריכה להיות מפורטת.

    חוקי עיצוב ל-mainContent:
    1. טבלאות: השתמש ב-<table> להצגת נתונים.
    2. מתמטיקה: השתמש ב-math-node לנוסחאות.
    3. גיאומטריה: השתמש ב-geometry-node או analytic-geometry-node להמחשות חזותיות במערכי שיעור במתמטיקה.
    
    !!! חוק שפה קריטי !!!
    השתמש אך ורק בעברית. אל תכתוב תרגומים לאנגלית של מושגים (למשל: אל תכתוב "אנרגיה (Energy)").
    בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;
    
    return await callGemini<LessonPlan>(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
            systemInstruction: getConditionalInstruction(subject as string) + "\nאתה מומחה לכתיבת מערכי שיעור. החזר JSON בלבד.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      const cleaned = cleanJSON(text);
      try {
        const plan = JSON.parse(cleaned);
        // Basic validation
        if (!plan.title || !plan.mainContent) {
          throw new Error("Invalid lesson plan structure: missing title or mainContent");
        }
        return plan;
      } catch (e) {
        console.error("JSON Parse Error in generateLessonPlan:", e, "Raw text:", text);
        throw new Error("Failed to parse lesson plan JSON");
      }
    });
};

export const generateLessonVisuals = async (plan: LessonPlan, type: 'INFOGRAPHIC' | 'PRESENTATION'): Promise<any> => {
    const ai = getAiInstance();
    // Summarize the plan to reduce token usage
    const summaryPlan = { title: plan.title, subject: plan.subject, objectives: plan.objectives, mainContent: plan.mainContent.substring(0, 1000) };
    const prompt = `על בסיס מערך השיעור הבא: ${JSON.stringify(summaryPlan)}, צור ${type === 'INFOGRAPHIC' ? 'נתונים לאינפוגרפיקה' : 'מבנה למצגת שיעור'}.
    
    החזר JSON בלבד.
    אם אינפוגרפיקה, החזר מבנה: { "mainTitle": "string", "summaryLine": "string", "keyPoints": [{"title": "string", "description": "string", "iconType": "string"}], "statistics": [{"value": "string", "label": "string"}], "takeaway": "string" }
    אם מצגת, צור בין 8 ל-10 שקופיות והחזר מבנה: { "title": "string", "slides": [{"title": "string", "content": ["string"], "layout": "TITLE|BULLETS|SPLIT|QUOTE|IMAGE_TEXT|THREE_COLUMNS|TIMELINE|SUMMARY"}] }
    הנחיות קריטיות:
    1. אל תשאיר שקופיות ריקות בשום פנים ואופן. לכל שקף חייב להיות תוכן (content) מלא ומפורט.
    2. אם אין לך מספיק תוכן למלא פריסה מורכבת (כמו THREE_COLUMNS או TIMELINE), אל תשתמש בה! השתמש ב-BULLETS או TITLE במקום.
    3. עבור SPLIT - חובה 2 פריטים ב-content.
    4. עבור THREE_COLUMNS - חובה 3 פריטים ב-content.
    5. עבור IMAGE_TEXT - חובה פריט אחד ב-content (תיאור התמונה המומלצת).
    6. עבור BULLETS ו-TIMELINE - לפחות 3 פריטים ב-content.
    7. עבור QUOTE ו-SUMMARY - פריט אחד משמעותי ב-content.
    8. השתמש ב-LaTeX עבור נוסחאות ($x^2$).
    
    בצע את המשימה במהירות המקסימלית.`;
    
    return await callGemini<any>(async () => {
      console.log("Calling Gemini for visual generation:", type);
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const text = response.text;
      if (!text) throw new Error("Empty response from AI for visuals");
      
      const cleaned = cleanJSON(text);
      try {
        const result = JSON.parse(cleaned);
        // Basic validation based on type
        if (type === 'INFOGRAPHIC' && (!result.mainTitle || !result.keyPoints)) {
          throw new Error("Invalid infographic structure");
        }
        if (type === 'PRESENTATION' && (!result.title || !result.slides)) {
          throw new Error("Invalid presentation structure");
        }
        return result;
      } catch (e) {
        console.error("JSON Parse Error in generateLessonVisuals:", e, "Raw text:", text);
        throw new Error("Failed to parse visual data JSON");
      }
    });
};

export const getCourseTopics = async (subject: Subject, grade: Grade): Promise<StudyTopic[]> => {
    // Try to get from static resources first
    const staticTopics = STATIC_RESOURCES[subject]?.filter(r => r.grades.includes(grade)) || [];
    if (staticTopics.length > 0) {
        return staticTopics.map(t => ({
            title: t.title,
            description: t.description,
            type: 'TEST_PREP'
        }));
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `הצע 6 קורסים מקיפים (סדרות לימוד של 5 ימים) למקצוע ${subject} לכיתה ${grade}.
    החזר JSON: [{"title": "", "description": "", "type": "TEST_PREP"}]
    בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;
    
    try {
      const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }));
      return JSON.parse(cleanJSON(response.text || "[]"));
    } catch (e) {
      return [];
    }
};

export const generateLessonContent = async (subject: Subject, grade: Grade, courseTitle: string, day: number): Promise<DailyLesson> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `כתוב את התוכן ליום ${day} מתוך קורס "${courseTitle}" ב${subject} ל${grade}.
    כלול הסבר מפורט, מעמיק וארוך (HTML), עובדה מעניינת, ושאלת בדיקה מהירה.
    השתמש בטבלאות (<table>) לנתונים ובשרטוטים (geometry-node/analytic-geometry-node) להמחשות במתמטיקה.
    החזר JSON: { "title": "", "content": "", "videoSearchTerm": "", "funFact": "", "quiz": { "question": "", "options": ["", "", "", ""], "correctIndex": 0 } }
    בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;
    
    try {
      const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { 
            systemInstruction: getConditionalInstruction(subject),
            responseMimeType: "application/json" 
        }
      }));
      return JSON.parse(cleanJSON(response.text || "{}"));
    } catch (e) {
      throw e;
    }
};

export const analyzeAndRefreshLearningProfile = async (history: HistoryItem[], currentProfile?: UserLearningProfile): Promise<UserLearningProfile> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `נתח את היסטוריית הלמידה של התלמיד וצור/עדכן פרופיל למידה אישי.
  היסטוריה: ${JSON.stringify(history.slice(-20))}
  פרופיל נוכחי: ${JSON.stringify(currentProfile)}
  
  החזר JSON במבנה: {
    "strengths": ["נושא1", "נושא2"],
    "weaknesses": ["נושא3", "נושא4"],
    "preferredDifficulty": "MEDIUM" | "HARD" | "EASY",
    "overallProgress": number (0-100)
  }`;

  try {
    const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
      model: LITE_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    const result = JSON.parse(cleanJSON(response.text || "{}"));
    return {
      ...result,
      lastAnalyzedTimestamp: Date.now()
    };
  } catch (e) {
    return currentProfile || {
      strengths: [],
      weaknesses: [],
      preferredDifficulty: 'MEDIUM',
      lastAnalyzedTimestamp: Date.now(),
      overallProgress: 0
    };
  }
};

export const generateArtifactConfig = async (
  prompt: string,
  subject: string,
  grade: string
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const fullPrompt = `צור רכיב אינטראקטיבי לימודי עבור המקצוע ${subject} לכיתה ${grade}.
  הנחיית המורה לעיצוב הרכיב: ${prompt}.
  
  עליך להחזיר JSON בלבד של אובייקט config שמתאים לאחד מהדפוסים הבאים:
  1. pattern: "simulation"
     fields: title, description, formulaType ("sum"|"product"), formula (string), variables (array of {id, label, min, max, default, unit, step}).
  2. pattern: "timeline"
     fields: title, events (array of {date, title, description}).
  3. pattern: "facts"
     fields: title, items (array of {preview, content}).
  4. pattern: "matching"
     fields: title, pairs (array of {a: string, b: string}). (משחק התאמה של מושגים להגדרות)
  5. pattern: "flashcards"
     fields: title, cards (array of {front: string, back: string}). (כרטיסיות מתהפכות לשינון)
  6. pattern: "sorting"
     fields: title, categories (array of {name: string, items: string[]}). (מיון פריטים לקטגוריות מתאימות)

  החזר את ה-JSON בלבד ללא טקסט נוסף.
  בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;

  try {
    const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json"
      }
    }));
    return JSON.parse(cleanJSON(response.text || "{}"));
  } catch (e) {
    console.error("Failed to parse artifact config", e);
    return null;
  }
};

export const generateGameContent = async (
  subject: Subject | string,
  grade: Grade,
  gameType: GameType,
  topic: string,
  customPrompt?: string
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  let structure = "";
  switch (gameType) {
    case 'MEMORY': 
      structure = `מערך של 8 אובייקטים (ליצירת 16 כרטיסים): { "id": number, "text": "מושג/שאלה", "match": "הגדרה/תשובה" }`; 
      break;
    case 'MATCHING': 
      structure = `מערך של 8 אובייקטים: { "id": number, "text": "מושג", "match": "הגדרה/תשובה" }`; 
      break;
    case 'TRIVIA': 
      structure = `מערך של 10 אובייקטים: { "question": "שאלה", "options": ["אופציה1", "אופציה2", "אופציה3", "אופציה4"], "correct": number (0-3) }`; 
      break;
    case 'WHEEL': 
      structure = `מערך של 8 מחרוזות (מושגים/שאלות/משימות)`; 
      break;
    case 'WORD_SEARCH':
      structure = `מערך של 10 מילים (מחרוזות) קצרות וברורות שיופיעו בתפזורת`;
      break;
    case 'HANGMAN':
      structure = `מערך של 5 מילים ורמזים: { "word": "מילה", "hint": "רמז" }`;
      break;
    case 'CROSSWORD':
      structure = `מערך של 8 הגדרות ומילים: { "clue": "הגדרה", "answer": "מילה" }`;
      break;
    default:
      structure = `מערך של נתונים המתאים למשחק`;
  }

  const prompt = `צור תוכן למשחק למידה מסוג ${gameType} בנושא "${topic}" עבור תלמידים בכיתה ${grade}.
  המקצוע הוא ${subject}.
  
  **חשוב מאוד:** רמת הקושי של השאלות, המילים והמושגים חייבת להיות מותאמת במדויק לתלמידים בכיתה ${grade}. אל תעשה את זה קל מדי או קשה מדי עבור גיל זה.
  
  מבנה הנתונים הנדרש: ${structure}.
  ${customPrompt ? `הנחיות נוספות: ${customPrompt}` : ''}
  החזר JSON בלבד.
  בצע את המשימה במהירות המקסימלית (עד 15 שניות).`;

  try {
    const response = await callGemini<GenerateContentResponse>(() => ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        systemInstruction: getConditionalInstruction(subject as string) + "\nאתה מומחה ליצירת משחקי למידה. החזר JSON בלבד."
      }
    }));
    return JSON.parse(cleanJSON(response.text || "[]"));
  } catch (e) {
    console.error("Failed to generate game content", e);
    return [];
  }
};

export const generateExamFeedback = async (score: number, subject: string, grade: string, detailedResults?: any[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const resultsContext = detailedResults ? `\nפירוט תוצאות מלא: ${JSON.stringify(detailedResults.map(r => ({ 
    questionId: r.questionId, 
    isCorrect: r.isCorrect, 
    explanation: r.explanation,
    studentAnswer: r.studentAnswer,
    correctAnswer: r.correctAnswer
  })))}` : '';
  
  const prompt = `נתח את ביצועי התלמיד במבחן/מטלה וכתוב משוב אישי, מעמיק ומפורט מאוד (5-7 משפטים) בעברית.
  התלמיד בכיתה ${grade}, המקצוע הוא ${subject}, והציון הסופי הוא ${score}.
  
  ${resultsContext}
  
  המשוב צריך:
  1. להתייחס לציון הכללי בצורה מעודדת.
  2. לציין נקודות חוזק ספציפיות שעלו מהתשובות הנכונות.
  3. לציין נושאים ספציפיים לשיפור על בסיס הטעויות.
  4. לתת טיפ פרקטי ללמידה להמשך.
  
  החזר את טקסט המשוב בלבד.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });
    return response.text || "כל הכבוד על המאמץ!";
  } catch (e) {
    return "כל הכבוד על סיום המבחן!";
  }
};
