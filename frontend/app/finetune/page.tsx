import { PipelineBuilder } from "@/components/finetune/pipeline-builder"

export default function FineTunePage() {
  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))] flex-col w-full">
      <PipelineBuilder />
    </div>
  )
}
