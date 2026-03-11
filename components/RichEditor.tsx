
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, List, ListOrdered, 
  X, ChevronDown, Calculator, Plus, RotateCw,
  Palette, Image as ImageIcon, Loader2, Trash2, Shapes, Circle as CircleIcon, Triangle, Settings, Check, Hexagon, Ruler, 
  Grid3X3, Trash, Maximize2, Pencil, Settings2, Edit2, Dot, Activity, Square, Code, MessageCircle, Sparkles, Paperclip
} from 'lucide-react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, Extension, Node, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import LatexRenderer from './LatexRenderer.tsx';
import { Subject, Grade } from '../types.ts';
import { generateArtifactConfig } from '../services/geminiService.ts';
const InputField = ({ label, placeholder, id, defaultValue, type = "number" }: { label: string, placeholder: string, id: string, defaultValue: string, type?: string }) => (
  <div className="space-y-1">
    <label htmlFor={`analytic-input-${id}`} className="text-[10px] font-black text-gray-400 uppercase mr-1">{label}</label>
    <input 
      id={`analytic-input-${id}`}
      defaultValue={defaultValue}
      type={type}
      placeholder={placeholder}
      className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:border-primary outline-none text-center font-bold text-sm shadow-sm"
    />
  </div>
);

// --- Geometry Extension ---

interface ShapeData {
  id: string;
  shapeType: string;
  width: number;
  height: number;
  color: string;
  rotation: number;
  xOffset: number;
  yOffset: number;
  sideLabels: string[];
  vertexLabels: string[];
  angleLabels: string[];
}

