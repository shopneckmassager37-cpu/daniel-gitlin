
import React, { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import katex from 'katex';
import { 
  ChevronRight, ChevronLeft, Calendar, Info, Play, RefreshCcw, Sparkles, 
  Lightbulb, ArrowRight, ArrowLeft, History, Clock, Target, Rocket, Activity,
  Hash, Rotate3d, CheckCircle2, XCircle, Award, ListChecks, Layers
} from 'lucide-react';

interface LatexRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
}

// --- Interactive Artifact Patterns ---

const InteractiveArtifact = ({ config }: { config: any }) => {
  const pattern = config.pattern || 'facts';
  
  if (pattern === 'simulation') return <SimulationPattern config={config} />;
  if (pattern === 'timeline') return <TimelinePattern config={config} />;
  if (pattern === 'facts') return <FactsPattern config={config} />;
  if (pattern === 'matching') return <MatchingPattern config={config} />;
  if (pattern === 'flashcards') return <FlashcardsPattern config={config} />;
  if (pattern === 'sorting') return <SortingPattern config={config} />;
  
  return (
    <div className="p-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] text-center text-gray-400">
      <Activity size={48} className="mx-auto mb-4 opacity-20" />
      <p className="font-bold">רכיב אינטראקטיבי: {config.title || 'ללא כותרת'}</p>
      <p className="text-xs">סוג רכיב לא מוכר: {pattern}</p>
    </div>
  );
};

const MatchingPattern = ({ config }: { config: any }) => {
  const [pairs, setPairs] = useState<any[]>([]);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [shuffledB, setShuffledB] = useState<any[]>([]);

  useEffect(() => {
    if (config.pairs) {
        const p = config.pairs.map((pair: any, i: number) => ({ ...pair, id: `p-${i}` }));
        setPairs(p);
        setShuffledB([...p].sort(() => Math.random() - 0.5));
    }
  }, [config.pairs]);

  const handleMatch = (idB: string) => {
    if (!selectedA) return;
    if (selectedA === idB) {
        setMatched([...matched, selectedA]);
        setSelectedA(null);
    } else {
        setSelectedA(null);
    }
  };

  if (matched.length === pairs.length && pairs.length > 0) {
      return (
          <div className="bg-green-50 p-12 rounded-[3rem] border-2 border-dashed border-green-200 text-center animate-fade-in my-8">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 shadow-sm"><CheckCircle2 size={32} /></div>
              <h3 className="text-2xl font-black text-green-800 mb-2">כל הכבוד!</h3>
              <p className="text-green-600 font-bold">התאמת את כל המושגים בהצלחה.</p>
              <button onClick={() => { setMatched([]); setShuffledB([...pairs].sort(() => Math.random() - 0.5)); }} className="mt-6 text-green-700 underline font-black text-sm">שחק שוב</button>
          </div>
      );
  }

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl my-8 overflow-hidden" dir="rtl">
        <h4 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3"><ListChecks className="text-primary"/> {config.title || 'משחק התאמה'}</h4>
        <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
                {pairs.map(p => (
                    <button 
                        key={p.id}
                        disabled={matched.includes(p.id)}
                        onClick={() => setSelectedA(p.id)}
                        className={`w-full p-4 rounded-2xl border-2 text-right font-bold transition-all ${matched.includes(p.id) ? 'bg-gray-100 border-transparent opacity-30 cursor-default' : selectedA === p.id ? 'border-primary bg-blue-50 text-primary shadow-md' : 'border-gray-50 hover:border-blue-200'}`}
                    >
                        {p.a}
                    </button>
                ))}
            </div>
            <div className="space-y-3">
                {shuffledB.map(p => (
                    <button 
                        key={p.id}
                        disabled={matched.includes(p.id)}
                        onClick={() => handleMatch(p.id)}
                        className={`w-full p-4 rounded-2xl border-2 text-right font-bold transition-all ${matched.includes(p.id) ? 'bg-gray-100 border-transparent opacity-30 cursor-default' : 'border-gray-50 hover:border-primary'}`}
                    >
                        {p.b}
                    </button>
                ))}
            </div>
        </div>
        <p className="mt-8 text-center text-xs font-bold text-gray-400">בחר מושג מימין והתאם לו את ההגדרה משמאל</p>
    </div>
  );
};

