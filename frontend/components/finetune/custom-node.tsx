import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Settings, FileCode, Sliders } from "lucide-react";

export function CustomNode({ data, selected }: { data: any, selected: boolean }) {
  // If required fields are filled or any config exists, mark as configured
  const isConfigured = data.config && Object.keys(data.config).length > 0;
  
  return (
    <div className={`flex flex-col bg-card border rounded-lg overflow-hidden shadow-sm w-[240px] transition-all ${selected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary" />
      
      <div className="flex items-center gap-2 p-3 bg-muted/50 border-b">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
          <Settings size={14} />
        </div>
        <div className="flex-1 font-medium text-sm truncate" title={data.label}>{data.label}</div>
        {isConfigured && (
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Configured" />
        )}
      </div>
      
      <div className="p-3 text-xs text-muted-foreground min-h-[40px]">
        {data.description}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary" />
    </div>
  );
}