const GeometryNode = Node.create({
  name: 'geometryNode',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      shapes: { 
        default: [],
        parseHTML: element => {
          const shapes = element.getAttribute('data-shapes') || element.getAttribute('datashapes');
          try {
             return shapes ? JSON.parse(shapes.replace(/&quot;/g, '"')) : [];
          } catch(e) { return []; }
        },
        renderHTML: attributes => ({
          'data-shapes': JSON.stringify(attributes.shapes),
          'data-type': 'geometry-node'
        }),
      },
      showLabels: { 
        default: true,
        parseHTML: element => {
          const val = element.getAttribute('data-show-labels') || element.getAttribute('datashowlabels');
          return val !== 'false';
        },
        renderHTML: attributes => ({
          'data-show-labels': attributes.showLabels ? 'true' : 'false',
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="geometry-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'geometry-node' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GeometryNodeView);
  },
});

const GeometryNodeView = (props: any) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const { shapes, showLabels } = node.attrs;
  const [isEditing, setIsEditing] = useState(false);
  const [activeShapeIdx, setActiveShapeIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{x: number, y: number} | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const SVG_WIDTH = 500;
  const SVG_HEIGHT = 400;
  const SVG_CENTER_X = SVG_WIDTH / 2;
  const SVG_CENTER_Y = SVG_HEIGHT / 2;

  const forcedColor = "#3B82F6";
  const forcedText = "#000000";

  const safeShapes = useMemo(() => {
    const list = Array.isArray(shapes) ? shapes : [];
    if (list.length === 0) {
        return [{
            id: 'shape-default',
            shapeType: '3_iso',
            width: 120,
            height: 120,
            color: forcedColor,
            rotation: 0,
            xOffset: 0,
            yOffset: 0,
            sideLabels: [],
            vertexLabels: ["A","B","C"],
            angleLabels: [],
        }];
    }
    return list;
  }, [shapes]);

  const activeShape = safeShapes[activeShapeIdx] || safeShapes[0];

  const handleMouseDown = (e: React.MouseEvent, action: 'drag' | 'rotate' | 'draw', shapeIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (action === 'draw') {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        setIsDrawing(true);
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDrawStart({ x, y });
        setDrawCurrent({ x, y });
        return;
    }

    setActiveShapeIdx(shapeIdx);
    if (action === 'drag') setIsDragging(true);
    if (action === 'rotate') setIsRotating(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isRotating && !isDrawing) return;
      if (!svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDrawing) {
        setDrawCurrent({ x: mouseX, y: mouseY });
        return;
      }

      const centerX = SVG_CENTER_X + (activeShape.xOffset || 0);
      const centerY = SVG_CENTER_Y + (activeShape.yOffset || 0);

      const newShapes = [...safeShapes];
      
      if (isDragging) {
        newShapes[activeShapeIdx] = {
          ...activeShape,
          xOffset: mouseX - SVG_CENTER_X,
          yOffset: mouseY - SVG_CENTER_Y,
          color: forcedColor
        };
        updateAttributes({ shapes: newShapes });
      }

      if (isRotating) {
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        newShapes[activeShapeIdx] = {
          ...activeShape,
          rotation: angle,
          color: forcedColor
        };
        updateAttributes({ shapes: newShapes });
      }
    };

    const handleMouseUp = () => {
      if (isDrawing && drawStart && drawCurrent) {
        const dx = drawCurrent.x - drawStart.x;
        const dy = drawCurrent.y - drawStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 5) {
          const centerX = (drawStart.x + drawCurrent.x) / 2;
          const centerY = (drawStart.y + drawCurrent.y) / 2;
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          
          const newLine: ShapeData = {
            id: `shape-${Date.now()}`,
            shapeType: 'line',
            width: length,
            height: 0,
            color: forcedColor,
            rotation: angle,
            xOffset: centerX - SVG_CENTER_X,
            yOffset: centerY - SVG_CENTER_Y,
            sideLabels: [],
            vertexLabels: [],
            angleLabels: [],
          };
          updateAttributes({ shapes: [...safeShapes, newLine] });
          setActiveShapeIdx(safeShapes.length);
        }
      }
      setIsDragging(false);
      setIsRotating(false);
      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
    };

    if (isDragging || isRotating || isDrawing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isRotating, isDrawing, drawStart, drawCurrent, activeShape, activeShapeIdx, safeShapes, updateAttributes]);

  const getPolygonVertices = (shape: ShapeData) => {
    const centerX = SVG_CENTER_X + (shape.xOffset || 0);
    const centerY = SVG_CENTER_Y + (shape.yOffset || 0);
    const { shapeType, width, height } = shape;

    if (shapeType === 'circle') return [];
    if (shapeType === 'line') {
      return [
        { x: centerX - width / 2, y: centerY },
        { x: centerX + width / 2, y: centerY }
      ];
    }

    const parts = (shapeType || '').split('_');
    const numSides = parseInt(parts[0]) || 3;
    const subType = parts[1];

    let vertices: { x: number, y: number }[] = [];

    if (numSides === 3) {
      const w = width;
      const h = height;
      if (subType === 'iso') vertices = [{ x: centerX, y: centerY - h / 2 }, { x: centerX - w / 2, y: centerY + h / 2 }, { x: centerX + w / 2, y: centerY + h / 2 }];
      else if (subType === 'right') vertices = [{ x: centerX - w / 2, y: centerY - h / 2 }, { x: centerX - w / 2, y: centerY + h / 2 }, { x: centerX + w / 2, y: centerY + h / 2 }];
      else if (subType === 'obtuse') vertices = [{ x: centerX + w / 3, y: centerY - h / 2 }, { x: centerX - w / 2, y: centerY + h / 2 }, { x: centerX + w / 2, y: centerY + h / 2 }];
      else vertices = [{ x: centerX, y: centerY - h / 2 }, { x: centerX - w / 2, y: centerY + h / 2 }, { x: centerX + w / 2, y: centerY + h / 2 }];
    } else if (numSides === 4) {
      const w = width;
      const h = subType === 'rect' ? height : width;
      vertices = [
        { x: centerX - w / 2, y: centerY - h / 2 },
        { x: centerX + w / 2, y: centerY - h / 2 },
        { x: centerX + w / 2, y: centerY + h / 2 },
        { x: centerX - w / 2, y: centerY + h / 2 }
      ];
    } else {
      const radiusX = width / 2;
      const radiusY = height / 2;
      for (let i = 0; i < numSides; i++) {
        const angle = (i * 2 * Math.PI) / numSides - Math.PI / 2;
        vertices.push({
          x: centerX + radiusX * Math.cos(angle),
          y: centerY + radiusY * Math.sin(angle)
        });
      }
    }
    return vertices;
  };

  const renderLabels = (shape: ShapeData, vertices: { x: number, y: number }[]) => {
    if (!showLabels || showLabels === 'false') return null;
    const centerX = SVG_CENTER_X + (shape.xOffset || 0);
    const centerY = SVG_CENTER_Y + (shape.yOffset || 0);
    const elements: any[] = [];
    const textShadow = "#FFFFFF";

    const labelStyle = {
        fontWeight: "900" as const,
        fontSize: "13px",
        paintOrder: "stroke",
        stroke: textShadow,
        strokeWidth: "3px",
        strokeLinejoin: "round" as const
    };

    if (shape.shapeType === 'circle') {
      elements.push(<text key="r" x={centerX} y={centerY - shape.width / 2 - 12} textAnchor="middle" dominantBaseline="central" fill={forcedText} style={labelStyle}>{shape.sideLabels?.[0] || ''}</text>);
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
        
        const pushDir = (nx * (centerX - midX) + ny * (centerY - midY)) > 0 ? -1 : 1;
        const labelX = midX + nx * 22 * pushDir;
        const labelY = midY + ny * 22 * pushDir;

        if (shape.sideLabels?.[i]) {
            elements.push(<text key={`s-${i}`} x={labelX} y={labelY} textAnchor="middle" dominantBaseline="central" fill={forcedText} style={labelStyle}>{shape.sideLabels[i]}</text>);
        }
      });
    }

    vertices.forEach((v, i) => {
      const dx = v.x - centerX;
      const dy = v.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;

      if (shape.vertexLabels?.[i]) {
        elements.push(<text key={`v-${i}`} x={v.x + ux * 22} y={v.y + uy * 22} textAnchor="middle" dominantBaseline="central" fill={forcedText} style={{...labelStyle, fontStyle: 'italic'}}>{shape.vertexLabels[i]}</text>);
      }
      
      if (shape.angleLabels?.[i] && shape.shapeType !== 'line' && shape.shapeType !== 'circle') {
        elements.push(<text key={`a-${i}`} x={v.x - ux * 32} y={v.y - uy * 32} textAnchor="middle" dominantBaseline="central" fill={forcedText} style={{...labelStyle, fontSize: '11px'}}>{shape.angleLabels[i]}</text>);
      }
    });

    return elements;
  };

  const renderShape = (shape: ShapeData, idx: number) => {
    const centerX = SVG_CENTER_X + (shape.xOffset || 0);
    const centerY = SVG_CENTER_Y + (shape.yOffset || 0);
    const transform = `rotate(${shape.rotation || 0}, ${centerX}, ${centerY})`;
    const vertices = getPolygonVertices(shape);
    const isSelected = activeShapeIdx === idx;
    const strokeWidth = isSelected ? 4 : 2;
    const color = forcedColor;

    return (
      <g key={shape.id} transform={transform}>
        {shape.shapeType === 'circle' ? (
          <circle cx={centerX} cy={centerY} r={shape.width / 2} stroke={color} strokeWidth={strokeWidth} fill={`${color}10`} className="cursor-move" onMouseDown={(e) => !drawMode && handleMouseDown(e, 'drag', idx)} />
        ) : shape.shapeType === 'line' ? (
          <line x1={vertices[0].x} y1={vertices[0].y} x2={vertices[1].x} y2={vertices[1].y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" className="cursor-move" onMouseDown={(e) => !drawMode && handleMouseDown(e, 'drag', idx)} />
        ) : (
          <polygon points={vertices.map(v => `${v.x},${v.y}`).join(' ')} stroke={color} strokeWidth={strokeWidth} fill={`${color}10`} className="cursor-move" onMouseDown={(e) => !drawMode && handleMouseDown(e, 'drag', idx)} />
        )}
        {renderLabels(shape, vertices)}
        
        {selected && isSelected && !drawMode && (
          <g>
            <line 
                x1={centerX} 
                y1={centerY - (shape.shapeType === 'circle' ? shape.width / 2 : (shape.height || shape.width) / 2)} 
                x2={centerX} 
                y2={centerY - (shape.shapeType === 'circle' ? shape.width / 2 : (shape.height || shape.width) / 2) - 30} 
                stroke={color} 
                strokeWidth="1.5" 
                strokeDasharray="4 2" 
            />
            <circle 
                cx={centerX} 
                cy={centerY - (shape.shapeType === 'circle' ? shape.width / 2 : (shape.height || shape.width) / 2) - 30} 
                r="10" 
                fill="white" 
                stroke={color} 
                strokeWidth="2.5" 
                className="cursor-pointer hover:fill-blue-50 transition-colors shadow-sm" 
                onMouseDown={(e) => handleMouseDown(e, 'rotate', idx)} 
            />
          </g>
        )}
      </g>
    );
  };

  const [drawMode, setDrawMode] = useState(false);

  const handleAddShape = () => {
    if (safeShapes.length >= 8) return;
    const newShape: ShapeData = {
      id: `shape-${Date.now()}`,
      shapeType: '3_iso',
      width: 100,
      height: 100,
      color: forcedColor,
      rotation: 0,
      xOffset: 0,
      yOffset: 0,
      sideLabels: [],
      vertexLabels: [],
      angleLabels: [],
    };
    updateAttributes({ shapes: [...safeShapes, newShape] });
    setActiveShapeIdx(safeShapes.length);
  };

  const handleRemoveShape = (idx: number) => {
    if (safeShapes.length <= 1) {
        deleteNode();
        return;
    }
    const newShapes = safeShapes.filter((_: any, i: number) => i !== idx);
    updateAttributes({ shapes: newShapes });
    setActiveShapeIdx(0);
  };

  const updateActiveShape = (data: Partial<ShapeData>) => {
    const newShapes = [...safeShapes];
    newShapes[activeShapeIdx] = { ...activeShape, ...data, color: forcedColor };
    updateAttributes({ shapes: newShapes });
  };

  const getNumVertices = () => {
    if (activeShape.shapeType === 'circle') return 0;
    if (activeShape.shapeType === 'line') return 2;
    return parseInt((activeShape.shapeType || '').split('_')[0]) || 3;
  };

  const getNumSides = () => {
    if (activeShape.shapeType === 'circle') return 1;
    if (activeShape.shapeType === 'line') return 1;
    return parseInt((activeShape.shapeType || '').split('_')[0]) || 3;
  };

  return (
    <NodeViewWrapper className={`my-8 flex flex-col items-center group/geo relative ${selected ? 'ring-2 ring-primary ring-offset-4 rounded-3xl' : ''}`}>
      <div 
        className={`bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-inner relative w-full flex justify-center overflow-hidden min-h-[400px] ${drawMode ? 'cursor-crosshair' : ''}`}
        onMouseDown={(e) => drawMode && handleMouseDown(e, 'draw', 0)}
      >
        <svg ref={svgRef} width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="drop-shadow-sm overflow-visible bg-white">
          {(isDragging || isRotating || isDrawing) && (
             <g opacity="0.1"><line x1="0" y1={SVG_CENTER_Y} x2={SVG_WIDTH} y2={SVG_CENTER_Y} stroke="#000" strokeDasharray="4"/><line x1={SVG_CENTER_X} y1="0" x2={SVG_CENTER_X} y2={SVG_HEIGHT} stroke="#000" strokeDasharray="4"/></g>
          )}
          {safeShapes.map((s: ShapeData, i: number) => renderShape(s, i))}
          {isDrawing && drawStart && drawCurrent && (
            <line x1={drawStart.x} y1={drawStart.y} x2={drawCurrent.x} y2={drawCurrent.y} stroke="#000" strokeWidth="2" strokeDasharray="4" />
          )}
        </svg>
        <div className="absolute top-4 left-4 flex flex-col gap-2 opacity-0 group-hover/geo:opacity-100 transition-opacity no-print">
            <button 
                onClick={() => setDrawMode(!drawMode)} 
                className={`p-2.5 rounded-xl shadow-lg transition-all ${drawMode ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:text-orange-500'}`}
                title="צייר קו"
            >
                <Pencil size={20} />
            </button>
            <button onClick={() => setIsEditing(!isEditing)} className={`p-2.5 rounded-xl shadow-lg transition-all ${isEditing ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:text-primary'}`} title="הגדרות"><Settings size={20} /></button>
            <button onClick={deleteNode} className="p-2.5 bg-white text-gray-400 hover:text-red-500 rounded-xl shadow-lg transition-all" title="מחק שרטוט"><Trash2 size={20} /></button>
        </div>
        <div className="absolute bottom-4 right-4 flex gap-2 no-print overflow-x-auto max-w-[80%] pb-1 no-scrollbar">
            {safeShapes.map((_: any, i: number) => (
                <button key={i} onClick={() => setActiveShapeIdx(i)} className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-md shrink-0 ${activeShapeIdx === i ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>צורה {i+1}</button>
            ))}
            {safeShapes.length < 8 && (
                <button onClick={handleAddShape} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-100 shadow-sm border border-blue-100 flex items-center gap-1 shrink-0"><Plus size={14}/> הוסף צורה</button>
            )}
        </div>
      </div>

      {isEditing && (
        <div className="w-full mt-4 p-6 bg-white rounded-[2rem] border-2 border-primary/20 shadow-xl animate-fade-in no-print z-20">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
             <div className="flex items-center gap-4">
                <h4 className="font-black text-primary">עריכת צורה {activeShapeIdx + 1}</h4>
             </div>
             <button onClick={() => handleRemoveShape(activeShapeIdx)} className="text-red-500 text-xs font-black flex items-center gap-1 hover:bg-red-50 px-3 py-1 rounded-lg transition-all"><Trash size={14}/> מחק צורה זו</button>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">סוג צורה</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'circle', label: 'עיגול', icon: CircleIcon },
                    { id: 'line', label: 'קו', icon: Plus },
                    { id: '3_iso', label: 'משולש', icon: Triangle },
                    { id: '4_rect', label: 'מרובע', icon: Square },
                    { id: '5_regular', label: '5 צלעות', icon: Hexagon },
                    { id: '6_regular', label: '6 צלעות', icon: Hexagon },
                    { id: '8_regular', label: 'מתומן', icon: Hexagon },
                  ].map(item => (
                    <button key={item.id} onClick={() => updateActiveShape({ shapeType: item.id, sideLabels: [], vertexLabels: [], angleLabels: [] })} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${(activeShape.shapeType || '').startsWith(item.id.split('_')[0]) && item.id !== 'line' && item.id !== 'circle' || activeShape.shapeType === item.id ? 'border-primary bg-blue-50 text-primary font-black' : 'border-gray-50 text-gray-400 hover:border-gray-200'}`}><item.icon size={18} /><span className="text-[9px] mt-1">{item.label}</span></button>
                  ))}
                </div>
              </div>

              {(activeShape.shapeType || '').startsWith('3') && (
                <div className="grid grid-cols-3 gap-2">
                    {[{ id: '3_iso', label: 'חד זווית' }, { id: '3_right', label: 'ישר זווית' }, { id: '3_obtuse', label: 'קהה זווית' }].map(s => (
                        <button key={s.id} onClick={() => updateActiveShape({ shapeType: s.id })} className={`py-2 px-1 rounded-lg border-2 text-[10px] font-bold transition-all ${activeShape.shapeType === s.id ? 'border-primary bg-blue-50 text-primary' : 'border-gray-50 text-gray-400'}`}>{s.label}</button>
                    ))}
                </div>
              )}

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-4"><span className="text-xs font-bold text-gray-500 min-w-[40px]">{activeShape.shapeType === 'line' ? 'אורך' : 'רוחב'}</span><input type="range" min="30" max="220" value={activeShape.width || 100} onChange={e => updateActiveShape({ width: parseInt(e.target.value) })} className="flex-1 accent-primary" /></div>
                {activeShape.shapeType !== 'circle' && activeShape.shapeType !== 'line' && activeShape.shapeType !== '4_square' && (<div className="flex items-center gap-4"><span className="text-xs font-bold text-gray-500 min-w-[40px]">גובה</span><input type="range" min="30" max="220" value={activeShape.height || 100} onChange={e => updateActiveShape({ height: parseInt(e.target.value) })} className="flex-1 accent-primary" /></div>)}
                <div className="flex items-center gap-4"><span className="text-xs font-bold text-gray-500 min-w-[40px]">סיבוב</span><input type="range" min="0" max="360" value={activeShape.rotation || 0} onChange={e => updateActiveShape({ rotation: parseInt(e.target.value) })} className="flex-1 accent-primary" /></div>
              </div>
            </div>

            <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-gray-400 uppercase block mb-3">סימון קודקודים וזוויות</label>
                   <div className="grid grid-cols-2 gap-4 max-h-48 overflow-y-auto no-scrollbar pr-1">
                      {Array.from({ length: getNumVertices() }).map((_, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-xl space-y-2 border border-gray-100">
                           <span className="text-[9px] font-black text-gray-400">קודקוד {i+1}</span>
                           <div className="flex gap-2">
                             <input type="text" placeholder="אות" maxLength={2} value={activeShape.vertexLabels?.[i] || ''} onChange={e => { const l = [...(activeShape.vertexLabels || [])]; l[i] = e.target.value; updateActiveShape({ vertexLabels: l }); }} className="w-full p-1.5 bg-white border rounded text-xs font-bold text-center uppercase" />
                             {activeShape.shapeType !== 'line' && <input type="text" placeholder="זווית" value={activeShape.angleLabels?.[i] || ''} onChange={e => { const l = [...(activeShape.angleLabels || [])]; l[i] = e.target.value; updateActiveShape({ angleLabels: l }); }} className="w-full p-1.5 bg-white border rounded text-xs font-bold text-center" />}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-3">אורך צלעות</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: getNumSides() }).map((_, i) => (
                            <input key={i} type="text" placeholder={`צלע ${i+1}`} value={activeShape.sideLabels?.[i] || ''} onChange={e => { const l = [...(activeShape.sideLabels || [])]; l[i] = e.target.value; updateActiveShape({ sideLabels: l }); }} className="p-2 bg-gray-50 border rounded-lg text-xs font-bold text-center" />
                        ))}
                    </div>
                </div>
            </div>
          </div>
          <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-100">
             <button onClick={() => updateAttributes({ showLabels: !showLabels })} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${showLabels && showLabels !== 'false' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>{showLabels && showLabels !== 'false' ? <Check size={14}/> : <Plus size={14}/>} הצג תוויות בשרטוט</button>
             <button onClick={() => setIsEditing(false)} className="bg-primary text-white px-10 py-2 rounded-xl font-black text-xs hover:bg-blue-600 shadow-lg">סיום עריכה</button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

// --- Analytic Geometry Extension ---

const AnalyticGeometryNode = Node.create({
  name: 'analyticGeometryNode',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      objects: {
        default: [{ "type": "point", "label": "A", "params": { "x": 2, "y": 3 }, "color": "#3B82F6" }],
        parseHTML: element => {
          const objects = element.getAttribute('data-objects') || element.getAttribute('dataobjects');
          try {
             return objects ? JSON.parse(objects.replace(/&quot;/g, '"')) : [];
          } catch(e) { return []; }
        },
        renderHTML: attributes => ({
          'data-objects': JSON.stringify(attributes.objects),
          'data-type': 'analytic-geometry-node'
        }),
      },
      viewRange: {
        default: { "minX": -10, "maxX": 10, "minY": -10, "maxY": 10 },
        parseHTML: element => {
          const range = element.getAttribute('data-view-range') || element.getAttribute('dataviewrange');
          try {
             return range ? JSON.parse(range.replace(/&quot;/g, '"')) : { "minX": -10, "maxX": 10, "minY": -10, "maxY": 10 };
          } catch(e) { return { "minX": -10, "maxX": 10, "minY": -10, "maxY": 10 }; }
        },
        renderHTML: attributes => ({
          'data-view-range': JSON.stringify(attributes.viewRange)
        }),
      },
      showGrid: {
        default: false,
        parseHTML: element => {
            const val = element.getAttribute('data-show-grid') || element.getAttribute('datashowgrid');
            return val === 'true';
        },
        renderHTML: attributes => ({
          'data-show-grid': attributes.showGrid ? 'true' : 'false'
        }),
      },
      showNumbers: {
        default: false,
        parseHTML: element => {
            const val = element.getAttribute('data-show-numbers') || element.getAttribute('datashownumbers');
            return val === 'true';
        },
        renderHTML: attributes => ({
          'data-show-numbers': attributes.showNumbers ? 'true' : 'false'
        }),
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="analytic-geometry-node"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'analytic-geometry-node' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AnalyticGeometryNodeView);
  },
});

const AnalyticGeometryNodeView = (props: any) => {
  const { node, updateAttributes, deleteNode, selected } = props;
  const objects = node.attrs.objects || [];
  const viewRange = node.attrs.viewRange;
  const showGrid = node.attrs.showGrid;
  const showNumbers = node.attrs.showNumbers;
  const [activeTab, setActiveTab] = useState<'draw' | 'edit' | 'settings' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{x: number, y: number} | null>(null);
  const plotContainerRef = useRef<HTMLDivElement>(null);

  const size = 350;
  const margin = 35;
  const plotSize = size - 2 * margin;

  const toValueX = (svgX: number) => {
    // svgX is relative to the SVG element
    return viewRange.minX + (svgX - margin) * (viewRange.maxX - viewRange.minX) / plotSize;
  };
  const toValueY = (svgY: number) => {
    // svgY is relative to the SVG element
    return viewRange.minY + (size - margin - svgY) * (viewRange.maxY - viewRange.minY) / plotSize;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTab !== 'draw') return;
    const svgElement = e.currentTarget.querySelector('svg');
    if (!svgElement) return;
    const rect = svgElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const svgElement = e.currentTarget.querySelector('svg');
    if (!svgElement) return;
    const rect = svgElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !drawCurrent) return;
    
    const x1 = toValueX(drawStart.x);
    const y1 = toValueY(drawStart.y);
    const x2 = toValueX(drawCurrent.x);
    const y2 = toValueY(drawCurrent.y);

    const dist = Math.sqrt(Math.pow(drawCurrent.x - drawStart.x, 2) + Math.pow(drawCurrent.y - drawStart.y, 2));
    
    if (dist > 5) {
      const newObj = {
        type: 'segment',
        label: '',
        params: { x1, y1, x2, y2 },
        color: "#3B82F6",
        showEquation: false
      };
      updateAttributes({ objects: [...objects, newObj] });
    } else {
      const newObj = {
        type: 'point',
        label: String.fromCharCode(65 + objects.filter((o: any) => o.type === 'point').length),
        params: { x: x1, y: y1 },
        color: "#3B82F6",
        showEquation: true
      };
      updateAttributes({ objects: [...objects, newObj] });
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  };

  const addObject = (type: string) => {
    let newObj;
    if (type === 'point') {
      newObj = { type: 'point', label: String.fromCharCode(65 + objects.filter((o: any) => o.type === 'point').length), params: { x: 0, y: 0 }, color: "#3B82F6", showEquation: true };
    } else if (type === 'line') {
      newObj = { type: 'line', label: 'f', params: { m: 1, b: 0 }, color: "#3B82F6", showEquation: true };
    } else if (type === 'parabola') {
      newObj = { type: 'parabola', label: 'g', params: { a: 1, b: 0, c: 0 }, color: "#3B82F6", showEquation: true };
    }
    if (newObj) updateAttributes({ objects: [...objects, newObj] });
  };

  const removeObject = (idx: number) => {
    const newObjects = objects.filter((_: any, i: number) => i !== idx);
    updateAttributes({ objects: newObjects });
  };

  const updateObject = (idx: number, data: any) => {
    const newObjects = [...objects];
    newObjects[idx] = { ...newObjects[idx], ...data };
    updateAttributes({ objects: newObjects });
  };

  return (
    <NodeViewWrapper className={`my-8 flex flex-col items-center group/ana relative ${selected ? 'ring-4 ring-primary ring-offset-4 rounded-[3rem]' : ''}`}>
       <div className="bg-white border-2 border-emerald-100 rounded-[3rem] shadow-lg overflow-hidden min-h-[100px] relative w-full flex justify-center">
          {/* Main Display Area */}
          <div className="relative w-full flex justify-center" ref={plotContainerRef}>
            <div 
              className={`p-4 ${activeTab === 'draw' ? 'cursor-crosshair' : ''}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => setIsDrawing(false)}
            >
               <LatexRenderer text={`<div data-type="analytic-geometry-node" data-objects='${JSON.stringify(objects).replace(/'/g, "&apos;")}' data-view-range='${JSON.stringify(viewRange).replace(/'/g, "&apos;")}' data-show-grid="${showGrid}" data-show-numbers="${showNumbers}"></div>`} />
               {isDrawing && drawStart && drawCurrent && (
                 <svg className="absolute inset-0 pointer-events-none w-full h-full">
                   <line 
                     x1={drawStart.x + (plotContainerRef.current?.querySelector('svg')?.getBoundingClientRect().left || 0) - (plotContainerRef.current?.getBoundingClientRect().left || 0)} 
                     y1={drawStart.y + (plotContainerRef.current?.querySelector('svg')?.getBoundingClientRect().top || 0) - (plotContainerRef.current?.getBoundingClientRect().top || 0)} 
                     x2={drawCurrent.x + (plotContainerRef.current?.querySelector('svg')?.getBoundingClientRect().left || 0) - (plotContainerRef.current?.getBoundingClientRect().left || 0)} 
                     y2={drawCurrent.y + (plotContainerRef.current?.querySelector('svg')?.getBoundingClientRect().top || 0) - (plotContainerRef.current?.getBoundingClientRect().top || 0)} 
                     stroke="#3B82F6" 
                     strokeWidth="2" 
                     strokeDasharray="4" 
                   />
                 </svg>
               )}
            </div>

            {/* Floating Buttons (Top Left) */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 opacity-0 group-hover/ana:opacity-100 transition-opacity no-print z-20">
                <button 
                    onClick={() => {
                        if (activeTab === 'draw') {
                            setActiveTab(null);
                            setIsEditing(false);
                        } else {
                            setActiveTab('draw');
                            setIsEditing(true);
                        }
                    }} 
                    className={`p-2.5 rounded-xl shadow-lg transition-all ${activeTab === 'draw' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:text-orange-500'}`}
                    title="ציור חופשי"
                >
                    <Pencil size={20} />
                </button>
                <button 
                    onClick={() => {
                        if (activeTab === 'edit') {
                            setActiveTab(null);
                            setIsEditing(false);
                        } else {
                            setActiveTab('edit');
                            setIsEditing(true);
                        }
                    }} 
                    className={`p-2.5 rounded-xl shadow-lg transition-all ${activeTab === 'edit' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:text-primary'}`}
                    title="עריכת אובייקטים"
                >
                    <Settings size={20} />
                </button>
                <button 
                    onClick={() => {
                        if (activeTab === 'settings') {
                            setActiveTab(null);
                            setIsEditing(false);
                        } else {
                            setActiveTab('settings');
                            setIsEditing(true);
                        }
                    }} 
                    className={`p-2.5 rounded-xl shadow-lg transition-all ${activeTab === 'settings' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 hover:text-emerald-600'}`}
                    title="הגדרות צירים"
                >
                    <Activity size={20} />
                </button>
                <button onClick={() => deleteNode()} className="p-2.5 bg-white text-gray-400 hover:text-red-500 rounded-xl shadow-lg transition-all" title="מחק רכיב"><Trash2 size={20} /></button>
            </div>
          </div>
       </div>

       {/* Panel Below */}
       {isEditing && activeTab && (
         <div className="w-full mt-4 p-8 bg-white rounded-[2rem] border-2 border-emerald-100 shadow-xl animate-fade-in no-print z-20" dir="rtl">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
               <h4 className="font-black text-emerald-700 flex items-center gap-2">
                 {activeTab === 'draw' && <><Pencil size={20}/> ציור חופשי</>}
                 {activeTab === 'edit' && <><Settings size={20}/> עריכת אובייקטים</>}
                 {activeTab === 'settings' && <><Activity size={20}/> הגדרות מערכת צירים</>}
               </h4>
               <button onClick={() => { setIsEditing(false); setActiveTab(null); }} className="text-gray-400 hover:text-gray-600 font-bold text-xs">סגור</button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              {activeTab === 'draw' && (
                <div className="space-y-6">
                   <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 text-center">
                     <Pencil size={24} className="mx-auto mb-3 text-orange-500" />
                     <h5 className="font-black text-orange-800 mb-1">מצב ציור פעיל</h5>
                     <p className="text-xs font-bold text-orange-600">גרור על מערכת הצירים לציור קטע, או לחץ לחיצה בודדת להוספת נקודה.</p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <button onClick={() => addObject('point')} className="bg-white p-4 rounded-2xl border border-gray-200 font-black text-xs text-gray-700 hover:border-primary transition-all flex items-center justify-between"><span>הוסף נקודה (0,0)</span><Plus size={14}/></button>
                     <button onClick={() => addObject('line')} className="bg-white p-4 rounded-2xl border border-gray-200 font-black text-xs text-gray-700 hover:border-primary transition-all flex items-center justify-between"><span>הוסף ישר (y=x)</span><Plus size={14}/></button>
                     <button onClick={() => addObject('parabola')} className="bg-white p-4 rounded-2xl border border-gray-200 font-black text-xs text-gray-700 hover:border-primary transition-all flex items-center justify-between"><span>הוסף פרבולה (y=x²)</span><Plus size={14}/></button>
                   </div>
                </div>
              )}

              {activeTab === 'edit' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button onClick={() => addObject('point')} className="bg-white p-4 rounded-2xl border border-gray-200 font-black text-xs text-gray-700 hover:border-primary transition-all flex items-center justify-between"><span>הוסף נקודה (0,0)</span><Plus size={14}/></button>
                      <button onClick={() => addObject('line')} className="bg-white p-4 rounded-2xl border border-gray-200 font-black text-xs text-gray-700 hover:border-primary transition-all flex items-center justify-between"><span>הוסף ישר (y=x)</span><Plus size={14}/></button>
                      <button onClick={() => addObject('parabola')} className="bg-white p-4 rounded-2xl border border-gray-200 font-black text-xs text-gray-700 hover:border-primary transition-all flex items-center justify-between"><span>הוסף פרבולה (y=x²)</span><Plus size={14}/></button>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {objects.map((obj: any, idx: number) => (
                         <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 relative group/obj">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-primary"></div>
                               <input 
                                 type="text" 
                                 value={obj.label || ''} 
                                 onChange={e => updateObject(idx, { label: e.target.value })} 
                                 className="w-16 bg-transparent border-b border-transparent focus:border-primary outline-none font-black text-xs"
                                 placeholder="תווית"
                               />
                             </div>
                             <button onClick={() => removeObject(idx)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-2">
                             {obj.type === 'point' ? (
                               <>
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">X</span>
                                   <input type="number" value={obj.params?.x ?? 0} onChange={e => updateObject(idx, { params: { ...obj.params, x: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">Y</span>
                                   <input type="number" value={obj.params?.y ?? 0} onChange={e => updateObject(idx, { params: { ...obj.params, y: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                               </>
                             ) : obj.type === 'line' ? (
                               <>
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">m</span>
                                   <input type="number" value={obj.params?.m ?? 1} onChange={e => updateObject(idx, { params: { ...obj.params, m: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">b</span>
                                   <input type="number" value={obj.params?.b ?? 0} onChange={e => updateObject(idx, { params: { ...obj.params, b: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                               </>
                             ) : obj.type === 'parabola' ? (
                               <div className="col-span-2 grid grid-cols-3 gap-1">
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">a</span>
                                   <input type="number" value={obj.params?.a ?? 1} onChange={e => updateObject(idx, { params: { ...obj.params, a: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">b</span>
                                   <input type="number" value={obj.params?.b ?? 0} onChange={e => updateObject(idx, { params: { ...obj.params, b: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">c</span>
                                   <input type="number" value={obj.params?.c ?? 0} onChange={e => updateObject(idx, { params: { ...obj.params, c: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                               </div>
                             ) : (
                               <div className="col-span-2 grid grid-cols-2 gap-2">
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">X1</span>
                                   <input type="number" value={obj.params?.x1 ?? 0} onChange={e => updateObject(idx, { params: { ...obj.params, x1: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">Y1</span>
                                   <input type="number" value={obj.params?.y1 ?? 0} onChange={e => updateObject(idx, { params: { ...obj.params, y1: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">X2</span>
                                   <input type="number" value={obj.params?.x2 ?? 0} onChange={e => updateObject(idx, { params: { ...obj.params, x2: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                                 <div className="space-y-1">
                                   <span className="text-[9px] font-bold text-gray-400 block mr-1">Y2</span>
                                   <input type="number" value={obj.params?.y2 ?? 0} onChange={e => updateObject(idx, { params: { ...obj.params, y2: parseFloat(e.target.value) || 0 } })} className="w-full p-2 bg-white rounded-xl border border-gray-100 text-xs font-bold text-center" />
                                 </div>
                               </div>
                             )}
                             <label className="col-span-2 flex items-center gap-2 cursor-pointer mt-1">
                               <input type="checkbox" checked={!!obj.showEquation} onChange={e => updateObject(idx, { showEquation: e.target.checked })} className="w-3 h-3 accent-primary" />
                               <span className="text-[10px] font-bold text-gray-400">הצג ערכים בגרף</span>
                             </label>
                           </div>
                         </div>
                       ))}
                       {objects.length === 0 && <div className="col-span-full text-center py-12 text-gray-300 text-sm font-bold border-2 border-dashed border-gray-100 rounded-3xl">אין אובייקטים להצגה</div>}
                    </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-8">
                   <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                       <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">טווח תצוגה</h5>
                       <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                           <span className="text-[9px] font-bold text-gray-400 block mr-1">X Min</span>
                           <input type="number" value={viewRange.minX ?? -10} onChange={e => updateAttributes({ viewRange: { ...viewRange, minX: parseFloat(e.target.value) || 0 } })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold text-center" />
                         </div>
                         <div className="space-y-1">
                           <span className="text-[9px] font-bold text-gray-400 block mr-1">X Max</span>
                           <input type="number" value={viewRange.maxX ?? 10} onChange={e => updateAttributes({ viewRange: { ...viewRange, maxX: parseFloat(e.target.value) || 0 } })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold text-center" />
                         </div>
                         <div className="space-y-1">
                           <span className="text-[9px] font-bold text-gray-400 block mr-1">Y Min</span>
                           <input type="number" value={viewRange.minY ?? -10} onChange={e => updateAttributes({ viewRange: { ...viewRange, minY: parseFloat(e.target.value) || 0 } })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold text-center" />
                         </div>
                         <div className="space-y-1">
                           <span className="text-[9px] font-bold text-gray-400 block mr-1">Y Max</span>
                           <input type="number" value={viewRange.maxY ?? 10} onChange={e => updateAttributes({ viewRange: { ...viewRange, maxY: parseFloat(e.target.value) || 0 } })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold text-center" />
                         </div>
                       </div>
                     </div>
                     <div className="space-y-6">
                       <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">תצוגת עזר</h5>
                       <div className="space-y-4">
                         <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:border-primary transition-all">
                           <input type="checkbox" checked={!!showGrid} onChange={e => updateAttributes({ showGrid: e.target.checked })} className="w-5 h-5 accent-primary" />
                           <span className="text-sm font-black text-gray-700">הצג רשת (Grid)</span>
                         </label>
                         <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:border-primary transition-all">
                           <input type="checkbox" checked={!!showNumbers} onChange={e => updateAttributes({ showNumbers: e.target.checked })} className="w-5 h-5 accent-primary" />
                           <span className="text-sm font-black text-gray-700">הצג מספרים על הצירים</span>
                         </label>
                       </div>
                     </div>
                   </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
               <button onClick={() => { setIsEditing(false); setActiveTab(null); }} className="bg-primary text-white px-12 py-3 rounded-2xl font-black shadow-xl hover:bg-blue-600 transition-all">סיום עריכה</button>
            </div>
         </div>
       )}
    </NodeViewWrapper>
  );
};

// --- Custom Font Size Extension ---

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => (element as HTMLElement).style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

// --- Custom Math Extension for Live Rendering ---

const MathNode = Node.create({
  name: 'mathNode',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-node"]',
        getAttrs: (element: string | HTMLElement) => {
           if (typeof element === 'string') return {};
           return { latex: element.getAttribute('data-latex') };
        }
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'math-node', 'data-latex': HTMLAttributes.latex })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },
});

const MathNodeView = (props: any) => {
  const { node, selected, deleteNode } = props;
  const latex = node.attrs.latex || '';

  return (
    <NodeViewWrapper className={`math-node-view ${selected ? 'selected' : ''}`}>
      <div className="flex items-center gap-1 group/math relative">
        <LatexRenderer text={String(latex).startsWith('$') ? latex : `$${latex}$`} className="math-inline-plain" />
        {selected && (
            <button 
                onClick={(e) => { e.stopPropagation(); deleteNode(); }}
                className="bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors ml-1 shadow-sm"
            >
                <X size={10} />
            </button>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// --- Main Editor Component ---

interface MathParam {
  id: string;
  label: string;
  placeholder: string;
}

interface MathSymbol {
  label: string;
  code?: string;
  after?: string;
  params?: MathParam[];
  template?: (vals: Record<string, string>) => string;
}

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showGuide?: boolean;
  minHeight?: string;
  minimalMode?: boolean;
  subject?: string;
  hideInteractive?: boolean;
  stickyOffset?: string;
}

const RichEditor: React.FC<RichEditorProps> = ({ value, onChange, placeholder, showGuide = true, minHeight = "450px", minimalMode = false, subject, hideInteractive = false, stickyOffset = "top-0" }) => {
  const [showMathPanel, setShowMathPanel] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableConfig, setTableConfig] = useState({ rows: 3, cols: 3 });
  const [isUploading, setIsUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  const [activeSymbol, setActiveSymbol] = useState<MathSymbol | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      TextStyle.configure(),
      Color.configure(),
      Underline.configure(),
      FontFamily.configure(),
      FontSize,
      MathNode,
      GeometryNode,
      AnalyticGeometryNode,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-fixed w-full border border-gray-300 my-4',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 bg-gray-50 p-2 font-bold text-right',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2 text-right',
        },
      }),
      Image.configure({ allowBase64: true }),
      Placeholder.configure({
        placeholder: placeholder || "התחילו לכתוב כאן...",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `tiptap prose prose-blue max-w-none focus:outline-none p-8 text-right bg-transparent`,
        dir: 'rtl',
        style: `min-height: ${minHeight};`
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
       if (!editor.isFocused) {
         // Use a microtask or timeout to avoid flushSync warning in React 18
         const timeout = setTimeout(() => {
           if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
             editor.commands.setContent(value, { emitUpdate: false });
           }
         }, 0);
         return () => clearTimeout(timeout);
       }
    }
  }, [value, editor]);

  const mathSymbols: MathSymbol[] = [
    { label: 'שבר', params: [{id: 'n', label: 'מונה', placeholder: '1'}, {id: 'd', label: 'מכנה', placeholder: '2'}], template: (vals) => `\\frac{${vals['n'] || ''}}{${vals['d'] || ''}}` },
    { label: 'חזקה', params: [{id: 'b', label: 'בסיס', placeholder: 'x'}, {id: 'e', label: 'מעריך', placeholder: '2'}], template: (vals) => `${vals['b'] || 'x'}^{${vals['e'] || ''}}` },
    { label: 'שורש ריבועי', params: [{id: 'v', label: 'מתחת לשורש', placeholder: 'x'}], template: (vals) => `\\sqrt{${vals['v'] || ''}}` },
    { label: 'שורש n-י', params: [{id: 'i', label: 'אינדקס (n)', placeholder: '3'}, {id: 'v', label: 'מספר', placeholder: 'x'}], template: (vals) => `\\sqrt[${vals['i'] || ''}]{${vals['v'] || ''}}` },
    { label: 'משוואה (=)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '5'}], template: (vals) => `${vals['l'] || ''} = ${vals['r'] || ''}` },
    { label: 'אי-שוויון (≠)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '0'}], template: (vals) => `${vals['l'] || ''} \\neq ${vals['r'] || ''}` },
    { label: 'גדול מ... (>)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '3'}], template: (vals) => `${vals['l'] || ''} \\gt ${vals['r'] || ''}` },
    { label: 'גדול מ... (<)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '10'}], template: (vals) => `${vals['l'] || ''} \\lt ${vals['r'] || ''}` },
    { label: 'גדול/שווה (≥)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '0'}], template: (vals) => `${vals['l'] || ''} \\ge ${vals['r'] || ''}` },
    { label: 'קטן/שווה (≤)', params: [{id: 'l', label: 'אגף שמאל', placeholder: 'x'}, {id: 'r', label: 'אגף ימין', placeholder: '11'}], template: (vals) => `${vals['l'] || ''} \\le ${vals['r'] || ''}` },
    { label: 'גבול (lim)', params: [{id: 'v', label: 'שואף ל...', placeholder: 'x \\to \\infty'}, {id: 'e', label: 'ביטוי', placeholder: 'f(x)'}], template: (vals) => `\\lim_{${vals['v'] || ''}} ${vals['e'] || ''}` },
    { label: 'אינטגרל מסוים', params: [{id: 'l', label: 'גבול תחתון', placeholder: 'a'}, {id: 'u', label: 'גבול עליון', placeholder: 'b'}, {id: 'e', label: 'ביטוי', placeholder: 'f(x)'}], template: (vals) => `\\int_{${vals['l'] || ''}}^{${vals['u'] || ''}} ${vals['e'] || ''} dx` },
    { label: 'סכום (Σ)', params: [{id: 'l', label: 'התחלה', placeholder: 'i=1'}, {id: 'u', label: 'סוף', placeholder: 'n'}, {id: 'e', label: 'ביטוי', placeholder: 'i'}], template: (vals) => `\\sum_{${vals['l'] || ''}}^{${vals['u'] || ''}} ${vals['e'] || ''}` },
    { label: 'לוגריתם', params: [{id: 'b', label: 'בסיס', placeholder: '10'}, {id: 'v', label: 'ערך', placeholder: 'x'}], template: (vals) => `\\log_{${vals['b'] || ''}}(${vals['v'] || ''})` },
    { label: 'סינוס/קוסינוס', params: [{id: 't', label: 'פונקציה', placeholder: 'sin'}, {id: 'v', label: 'ערך', placeholder: 'x'}], template: (vals) => `\\${vals['t'] || 'sin'}(${vals['v'] || ''})` },
    { label: 'מערכת משוואות', params: [{id: 'e1', label: 'משוואה 1', placeholder: 'x+y=5'}, {id: 'e2', label: 'משוואה 2', placeholder: 'x-y=1'}], template: (vals) => `\\begin{cases} ${vals['e1'] || ''} \\\\ ${vals['e2'] || ''} \\end{cases}` },
    { label: 'פאי (π)', params: [], template: () => `\\pi` },
    { label: 'אלפא/בטא', params: [{id: 'v', label: 'alpha / beta', placeholder: 'alpha'}], template: (vals) => `\\${vals['v'] || 'alpha'}` }
  ];

  const fonts = [{ name: 'רוביק', value: 'Rubik' }, { name: 'היבו', value: 'Heebo' }, { name: 'אסיסטנט', value: 'Assistant' }, { name: 'אלף', value: 'Alef' }, { name: 'דוד', value: 'David Libre' }, { name: 'ורלה', value: 'Varela Round' }, { name: 'מכונת כתיבה', value: 'Courier New' }];
  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '32px', '40px', '48px', '60px', '72px'];

  const handleMathSymbolClick = (sym: MathSymbol) => {
    if (sym.params && sym.params.length > 0) { setActiveSymbol(sym); setParamValues({}); setShowMathPanel(false); }
    else { const latex = sym.template ? sym.template({}) : ''; editor?.commands.insertContent({ type: 'mathNode', attrs: { latex } }); setShowMathPanel(false); }
  };

  const handleInsertGeometry = () => editor?.commands.insertContent({ type: 'geometryNode' });
  const handleInsertAnalytic = () => editor?.commands.insertContent({ type: 'analyticGeometryNode' });

  const submitParams = () => { if (activeSymbol?.template && editor) { const latex = activeSymbol.template(paramValues); editor.commands.insertContent({ type: 'mathNode', attrs: { latex } }); } setActiveSymbol(null); setParamValues({}); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target?.result as string;
      editor.chain().focus().insertContent(`<a href="${fileData}" download="${file.name}">${file.name}</a>`).run();
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width; let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        editor.commands.setImage({ src: canvas.toDataURL('image/jpeg', 0.6) });
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const colors = [{ name: 'שחור', value: '#000000' }, { name: 'כחול', value: '#3b82f6' }, { name: 'אדום', value: '#ef4444' }, { name: 'ירוק', value: '#10b981' }, { name: 'סגול', value: '#8b5cf6' }];

  const [showToolbar, setShowToolbar] = useState(true);
  const lastScrollY = useRef(0);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (!containerRef.current) return;
      
      const scrollTarget = e.target as HTMLElement;
      // Use documentElement.scrollTop if target is document, otherwise use scrollTop or window.scrollY
      const currentScrollY = scrollTarget === document as any ? document.documentElement.scrollTop : (scrollTarget.scrollTop || window.scrollY);
      
      const isScrollingUp = currentScrollY < lastScrollY.current;
      const scrollDiff = Math.abs(currentScrollY - lastScrollY.current);
      const rect = containerRef.current.getBoundingClientRect();
      
      // The header height in GlobalContentEditor is h-20 (80px)
      const headerHeight = 80; 

      // If editor top is below header, always show the toolbar
      if (rect.top > headerHeight) {
        setShowToolbar(true);
      } 
      // If editor bottom is above header (scrolled past), hide it
      else if (rect.bottom < headerHeight + 60) {
        setShowToolbar(false);
      } 
      // Inside editor range: show on scroll up, hide on scroll down
      else if (scrollDiff > 5) {
        setShowToolbar(isScrollingUp);
      }
      
      lastScrollY.current = currentScrollY;
    };

    // Use capture: true to catch scroll events from overflow containers
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  if (!editor) return null;

  return (
    <div ref={containerRef} className="flex flex-col w-full bg-white rounded-3xl border border-gray-200 shadow-sm focus-within:ring-2 ring-primary/10 transition-all text-right relative" dir="rtl">
      <style>{`.tiptap h1 { font-size: 2.25rem; font-weight: 900; margin-top: 1.5rem; margin-bottom: 1rem; color: #111827; } .tiptap h2 { font-size: 1.5rem; font-weight: 800; margin-top: 1.25rem; margin-bottom: 0.75rem; color: #374151; } .tiptap ul { list-style-type: disc; padding-right: 1.5rem; margin: 1rem 0; } .tiptap ol { list-style-type: decimal; padding-right: 1.5rem; margin: 1rem 0; } .tiptap li { margin-bottom: 0.5rem; } .tiptap p { margin-bottom: 1rem; line-height: 1.75; } .math-inline-plain .katex { font-size: 1.25em !important; }`}</style>
      {activeSymbol && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center p-6 bg-white/40 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border border-indigo-100 p-8 transform animate-slide-up">
              <div className="flex justify-between items-center mb-6"><h4 className="font-black text-lg text-indigo-600 flex items-center gap-2"><Calculator size={20}/><span>הזנת ערכים: {activeSymbol.label}</span></h4><button onClick={() => setActiveSymbol(null)} className="text-gray-400 hover:text-red-500"><X size={20}/></button></div>
              <div className="space-y-4 mb-8">{activeSymbol.params?.map(param => (<div key={param.id}><label className="block text-xs font-black text-gray-400 uppercase mb-1.5 mr-1">{param.label}</label><input autoFocus={activeSymbol.params?.[0].id === param.id} type="text" value={paramValues[param.id] || ''} onChange={(e) => setParamValues({...paramValues, [param.id]: e.target.value})} placeholder={param.placeholder} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-center shadow-inner" onKeyDown={(e) => { if(e.key === 'Enter') submitParams(); }} /></div>))}</div>
              <div className="flex gap-3"><button onClick={submitParams} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">הוסף לעורך</button><button onClick={() => setActiveSymbol(null)} className="px-6 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all">ביטול</button></div>
           </div>
        </div>
      )}
      <div 
        ref={toolbarRef}
        className={`flex flex-wrap items-center justify-between p-3 bg-white border-b border-gray-100 gap-3 no-print sticky ${stickyOffset} z-50 shadow-sm transition-transform duration-300 rounded-t-3xl ${showToolbar ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-xl transition-all ${editor.isActive('bold') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="הדגשה"><Bold size={16}/></button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-xl transition-all ${editor.isActive('italic') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="נטוי"><Italic size={16}/></button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded-xl transition-all ${editor.isActive('underline') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="קו תחתי"><UnderlineIcon size={16}/></button>
          </div>
          {!minimalMode && (
            <>
              <div className="flex items-center px-1 border-l border-gray-200 ml-1 relative group bg-white rounded-xl hover:bg-gray-100 transition-all">
                <select onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} className="appearance-none bg-transparent border-none rounded-lg text-[11px] font-black py-2 pr-2 pl-6 focus:outline-none cursor-pointer text-gray-700 w-auto min-w-[85px] transition-all" value={editor.getAttributes('textStyle').fontFamily || ''}><option value="">סוג פונט</option>{fonts.map(f => (<option key={f.value} value={f.value}>{f.name}</option>))}</select>
                <ChevronDown size={11} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-center px-1 border-l border-gray-200 ml-1 relative group"><select onChange={(e) => { const val = e.target.value; if (val === "") editor.chain().focus().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(); else editor.chain().focus().setMark('textStyle', { fontSize: val }).run(); }} className="appearance-none bg-white border-none rounded-lg text-[11px] font-black py-2 pr-2 pl-6 focus:ring-1 ring-primary/20 outline-none cursor-pointer text-gray-700 w-16 transition-all hover:bg-gray-100" value={editor.getAttributes('textStyle').fontSize || ''}><option value="">גודל</option>{fontSizes.map(s => (<option key={s} value={s}>{s.replace('px','')}</option>))}</select><ChevronDown size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-primary transition-colors" /></div>
            </>
          )}
          <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1">
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded-xl transition-all ${editor.isActive('heading', { level: 1 }) ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="כותרת גדולה"><Heading1 size={16}/></button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded-xl transition-all ${editor.isActive('heading', { level: 2 }) ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="כותרת משנה"><Heading2 size={16}/></button>
          </div>
          <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1">
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded-xl transition-all ${editor.isActive('bulletList') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="רשימת נקודות"><List size={16}/></button>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-2 rounded-xl transition-all ${editor.isActive('orderedList') ? 'bg-white shadow-sm text-primary' : 'text-gray-600 hover:bg-white hover:text-primary'}`} title="רשימה ממוספרת"><ListOrdered size={16}/></button>
          </div>

          {showGuide && (
            <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1 relative">
              <button type="button" onClick={() => setShowMathPanel(!showMathPanel)} className={`p-2 rounded-xl transition-all flex items-center gap-2 ${showMathPanel ? 'bg-indigo-600 text-white shadow-lg' : 'bg-blue-50 text-indigo-600 hover:bg-blue-100'}`} title="הוספת נוסחה"><Calculator size={16}/><span className="text-[10px] font-black">נוסחה</span><ChevronDown size={10} className={showMathPanel ? 'rotate-180 transition-transform' : ''}/></button>
              {showMathPanel && (<><div className="fixed inset-0 z-10" onClick={() => setShowMathPanel(false)}></div><div className="absolute top-full right-0 mt-2 p-4 bg-white shadow-2xl rounded-3xl border border-gray-100 z-20 w-80 animate-fade-in max-h-[450px] overflow-y-auto no-scrollbar"><div className="grid grid-cols-2 gap-2">{mathSymbols.map((sym, idx) => (<button key={idx} type="button" onClick={() => handleMathSymbolClick(sym)} className="flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-xl transition-all text-right group"><div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-xs font-mono text-indigo-600 group-hover:bg-white shadow-sm transition-all"><Plus size={10} /></div><span className="text-[11px] font-bold text-gray-600 group-hover:text-indigo-700 leading-tight">{sym.label}</span></button>))}</div></div></>)}
            </div>
          )}

          <div className="flex items-center gap-1 px-1 border-l border-gray-200 ml-1">
            <button type="button" onClick={handleInsertGeometry} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-2" title="שרטוט גיאומטריה">
              <Shapes size={16}/>
              <span className="text-[10px] font-black">גיאומטריה</span>
            </button>
            <button type="button" onClick={handleInsertAnalytic} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all flex items-center gap-2" title="מערכת צירים">
              <Activity size={16}/>
              <span className="text-[10px] font-black">אנליטית</span>
            </button>
          </div>

          <div className="flex items-center gap-1 px-1 border-l border-gray-200 ml-1 relative">
            <button
              type="button"
              onClick={() => setShowTableMenu(!showTableMenu)}
              className={`p-2 rounded-xl transition-all flex items-center gap-2 ${editor.isActive('table') ? 'bg-blue-50 text-primary shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
              title="הוסף טבלה"
            >
              <Grid3X3 size={16} />
              <span className="text-[10px] font-black">טבלה</span>
              <ChevronDown size={10} className={showTableMenu ? 'rotate-180 transition-transform' : ''}/>
            </button>
            {showTableMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTableMenu(false)}></div>
                <div className="absolute top-full right-0 mt-2 p-4 bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 w-48 animate-fade-in" onClick={e => e.stopPropagation()}>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase mb-3 text-right">הגדרות טבלה</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <input 
                        type="number" 
                        min="1" max="10" 
                        value={tableConfig.rows} 
                        onChange={e => setTableConfig({...tableConfig, rows: parseInt(e.target.value) || 1})}
                        className="w-full p-2 bg-gray-50 border rounded-lg text-center text-xs font-bold"
                      />
                      <span className="text-[10px] font-bold text-gray-400">שורות</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <input 
                        type="number" 
                        min="1" max="10" 
                        value={tableConfig.cols} 
                        onChange={e => setTableConfig({...tableConfig, cols: parseInt(e.target.value) || 1})}
                        className="w-full p-2 bg-gray-50 border rounded-lg text-center text-xs font-bold"
                      />
                      <span className="text-[10px] font-bold text-gray-400">עמודות</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        editor.chain().focus().insertTable({ rows: tableConfig.rows, cols: tableConfig.cols, withHeaderRow: true }).run();
                        setShowTableMenu(false);
                      }}
                      className="w-full py-2 bg-primary text-white rounded-xl text-[10px] font-black hover:bg-blue-600 transition-all shadow-md mb-2"
                    >
                      צור טבלה
                    </button>
                    {editor.isActive('table') && (
                      <button 
                        type="button"
                        onClick={() => {
                          editor.chain().focus().deleteTable().run();
                          setShowTableMenu(false);
                        }}
                        className="w-full py-2 bg-red-50 text-red-500 rounded-xl text-[10px] font-black hover:bg-red-100 transition-all border border-red-100"
                      >
                        מחק טבלה קיימת
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {editor.isActive('table') && (
            <div className="flex items-center gap-1 px-1 border-l border-gray-200 ml-1 bg-blue-50/50 rounded-xl py-1">
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => editor.chain().focus().addColumnBefore().run()} className="p-1.5 hover:bg-white rounded-lg text-gray-500 shadow-sm" title="הוסף עמודה לפני"><Plus size={14} className="rotate-90"/></button>
                <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="p-1.5 hover:bg-white rounded-lg text-gray-500 shadow-sm" title="הוסף עמודה אחרי"><Plus size={14} className="rotate-270"/></button>
              </div>
              <div className="w-px h-4 bg-blue-100 mx-1" />
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => editor.chain().focus().addRowBefore().run()} className="p-1.5 hover:bg-white rounded-lg text-gray-500 shadow-sm" title="הוסף שורה לפני"><Plus size={14}/></button>
                <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="p-1.5 hover:bg-white rounded-lg text-gray-500 shadow-sm" title="הוסף שורה אחרי"><Plus size={14}/></button>
              </div>
              <div className="w-px h-4 bg-blue-100 mx-1" />
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 shadow-sm" title="מחק עמודה"><Trash2 size={14} className="rotate-90"/></button>
                <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 shadow-sm" title="מחק שורה"><Trash2 size={14}/></button>
                <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-md ml-1" title="מחק טבלה"><Trash2 size={14}/></button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-0.5 px-1 border-l border-gray-200 ml-1 group relative">
            <div className="p-2 text-gray-400"><Palette size={16} /></div>
            <div className="flex gap-1 ml-2">
              {colors.map(colorItem => (
                <button key={colorItem.value} type="button" onClick={() => editor.chain().focus().setColor(colorItem.value).run()} className={`w-5 h-5 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-125 ${editor.isActive('textStyle', { color: colorItem.value }) ? 'ring-2 ring-primary ring-offset-1' : ''}`} style={{ backgroundColor: colorItem.value }} title={colorItem.name} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-0.5 px-1">
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 text-gray-600 hover:text-primary hover:bg-white rounded-xl transition-all" title="תמונה">{isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}</button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>
        </div>
      </div>
      <div className="relative bg-white flex-1 min-h-[400px] rounded-b-3xl overflow-hidden"><EditorContent editor={editor} /></div>
    </div>
  );
};

export default RichEditor;
