export type BlockCategory =
  | "Data Ingestion"
  | "Preprocessing"
  | "Prompt & Instruction"
  | "Model Configuration"
  | "Training Hyperparameters"
  | "LR Scheduler"
  | "LoRA Config"
  | "QLoRA / Quantization"
  | "Full Fine-Tuning"
  | "Memory & Performance"
  | "Evaluation"
  | "Checkpoints & Saving"
  | "Logging & Monitoring"
  | "Post-Training Quantization"
  | "Advanced"
  | "Data Safety & Edge Handling";

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "toggle" | "slider" | "textarea" | "multiselect" | "file";
  options?: string[];
  default?: any;
  required?: boolean;
}

export interface BlockTemplate {
  type: string;
  title: string;
  category: BlockCategory;
  description: string;
  icon?: any;
  fields: FieldConfig[];
}