const FlashcardsPattern = ({ config }: { config: any }) => {
    const [idx, setIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const cards = config.cards || [];

    if (cards.length === 0) return null;

    const card = cards[idx];

    return (
        <div className="my-8 max-w-lg mx-auto space-y-6">
            <div className="flex items-center justify-between px-4">
                <h4 className="font-black text-gray-900">{config.title || 'כרטיסיות לימוד'}</h4>
                <span className="text-xs font-black text-gray-400">{idx + 1} / {cards.length}</span>
            </div>
            
            <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className="h-64 w-full perspective-1000 cursor-pointer"
            >
                <div className={`relative h-full w-full transition-all duration-700 preserve-3d shadow-2xl rounded-[2.5rem] ${isFlipped ? 'rotate-y-180' : ''}`}>
                    <div className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] border-2 border-indigo-50 flex flex-col items-center justify-center p-8 text-center">
                        <div className="bg-indigo-50 p-4 rounded-2xl mb-4 text-indigo-500"><Layers size={24} /></div>
                        <div className="text-2xl font-black text-gray-800 leading-tight">{card.front}</div>
                        <div className="mt-6 text-gray-400 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"><Rotate3d size={12} /> לחץ להפיכה</div>
                    </div>
                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center text-white">
                        <div className="text-xl font-bold leading-relaxed">{card.back}</div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-4">
                <button 
                    disabled={idx === 0} 
                    onClick={() => { setIdx(idx-1); setIsFlipped(false); }}
                    className="p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-20"
                >
                    <ArrowRight size={20} />
                </button>
                <button 
                    disabled={idx === cards.length - 1} 
                    onClick={() => { setIdx(idx+1); setIsFlipped(false); }}
                    className="p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-20"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>
        </div>
    );
};

