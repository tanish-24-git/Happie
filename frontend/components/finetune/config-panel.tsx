import React from "react";
import { BLOCK_TEMPLATES } from "./block-templates";

export function ConfigPanel({ selectedNodeId, nodes, updateNodeData }: { selectedNodeId: string | null, nodes: any[], updateNodeData: (id: string, data: any) => void }) {
  const node = nodes.find(n => n.id === selectedNodeId);
  
  if (!node) {
    return (
      <div className="w-80 h-full border-l bg-background p-4 flex flex-col items-center justify-center text-muted-foreground text-sm text-center">
        Select a block to configure its parameters.
      </div>
    );
  }

  const template = BLOCK_TEMPLATES.find(t => t.type === node.data.templateType);
  if (!template) return null;

  const config = node.data.config || {};

  const handleFieldChange = (fieldName: string, value: any) => {
    updateNodeData(node.id, {
      ...node.data,
      config: {
        ...config,
        [fieldName]: value
      }
    });
  };

  return (
    <div className="w-80 h-full border-l bg-background flex flex-col overflow-hidden shadow-xl">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">{template.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {template.fields.map((field: any) => {
          const value = config[field.name] !== undefined ? config[field.name] : field.default;
          
          return (
            <div key={field.name} className="space-y-1.5 flex flex-col">
              <label className="text-sm font-medium">{field.label}</label>
              
              {field.type === "text" && (
                <input 
                  type="text" 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={value || ""}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                />
              )}
              
              {field.type === "number" && (
                <input 
                  type="number" 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={value || 0}
                  onChange={e => handleFieldChange(field.name, Number(e.target.value))}
                />
              )}
              
              {field.type === "textarea" && (
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={value || ""}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                />
              )}
              
              {field.type === "select" && (
                <select 
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={value || ""}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                >
                  {field.options?.map((opt: string) => <option key={opt} value={opt} className="bg-background">{opt}</option>)}
                </select>
              )}
              
              {field.type === "toggle" && (
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-primary"
                    checked={!!value}
                    onChange={e => handleFieldChange(field.name, e.target.checked)}
                  />
                  <span className="text-sm text-muted-foreground">{value ? 'Enabled' : 'Disabled'}</span>
                </div>
              )}
              
              {field.type === "slider" && (
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0" max="100" 
                    className="w-full"
                    value={value || 0}
                    onChange={e => handleFieldChange(field.name, Number(e.target.value))}
                  />
                  <span className="text-sm tabular-nums w-8 text-right">{value || 0}</span>
                </div>
              )}

              {field.type === "file" && (
                <input 
                  type="file" 
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-primary file:text-primary-foreground file:font-medium file:px-2 file:py-1 file:rounded-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onChange={e => handleFieldChange(field.name, e.target.files?.[0]?.name)}
                />
              )}

               {field.type === "multiselect" && (
                <select 
                  multiple
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  value={value || []}
                  onChange={e => {
                    const options = Array.from(e.target.selectedOptions, option => option.value);
                    handleFieldChange(field.name, options);
                  }}
                >
                  {field.options?.map((opt: string) => <option key={opt} value={opt} className="bg-background py-1">{opt}</option>)}
                </select>
              )}
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t flex justify-end gap-2 bg-muted/20">
        <button 
          className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-muted transition-colors opacity-70 hover:opacity-100"
          onClick={() => updateNodeData(node.id, { ...node.data, config: {} })}
        >
          Reset values
        </button>
      </div>
    </div>
  );
}
