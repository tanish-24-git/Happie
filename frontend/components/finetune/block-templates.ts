import { BlockTemplate, BlockCategory } from "@/components/finetune/types";

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    type: "file_upload",
    title: "File Upload",
    category: "Data Ingestion",
    description: "Upload a dataset file",
    fields: [
      { name: "file_type", label: "File Type", type: "select", options: ["json", "csv", "txt", "folder"], default: "json" },
      { name: "encoding", label: "Encoding", type: "select", options: ["utf-8", "latin-1", "ascii"], default: "utf-8" },
      { name: "delimiter", label: "Delimiter", type: "text", default: "," },
      { name: "header", label: "Has Header", type: "toggle", default: true },
      { name: "upload_file", label: "Upload File", type: "file" }
    ]
  },
  {
    type: "column_mapping",
    title: "Column Mapping",
    category: "Data Ingestion",
    description: "Map input to target columns",
    fields: [
      { name: "input_columns", label: "Input Columns", type: "multiselect", options: ["text", "input", "prompt"] },
      { name: "target_column", label: "Target Column", type: "select", options: ["output", "target", "label", "completion"] },
      { name: "system_prompt_column", label: "System Prompt Column", type: "text" }
    ]
  },
  {
    type: "format_selection",
    title: "Format Selection",
    category: "Data Ingestion",
    description: "Select dataset layout",
    fields: [
      { name: "format", label: "Dataset Format", type: "select", options: ["Alpaca", "ShareGPT", "ChatML", "Raw"], default: "Alpaca" }
    ]
  },
  {
    type: "text_cleaning",
    title: "Text Cleaning",
    category: "Preprocessing",
    description: "Clean simple artifacts",
    fields: [
      { name: "lowercase", label: "Lowercase", type: "toggle", default: false },
      { name: "remove_punctuation", label: "Remove Punctuation", type: "toggle", default: false }
    ]
  },
  {
    type: "tokenization",
    title: "Tokenization",
    category: "Preprocessing",
    description: "Tokenize input data",
    fields: [
      { name: "max_seq_length", label: "Max Sequence Length", type: "number", default: 2048 },
      { name: "padding", label: "Padding Strategy", type: "select", options: ["right", "left", "max_length", "longest"], default: "right" }
    ]
  },
  {
    type: "data_splitting",
    title: "Data Splitting",
    category: "Preprocessing",
    description: "Split train/val sets",
    fields: [
      { name: "train_split", label: "Train Split %", type: "slider", default: 90 },
      { name: "shuffle", label: "Shuffle", type: "toggle", default: true }
    ]
  },
  {
    type: "prompt_config",
    title: "Prompt Formatting",
    category: "Prompt & Instruction",
    description: "Setup prompt templates",
    fields: [
      { name: "system_prompt", label: "System Prompt", type: "textarea", default: "You are a helpful assistant." },
      { name: "instruction_template", label: "Instruction Template", type: "textarea", default: "### Instruction:\n{instruction}\n\n### Input:\n{input}\n\n" },
      { name: "response_template", label: "Response Template", type: "textarea", default: "### Response:\n" },
      { name: "add_eos_token", label: "Add EOS Token", type: "toggle", default: true }
    ]
  },
  {
    type: "model_config",
    title: "Model Config",
    category: "Model Configuration",
    description: "Select the base model",
    fields: [
      { name: "base_model", label: "Base Model", type: "select", options: ["llama-3-8b", "llama-3-70b", "mistral-7b", "qwen-2.5-7b", "custom"], default: "llama-3-8b" },
      { name: "model_type", label: "Model Type", type: "select", options: ["CausalLM", "Seq2SeqLM"], default: "CausalLM" },
      { name: "precision", label: "Precision", type: "select", options: ["fp32", "fp16", "bf16", "int8", "int4"], default: "bf16" },
      { name: "device", label: "Device Map", type: "select", options: ["auto", "cuda:0", "cpu"], default: "auto" }
    ]
  },
  {
    type: "training_hparams",
    title: "Hyperparameters",
    category: "Training Hyperparameters",
    description: "Core training parameters",
    fields: [
      { name: "epochs", label: "Epochs", type: "number", default: 3 },
      { name: "batch_size", label: "Batch Size (per device)", type: "number", default: 4 },
      { name: "gradient_accumulation_steps", label: "Gradient Acc. Steps", type: "number", default: 4 },
      { name: "learning_rate", label: "Learning Rate", type: "number", default: 0.0002 }
    ]
  },
  {
    type: "lr_scheduler",
    title: "LR Scheduler",
    category: "LR Scheduler",
    description: "Learning rate scheduling",
    fields: [
      { name: "scheduler_type", label: "Scheduler Type", type: "select", options: ["linear", "cosine", "cosine_with_restarts", "polynomial", "constant", "constant_with_warmup"], default: "cosine" },
      { name: "warmup_ratio", label: "Warmup Ratio %", type: "slider", default: 5 }
    ]
  },
  {
    type: "lora_config",
    title: "LoRA Target",
    category: "LoRA Config",
    description: "Low-Rank Adaptation",
    fields: [
      { name: "lora_rank", label: "LoRA Rank (r)", type: "number", default: 16 },
      { name: "lora_alpha", label: "LoRA Alpha", type: "number", default: 32 },
      { name: "lora_dropout", label: "LoRA Dropout %", type: "slider", default: 5 },
      { name: "target_modules", label: "Target Modules", type: "multiselect", options: ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj", "all-linear"] }
    ]
  },
  {
    type: "qlora",
    title: "QLoRA Settings",
    category: "QLoRA / Quantization",
    description: "Quantized LoRA configs",
    fields: [
      { name: "quantization_bits", label: "Quantization Bits", type: "select", options: ["4bit", "8bit", "none"], default: "4bit" },
      { name: "quant_type", label: "Quant Type", type: "select", options: ["nf4", "fp4"], default: "nf4" },
      { name: "compute_dtype", label: "Compute Dtype", type: "select", options: ["float16", "bfloat16", "float32"], default: "bfloat16" },
      { name: "double_quant", label: "Use Double Quantization", type: "toggle", default: true }
    ]
  },
  {
    type: "full_finetune",
    title: "Full Fine-Tuning",
    category: "Full Fine-Tuning",
    description: "Full weights updating",
    fields: [
      { name: "freeze_layers", label: "Freeze Bottom Layers", type: "number", default: 0 },
      { name: "gradient_checkpointing", label: "Gradient Checkpointing", type: "toggle", default: true }
    ]
  },
  {
    type: "memory_perf",
    title: "Memory & Perf",
    category: "Memory & Performance",
    description: "Hardware optimizations",
    fields: [
      { name: "flash_attention", label: "Flash Attention 2", type: "toggle", default: true },
      { name: "cpu_offload", label: "CPU Offloading", type: "toggle", default: false },
      { name: "pin_memory", label: "Pin Memory", type: "toggle", default: true }
    ]
  },
  {
    type: "evaluation",
    title: "Evaluation Strategy",
    category: "Evaluation",
    description: "How logging is evaluated",
    fields: [
      { name: "evaluation_strategy", label: "Strategy", type: "select", options: ["no", "steps", "epoch"], default: "steps" },
      { name: "metrics", label: "Metrics", type: "multiselect", options: ["loss", "accuracy", "perplexity"] },
      { name: "early_stopping", label: "Use Early Stopping", type: "toggle", default: false }
    ]
  },
  {
    type: "checkpoints",
    title: "Checkpoints",
    category: "Checkpoints & Saving",
    description: "Model saving rules",
    fields: [
      { name: "save_strategy", label: "Save Strategy", type: "select", options: ["no", "steps", "epoch"], default: "steps" },
      { name: "save_steps", label: "Save Steps", type: "number", default: 500 },
      { name: "output_dir", label: "Output Directory", type: "text", default: "./outputs" }
    ]
  },
  {
    type: "logging",
    title: "Logging",
    category: "Logging & Monitoring",
    description: "Monitor tracking options",
    fields: [
      { name: "logging_steps", label: "Logging Steps", type: "number", default: 10 },
      { name: "log_level", label: "Log Level", type: "select", options: ["info", "debug", "warning", "error"], default: "info" },
      { name: "track_gpu_utilization", label: "Track GPU Utilization", type: "toggle", default: true }
    ]
  },
  {
    type: "ptq",
    title: "PTQuantization",
    category: "Post-Training Quantization",
    description: "Quantize after training ends",
    fields: [
      { name: "quant_method", label: "Quantization Method", type: "select", options: ["AWQ", "GPTQ", "GGUF", "None"], default: "GGUF" },
      { name: "per_channel", label: "Per Channel", type: "toggle", default: true }
    ]
  },
  {
    type: "advanced",
    title: "Advanced Tuning",
    category: "Advanced",
    description: "Refining limits",
    fields: [
      { name: "dropout", label: "Dropout %", type: "slider", default: 0 },
      { name: "label_smoothing", label: "Label Smoothing", type: "number", default: 0 }
    ]
  },
  {
    type: "safety",
    title: "Data Safety",
    category: "Data Safety & Edge Handling",
    description: "Handling bad data",
    fields: [
      { name: "skip_invalid_rows", label: "Skip Invalid Rows", type: "toggle", default: true },
      { name: "min_text_length", label: "Min Text Length", type: "number", default: 10 },
      { name: "max_text_length", label: "Max Text Length", type: "number", default: 4096 }
    ]
  }
];

export const CATEGORIES: BlockCategory[] = [
  "Data Ingestion",
  "Preprocessing",
  "Prompt & Instruction",
  "Model Configuration",
  "Training Hyperparameters",
  "LR Scheduler",
  "LoRA Config",
  "QLoRA / Quantization",
  "Full Fine-Tuning",
  "Memory & Performance",
  "Evaluation",
  "Checkpoints & Saving",
  "Logging & Monitoring",
  "Post-Training Quantization",
  "Advanced",
  "Data Safety & Edge Handling"
];