const SortingPattern = ({ config }: { config: any }) => {
    const categories = config.categories || [];
    const [items, setItems] = useState<any[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        const all: any[] = [];
        categories.forEach((cat: any) => {
            cat.items.forEach((it: string) => {
                all.push({ text: it, category: cat.name });
            });
        });
        setItems(all.sort(() => Math.random() - 0.5));
    }, [config.categories]);

    const handleSort = (catName: string) => {
        const item = items[currentIdx];
        if (item.category === catName) {
            setScores(prev => ({ ...prev, [catName]: (prev[catName] || 0) + 1 }));
        }
        if (currentIdx < items.length - 1) {
            setCurrentIdx(currentIdx + 1);
        } else {
            setFinished(true);
        }
    };

    if (finished) {
        const total = items.length;
        const correct = (Object.values(scores) as number[]).reduce((a, b) => a + b, 0);
        return (
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl text-center my-8 animate-fade-in">
                <Award size={48} className="text-yellow-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black mb-2">המשחק הסתיים!</h3>
                <p className="text-gray-500 font-bold mb-6">מיינת נכון {correct} מתוך {total} פריטים.</p>
                <button onClick={() => { setCurrentIdx(0); setScores({}); setFinished(false); }} className="bg-primary text-white px-8 py-3 rounded-2xl font-black">שחק שוב</button>
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="bg-gray-50 p-8 rounded-[3rem] border border-gray-200 my-8 shadow-inner text-right" dir="rtl">
            <h4 className="text-xl font-black text-gray-900 mb-8">{config.title || 'משחק מיון'}</h4>
            
            <div className="bg-white p-10 rounded-[2.5rem] shadow-lg border border-gray-100 text-center mb-10 transform scale-110">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2">לאן זה שייך?</span>
                <div className="text-3xl font-black text-gray-800">{items[currentIdx]?.text}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((cat: any) => (
                    <button 
                        key={cat.name}
                        onClick={() => handleSort(cat.name)}
                        className="p-6 bg-white border-2 border-gray-100 rounded-3xl font-black text-gray-700 hover:border-primary hover:text-primary hover:shadow-md transition-all"
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

const SimulationPattern = ({ config }: { config: any }) => {
  const [vals, setVals] = useState<Record<string, number>>(
    (config.variables || []).reduce((acc: any, v: any) => ({ ...acc, [v.id]: v.default ?? 0 }), {})
  );

  const calculateResult = () => {
    const values = Object.values(vals) as number[];
    if (config.formulaType === 'product') return values.reduce((a, b) => a * b, 1).toFixed(2);
    return values.reduce((a, b) => a + b, 0).toFixed(2);
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl my-8 overflow-hidden relative" dir="rtl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[5rem] -z-0"></div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg"><Rocket size={24}/></div>
          <div>
            <h4 className="text-2xl font-black text-gray-900">{config.title}</h4>
            <p className="text-sm text-gray-500 font-bold">{config.description || 'סימולציה אינטראקטיבית'}</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            {config.variables?.map((v: any) => (
              <div key={v.id} className="space-y-3">
                <div className="flex justify-between items-center text-sm font-black text-gray-700">
                  <span>{v.label}</span>
                  <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg border border-indigo-100">{vals[v.id]} {v.unit || ''}</span>
                </div>
                <input 
                  type="range" min={v.min} max={v.max} step={v.step || 1} value={vals[v.id]} 
                  onChange={(e) => setVals({ ...vals, [v.id]: parseFloat(e.target.value) })}
                  className="w-full h-2.5 bg-gray-100 rounded-full appearance-none accent-indigo-600 cursor-pointer border border-gray-50"
                />
              </div>
            ))}
          </div>
          
          <div className="bg-gray-50 p-10 rounded-[3rem] border-2 border-dashed border-indigo-100 flex flex-col items-center justify-center text-center">
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-4">תוצאה בסימולציה</span>
             <div className="text-6xl font-black text-indigo-600 mb-4 tabular-nums">
               {calculateResult()}
             </div>
             <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-50 font-bold text-gray-500 text-sm">
                {config.formula || 'נוסחה מתמטית'}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TimelinePattern = ({ config }: { config: any }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const events = config.events || [];

  if (events.length === 0) return null;

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl my-8 overflow-hidden" dir="rtl">
      <div className="flex items-center justify-between mb-10">
        <h4 className="text-2xl font-black text-gray-900 flex items-center gap-3"><Clock className="text-primary" /> {config.title}</h4>
        <div className="bg-gray-50 px-4 py-1.5 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest">
            ציר זמן אינטראקטיבי
        </div>
      </div>
      
      <div className="relative mb-14 px-4">
         <div className="absolute top-1/2 left-4 right-4 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full"></div>
         <div className="flex justify-between items-center relative z-10">
            {events.map((ev: any, i: number) => (
              <button 
                key={i} onClick={() => setActiveIdx(i)}
                className={`w-8 h-8 rounded-full border-4 transition-all duration-300 flex items-center justify-center ${i === activeIdx ? 'bg-primary border-blue-100 scale-150 shadow-xl' : 'bg-white border-gray-200 hover:border-primary hover:scale-110'}`}
                title={ev.date}
              >
                {i === activeIdx && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </button>
            ))}
         </div>
      </div>

      <div className="bg-blue-50/50 p-8 rounded-[2.5rem] animate-fade-in border border-blue-100 min-h-[180px] relative">
         <div className="flex justify-between items-start mb-6">
            <span className="bg-primary text-white px-5 py-2 rounded-2xl text-xs font-black shadow-lg shadow-blue-200 uppercase tracking-wider">{events[activeIdx]?.date}</span>
            <div className="flex gap-2">
               <button disabled={activeIdx === 0} onClick={() => setActiveIdx(prev => prev - 1)} className="p-3 bg-white hover:bg-gray-100 rounded-full shadow-sm transition-all disabled:opacity-20"><ArrowRight size={20} className="text-primary"/></button>
               <button disabled={activeIdx === events.length - 1} onClick={() => setActiveIdx(prev => prev + 1)} className="p-3 bg-white hover:bg-gray-100 rounded-full shadow-sm transition-all disabled:opacity-20"><ArrowLeft size={20} className="text-primary"/></button>
            </div>
         </div>
         <h5 className="text-2xl font-black text-gray-900 mb-3">{events[activeIdx]?.title}</h5>
         <p className="text-gray-600 leading-relaxed font-medium text-lg">{events[activeIdx]?.description}</p>
      </div>
    </div>
  );
};

const FactsPattern = ({ config }: { config: any }) => {
  const [revealed, setRevealed] = useState<number[]>([]);
  const toggle = (i: number) => {
    if (revealed.includes(i)) setRevealed(revealed.filter(id => id !== i));
    else setRevealed([...revealed, i]);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-[3rem] border border-indigo-100 my-8 shadow-sm" dir="rtl">
       <div className="flex items-center justify-between mb-8">
            <h4 className="text-2xl font-black text-indigo-900 flex items-center gap-3"><Sparkles className="text-yellow-500" /> {config.title || 'גלו את העובדות'}</h4>
            <button 
                onClick={() => setRevealed(revealed.length === config.items?.length ? [] : config.items?.map((_: any, i: number) => i))}
                className="text-[10px] font-black text-indigo-400 hover:text-indigo-600 uppercase transition-colors"
            >
                {revealed.length === config.items?.length ? 'הסתר הכל' : 'חשוף הכל'}
            </button>
       </div>
       <div className="grid gap-4">
          {config.items?.map((item: any, i: number) => (
             <div key={i} onClick={() => toggle(i)} className={`bg-white p-6 rounded-[2rem] border-2 transition-all cursor-pointer shadow-sm group ${revealed.includes(i) ? 'border-indigo-500' : 'border-transparent hover:border-indigo-200'}`}>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all ${revealed.includes(i) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-400'}`}>{i+1}</div>
                      <span className="font-black text-gray-800 text-lg">{item.preview}</span>
                   </div>
                   <div className={`transition-all duration-300 ${revealed.includes(i) ? 'rotate-90 text-indigo-600' : 'text-gray-300 group-hover:text-indigo-400'}`}>
                      <ChevronLeft size={24} />
                   </div>
                </div>
                {revealed.includes(i) && (
                   <div className="mt-5 pt-5 border-t border-indigo-50 animate-fade-in text-gray-600 font-medium leading-relaxed text-lg">
                      {item.content}
                   </div>
                )}
             </div>
          ))}
       </div>
    </div>
  );
};

const GeometryDisplay = ({ shapes, showLabels }: { shapes: any[], showLabels: boolean }) => {
  const SVG_WIDTH = 500;
  const SVG_HEIGHT = 400;
  const centerX = SVG_WIDTH / 2;
  const centerY = SVG_HEIGHT / 2;

  const getVertices = (shape: any) => {
    const { shapeType, width, height, xOffset = 0, yOffset = 0 } = shape;
    const cx = centerX + xOffset;
    const cy = centerY + yOffset;

    if (shapeType === 'circle') return [];
    if (shapeType === 'line') return [{ x: cx - width / 2, y: cy }, { x: cx + width / 2, y: cy }];

    const parts = (shapeType || '').split('_');
    const numSides = parseInt(parts[0]) || 3;
    const subType = parts[1];

    let vertices: { x: number, y: number }[] = [];

    if (numSides === 3) {
      const w = width;
      const h = height;
      if (subType === 'iso') vertices = [{ x: cx, y: cy - h / 2 }, { x: cx - w / 2, y: cy + h / 2 }, { x: cx + w / 2, y: cy + h / 2 }];
      else if (subType === 'right') vertices = [{ x: cx - w / 2, y: cy - h / 2 }, { x: cx - w / 2, y: cy + h / 2 }, { x: cx + w / 2, y: cy + h / 2 }];
      else if (subType === 'obtuse') vertices = [{ x: cx + w / 3, y: cy - h / 2 }, { x: cx - w / 2, y: cy + h / 2 }, { x: cx + w / 2, y: cy + h / 2 }];
      else vertices = [{ x: cx, y: centerY - h / 2 }, { x: cx - w / 2, y: centerY + h / 2 }, { x: cx + w / 2, y: centerY + h / 2 }];
    } else if (numSides === 4) {
      const w = width;
      const h = subType === 'rect' ? height : width;
      vertices = [
        { x: cx - w / 2, y: cy - h / 2 },
        { x: cx + w / 2, y: cy - h / 2 },
        { x: cx + w / 2, y: cy + h / 2 },
        { x: cx - w / 2, y: cy + h / 2 }
      ];
    } else {
      const radiusX = width / 2;
      const radiusY = height / 2;
      for (let i = 0; i < numSides; i++) {
        const angle = (i * 2 * Math.PI) / numSides - Math.PI / 2;
        vertices.push({
          x: cx + radiusX * Math.cos(angle),
          y: centerY + radiusY * Math.sin(angle)
        });
      }
    }
    return vertices;
  };

  const renderLabels = (shape: any, vertices: { x: number, y: number }[]) => {
    if (!showLabels || showLabels.toString() === 'false') return null;
    const cx = centerX + (shape.xOffset || 0);
    const cy = centerY + (shape.yOffset || 0);
    const elements: any[] = [];
    const textColor = "#000000";
    const shadowColor = "#FFFFFF";

    const textStyle = {
        fontWeight: "900" as const,
        fontSize: "13px",
        paintOrder: "stroke",
        stroke: shadowColor,
        strokeWidth: "3px",
        strokeLinejoin: "round" as const
    };

    if (shape.shapeType === 'circle') {
        if (shape.sideLabels?.[0]) {
            elements.push(<text key="r" x={cx} y={cy - shape.width / 2 - 12} textAnchor="middle" dominantBaseline="central" fill={textColor} style={textStyle}>{shape.sideLabels[0]}</text>);
        }
    } else {
        vertices.forEach((v, i) => {
            if (shape.shapeType === 'line' && i === 1) return;
            const nextV = vertices[(i + 1) % vertices.length];
            const midX = (v.x + nextV.x) / 2;
            const midY = (v.y + nextV.y) / 2;
            
            const dx = nextV.x - v.x;
            const dy = nextV.y - v.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length < 1) return;
            
            const nx = -dy / length;
            const ny = dx / length;
            
            const pushDir = (nx * (cx - midX) + ny * (cy - midY)) > 0 ? -1 : 1;
            const labelX = midX + nx * 22 * pushDir;
            const labelY = midY + ny * 22 * pushDir;

            if (shape.sideLabels?.[i]) {
                elements.push(<text key={`s-${i}`} x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central" fill={textColor} style={textStyle}>{shape.sideLabels[i]}</text>);
            }
        });
    }

    vertices.forEach((v, i) => {
        const dx = v.x - cx;
        const dy = v.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / dist;
        const uy = dy / dist;

        if (shape.vertexLabels?.[i]) {
            elements.push(<text key={`v-${i}`} x={v.x + ux * 22} y={v.y + uy * 22} textAnchor="middle" dominantBaseline="central" fill={textColor} style={{...textStyle, fontStyle: 'italic'}}>{shape.vertexLabels[i]}</text>);
        }
        if (shape.angleLabels?.[i] && shape.shapeType !== 'line' && shape.shapeType !== 'circle') {
            elements.push(<text key={`a-${i}`} x={v.x - ux * 32} y={v.y - uy * 32} textAnchor="middle" dominantBaseline="central" fill={textColor} style={{...textStyle, fontSize: '11px'}}>{shape.angleLabels[i]}</text>);
        }
    });

    return elements;
  };

  return (
    <div className="my-8 flex justify-center bg-white p-8 rounded-[3rem] border-2 border-gray-100 shadow-xl overflow-visible">
      <svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="overflow-visible bg-white">
        {shapes.map((s, i) => {
          const verts = getVertices(s);
          const color = "#3B82F6";
          const transform = `rotate(${s.rotation || 0}, ${centerX + (s.xOffset || 0)}, ${centerY + (s.yOffset || 0)})`;
          return (
            <g key={i} transform={transform}>
              {s.shapeType === 'circle' ? (
                <circle cx={centerX + (s.xOffset || 0)} cy={centerY + (s.yOffset || 0)} r={s.width / 2} stroke={color} strokeWidth="2.5" fill={`${color}15`} />
              ) : s.shapeType === 'line' ? (
                <line x1={verts[0].x} y1={verts[0].y} x2={verts[1].x} y2={verts[1].y} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
              ) : (
                <polygon points={verts.map(v => `${v.x},${v.y}`).join(' ')} stroke={color} strokeWidth="2.5" fill={`${color}15`} />
              )}
              {renderLabels(s, verts)}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const AnalyticDisplay = ({ objects, viewRange, showGrid, showNumbers }: { objects: any[], viewRange: any, showGrid: boolean, showNumbers: boolean }) => {
  const size = 350;
  const margin = 35;
  const plotSize = size - 2 * margin;
  
  const safeRange = viewRange || {minX: -10, maxX: 10, minY: -10, maxY: 10};
  const rangeX = safeRange.maxX - safeRange.minX;
  const rangeY = safeRange.maxY - safeRange.minY;
  
  const toX = (x: number) => margin + (x - safeRange.minX) * (plotSize / rangeX);
  const toY = (y: number) => size - (margin + (y - safeRange.minY) * (plotSize / rangeY));

  const getTickStep = (range: number) => {
    if (range > 500) return 100;
    if (range > 200) return 50;
    if (range > 100) return 20;
    if (range > 50) return 10;
    if (range > 20) return 5;
    if (range > 10) return 2;
    return 1;
  };

  const stepX = getTickStep(rangeX);
  const stepY = getTickStep(rangeY);

  // Requirement: If range is changed (large), hide numbers even if showNumbers is true?
  // "אם הם מוצגים והוא שינה את הטווח לא צריכים להיות מוצגים יותר מספרים על הצירים אלא שהרווחים הפרשים בינהם יגדלו"
  // Let's interpret this as: if range > 100, hide numbers.
  const shouldShowNumbers = showNumbers && showNumbers.toString() !== 'false' && rangeX <= 100 && rangeY <= 100;

  return (
    <div className="my-8 flex justify-center bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-xl overflow-x-auto">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible bg-slate-50/50 rounded-2xl">
        {showGrid && showGrid.toString() !== 'false' && (
          <g stroke="#e2e8f0" strokeWidth="1">
            {Array.from({ length: Math.floor(rangeY / stepY) + 1 }).map((_, i) => {
                const yVal = Math.ceil(safeRange.minY / stepY) * stepY + i * stepY;
                if (yVal > safeRange.maxY) return null;
                return <line key={`gy-${yVal}`} x1={margin} y1={toY(yVal)} x2={size - margin} y2={toY(yVal)} />;
            })}
            {Array.from({ length: Math.floor(rangeX / stepX) + 1 }).map((_, i) => {
                const xVal = Math.ceil(safeRange.minX / stepX) * stepX + i * stepX;
                if (xVal > safeRange.maxX) return null;
                return <line key={`gx-${xVal}`} x1={toX(xVal)} y1={margin} x2={toX(xVal)} y2={size - margin} />;
            })}
          </g>
        )}
        
        <g stroke="#475569" strokeWidth="2">
          <line x1={margin - 10} y1={toY(0)} x2={size - margin + 10} y2={toY(0)} />
          <line x1={toX(0)} y1={margin - 10} x2={toX(0)} y2={size - margin + 10} />
          <path d={`M ${size - margin + 15} ${toY(0)} L ${size - margin + 10} ${toY(0) - 4} L ${size - margin + 10} ${toY(0) + 4} Z`} fill="#475569" stroke="none" />
          <path d={`M ${toX(0)} ${margin - 15} L ${toX(0) - 4} ${margin - 10} L ${toX(0) + 4} ${margin - 10} Z`} fill="#475569" stroke="none" />
        </g>
        
        <text x={size - margin + 20} y={toY(0) + 4} fontSize="12" fill="#1e293b" fontWeight="black">x</text>
        <text x={toX(0) - 4} y={margin - 20} fontSize="12" fill="#1e293b" fontWeight="black" textAnchor="middle">y</text>

        <g fontSize="8" fill="#94a3b8" textAnchor="middle" fontWeight="bold">
            {Array.from({ length: Math.floor(rangeX / stepX) + 1 }).map((_, i) => {
                const xVal = Math.ceil(safeRange.minX / stepX) * stepX + i * stepX;
                if (xVal === 0 || xVal > safeRange.maxX) return null;
                return (
                  <g key={`xtick-${xVal}`}>
                    <line x1={toX(xVal)} y1={toY(0) - 3} x2={toX(xVal)} y2={toY(0) + 3} stroke="#94a3b8" strokeWidth="1" />
                    {shouldShowNumbers && <text x={toX(xVal)} y={toY(0) + 14}>{xVal}</text>}
                  </g>
                );
            })}
            {Array.from({ length: Math.floor(rangeY / stepY) + 1 }).map((_, i) => {
                const yVal = Math.ceil(safeRange.minY / stepY) * stepY + i * stepY;
                if (yVal === 0 || yVal > safeRange.maxY) return null;
                return (
                  <g key={`ytick-${yVal}`}>
                    <line x1={toX(0) - 3} y1={toY(yVal)} x2={toX(0) + 3} y2={toY(yVal)} stroke="#94a3b8" strokeWidth="1" />
                    {shouldShowNumbers && <text x={toX(0) - 8} y={toY(yVal) + 3} textAnchor="end">{yVal}</text>}
                  </g>
                );
            })}
        </g>

        {objects.map((obj, i) => {
          const color = "#3B82F6"; 
          const textColor = "#000000"; 
          const params = obj.params || {};
          const showEq = obj.showEquation !== false;

          if (obj.type === 'point') {
            const x = params.x ?? 0;
            const y = params.y ?? 0;
            // Dynamic offset based on position relative to origin to avoid axes
            const dx = x >= 0 ? 10 : -10;
            const dy = y >= 0 ? -10 : 10;
            const anchor = x >= 0 ? 'start' : 'end';
            
            return (
              <g key={i}>
                <circle cx={toX(x)} cy={toY(y)} r="5" fill={color} stroke="white" strokeWidth="2" />
                <text 
                  x={toX(x) + dx} 
                  y={toY(y) + dy} 
                  fontSize="11" 
                  fill={textColor} 
                  fontWeight="900" 
                  dominantBaseline="central"
                  textAnchor={anchor}
                  className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
                >
                    {obj.label && `${obj.label} `}{showEq && `(${x}, ${y})`}
                </text>
              </g>
            );
          }
          if (obj.type === 'line') {
            const m = params.m ?? 1;
            const b = params.b ?? 0;
            const x1 = safeRange.minX;
            const y1 = m * x1 + b;
            const x2 = safeRange.maxX;
            const y2 = m * x2 + b;
            return (
              <g key={i}>
                <line x1={toX(x1)} y1={toY(y1)} x2={toX(x2)} y2={toY(y2)} stroke={color} strokeWidth="3" strokeLinecap="round" />
                {showEq && (
                  <text 
                    x={toX(safeRange.maxX - 1)} 
                    y={toY(m * (safeRange.maxX - 1) + b) - 12} 
                    fontSize="10" 
                    fill={textColor} 
                    fontWeight="black" 
                    textAnchor="end"
                    className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
                  >
                    {obj.label && `${obj.label}: `}y = {Number(m).toFixed(1)}x{b >= 0 ? '+' : ''}{Number(b).toFixed(1)}
                  </text>
                )}
              </g>
            );
          }
          if (obj.type === 'parabola') {
            const a = params.a ?? 1;
            const b = params.b ?? 0;
            const c = params.c ?? 0;
            const points = [];
            const step = (safeRange.maxX - safeRange.minX) / 60;
            for (let x = safeRange.minX; x <= safeRange.maxX; x += step) {
              const y = a * x * x + b * x + c;
              if (y >= safeRange.minY - 10 && y <= safeRange.maxY + 10) {
                points.push(`${toX(x)},${toY(y)}`);
              }
            }
            const vertexX = -b / (2 * a);
            const vertexY = a * vertexX * vertexX + b * vertexX + c;
            return (
              <g key={i}>
                <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />
                <text 
                  x={toX(vertexX)} 
                  y={toY(vertexY) + (a > 0 ? 15 : -15)} 
                  fontSize="10" 
                  fill={textColor} 
                  fontWeight="black" 
                  textAnchor="middle"
                  className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
                >
                  {obj.label} {showEq && `y=${a}x²+${b}x+${c}`}
                </text>
              </g>
            );
          }
          if (obj.type === 'segment') {
            const x1 = params.x1 ?? 0;
            const y1 = params.y1 ?? 0;
            const x2 = params.x2 ?? 1;
            const y2 = params.y2 ?? 1;
            return (
              <g key={i}>
                <line x1={toX(x1)} y1={toY(y1)} x2={toX(x2)} y2={toY(y2)} stroke={color} strokeWidth="3" strokeLinecap="round" />
                {obj.label && (
                  <text x={toX((x1+x2)/2)} y={toY((y1+y2)/2) - 10} fontSize="10" fill={textColor} fontWeight="black" textAnchor="middle">{obj.label}</text>
                )}
              </g>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
};

const LatexRenderer: React.FC<LatexRendererProps> = ({ text, className = "", inline = false }) => {
  const processedText = useMemo(() => {
    if (!text) return '';
    const replacements: Record<string, string> = { '\\[': '$$', '\\]': '$$', '\\(': '$', '\\)': '$' };
    return text.replace(/\\\[|\\\]|\\\(|\\\)/g, (match) => replacements[match] || match);
  }, [text]);

  if (!processedText) return null;

  return (
    <div className={`markdown-content leading-relaxed text-right font-sans ${className}`} dir="rtl">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          h1: ({ children }) => <h1 className="text-3xl font-black mt-8 mb-6 text-gray-900 border-b-4 border-primary/20 pb-3 inline-block">{children}</h1>,
          h2: ({ children }) => <h2 className="text-2xl font-black mt-10 mb-5 text-gray-800 flex items-center gap-2 before:content-[''] before:w-1.5 before:h-8 before:bg-primary before:rounded-full">{children}</h2>,
          p: ({ children }) => inline ? <span className="inline-block">{children}</span> : <div className="mb-5 text-gray-700 leading-loose text-lg font-normal">{children}</div>,
          ul: ({ children }) => <ul className="space-y-3 my-6 pr-6 list-disc list-outside text-lg text-gray-700 font-normal">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-3 my-6 pr-6 list-decimal list-outside text-lg text-gray-700 font-normal">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed text-lg text-gray-700 font-normal">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-gray-900 px-0.5">{children}</strong>,
          table: ({ children }) => (
            <div className="my-8 overflow-x-auto rounded-2xl border-2 border-gray-100 shadow-sm bg-white">
              <table className="w-full border-collapse text-right text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50 border-b-2 border-gray-100">{children}</thead>,
          th: ({ children }) => <th className="p-4 font-black text-gray-900 border-x border-gray-50">{children}</th>,
          td: ({ children }) => <td className="p-4 border border-gray-50 text-gray-700 font-medium">{children}</td>,
          tr: ({ children }) => <tr className="hover:bg-gray-50/50 transition-colors">{children}</tr>,
          span: ({ node, children, ...props }: any) => {
            if (props['data-type'] === 'math-node') {
              const latex = props['data-latex'] || '';
              try {
                const html = katex.renderToString(latex, { throwOnError: false, displayMode: false });
                return <span dangerouslySetInnerHTML={{ __html: html }} className="math-inline-plain mx-1" />;
              } catch (e) {
                return <span className="text-red-500">Error in math</span>;
              }
            }
            return <span {...props}>{children}</span>;
          },
          div: ({ node, children, ...props }: any) => {
            const dataType = props['data-type'];
            if (dataType === 'dynamic-artifact') {
              try {
                let configStr = props['data-config'] || props['dataconfig'] || '{}';
                configStr = configStr.replace(/&quot;/g, '"');
                const config = JSON.parse(configStr);
                return <InteractiveArtifact config={config} />;
              } catch(e) { 
                return <div className="p-4 bg-red-50 text-red-500 rounded-xl">Error loading interactive component</div>; 
              }
            }
            if (dataType === 'geometry-node') {
              try {
                let shapesStr = props['data-shapes'] || props['datashapes'] || '[]';
                shapesStr = shapesStr.replace(/&quot;/g, '"');
                const shapes = JSON.parse(shapesStr);
                const showLabels = (props['data-show-labels'] || props['datashowlabels']) !== 'false';
                return <GeometryDisplay shapes={shapes} showLabels={showLabels} />;
              } catch(e) { 
                return <div className="p-4 bg-red-50 text-red-500 rounded-xl">Error loading geometry drawing</div>; 
              }
            }
            if (dataType === 'analytic-geometry-node') {
              try {
                let objectsStr = props['data-objects'] || props['dataobjects'] || '[]';
                objectsStr = objectsStr.replace(/&quot;/g, '"');
                const objects = JSON.parse(objectsStr);
                let rangeStr = props['data-view-range'] || props['dataviewrange'] || '{"minX":-10,"maxX":10,"minY":-10,"maxY":10}';
                rangeStr = rangeStr.replace(/&quot;/g, '"');
                const range = JSON.parse(rangeStr);
                const showGrid = (props['data-show-grid'] || props['datashowgrid']) === 'true';
                const showNumbers = (props['data-show-numbers'] || props['datashownumbers']) === 'true';
                return <AnalyticDisplay objects={objects} viewRange={range} showGrid={showGrid} showNumbers={showNumbers} />;
              } catch(e) { return <div className="p-4 bg-red-50 text-red-500 rounded-xl">Error loading graph</div>; }
            }
            if (props.className?.includes('math-display')) {
              return <div className="my-8 overflow-x-auto bg-white p-6 md:p-10 rounded-[2.5rem] border-2 border-gray-100 shadow-xl flex justify-center" dir="ltr">{children}</div>;
            }
            return <div {...props}>{children}</div>;
          }
        }}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
};

export default LatexRenderer;
