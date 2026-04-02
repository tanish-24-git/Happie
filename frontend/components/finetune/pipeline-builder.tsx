"use client"

import React, { useState, useCallback, useRef, DragEvent } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Connection,
  Edge,
  Node,
  useReactFlow,
  MarkerType
} from "@xyflow/react";
import '@xyflow/react/dist/style.css';

import { BLOCK_TEMPLATES, CATEGORIES } from "@/components/finetune/block-templates";
import { BlockCategory } from "@/components/finetune/types";
import { CustomNode } from "@/components/finetune/custom-node";
import { ConfigPanel } from "@/components/finetune/config-panel";
import { Settings, Plus, Play, Save } from "lucide-react";

// Register custom node types
const nodeTypes = {
  customTask: CustomNode,
};

function generateId() {
  return `node_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

function PipelineBuilderCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, getNodes } = useReactFlow();
  
  const [activeCategory, setActiveCategory] = useState<BlockCategory>("Data Ingestion");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true,
      type: 'smoothstep',
      style: { strokeDasharray: '4 4', strokeWidth: 1.5, stroke: '#94a3b8' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
    } as Edge, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      if (!containerRef.current) return;

      const templateType = event.dataTransfer.getData('application/reactflow/type');

      if (typeof templateType === 'undefined' || !templateType) {
        return;
      }

      const template = BLOCK_TEMPLATES.find(t => t.type === templateType);
      if (!template) return;

      // Initialize with default values
      const initialConfig: Record<string, any> = {};
      template.fields.forEach(f => {
        if (f.default !== undefined) initialConfig[f.name] = f.default;
      });

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: generateId(),
        type: 'customTask',
        position,
        data: { 
          label: template.title,
          description: template.description,
          templateType: template.type,
          category: template.category,
          config: initialConfig
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNode.id); // Default select the new node
    },
    [screenToFlowPosition, setNodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeData = useCallback((id: string, data: any) => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) {
        return { ...n, data };
      }
      return n;
    }));
  }, [setNodes]);

  return (
    <div className="flex h-full w-full flex-col bg-background relative overflow-hidden">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between border-b px-4 h-14 bg-background z-10 shrink-0">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <div className="font-semibold px-2 shrink-0 border-r pr-6 mr-2">Fine-Tuning Workspace</div>
          <div className="flex flex-1 overflow-x-auto hide-scrollbar gap-1 pt-1 pb-1 items-center">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-3 py-1.5 text-sm rounded-full transition-colors ${
                  activeCategory === cat 
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 pl-4 shrink-0 border-l ml-4">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-muted transition-colors">
              <Save size={16} /> Save
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md shadow hover:bg-primary/90 transition-colors">
              <Play size={16} /> Execute
            </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel - Block Library */}
        <div className="w-64 border-r bg-muted/20 flex flex-col items-center p-3 overflow-y-auto z-10 space-y-3 shrink-0 box-border">
          <div className="w-full text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
            Blocks: {activeCategory}
          </div>
          
          {BLOCK_TEMPLATES.filter(t => t.category === activeCategory).map(template => (
            <div
              key={template.type}
              className="w-full bg-card border hover:border-primary/50 rounded-lg p-3 cursor-grab hover:shadow-md transition-all group"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow/type', template.type);
                e.dataTransfer.effectAllowed = 'move';
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                 <div className="p-1 rounded bg-primary/10 text-primary">
                    <Plus size={14} />
                 </div>
                 <div className="font-medium text-sm text-foreground">{template.title}</div>
              </div>
              <div className="text-xs text-muted-foreground">{template.description}</div>
            </div>
          ))}

          {BLOCK_TEMPLATES.filter(t => t.category === activeCategory).length === 0 && (
            <div className="text-sm text-muted-foreground italic text-center mt-10">
              No blocks available for this category yet.
            </div>
          )}
        </div>

        {/* Center Canvas */}
        <div className="flex-1 relative" ref={containerRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={() => {}}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { strokeDasharray: '4 4', strokeWidth: 1.5, stroke: '#94a3b8' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
            }}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            fitView
            className="bg-dot-pattern"
          >
            <Controls />
            <MiniMap 
              nodeStrokeColor={(n) => {
                if (n.id === selectedNodeId) return '#3b82f6';
                return '#e2e8f0';
              }}
              nodeColor={(n) => {
                if (n.id === selectedNodeId) return '#eff6ff';
                return '#ffffff';
              }}
              nodeBorderRadius={8}
            />
            <Background gap={16} size={1} color="#e2e8f0" />
          </ReactFlow>
        </div>

        {/* Right Panel - Configuration */}
        {selectedNodeId && (
            <ConfigPanel 
              selectedNodeId={selectedNodeId} 
              nodes={nodes} 
              updateNodeData={updateNodeData} 
            />
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

export function PipelineBuilder() {
  return (
    <ReactFlowProvider>
      <PipelineBuilderCanvas />
    </ReactFlowProvider>
  );
}
