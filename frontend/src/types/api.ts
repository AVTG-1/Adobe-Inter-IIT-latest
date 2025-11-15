// API Types for backend integration

export enum JobStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export type EditOperationType =
  | 'brightness'
  | 'contrast'
  | 'crop'
  | 'resize'
  | 'rotate'
  | 'blur'
  | 'saturation'
  | 'exposure';

export interface EditOperation {
  type: EditOperationType;
  value?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  angle?: number;
}

export interface EditRequest {
  image_url: string;
  operations: EditOperation[];
}

export interface WorkflowResponse {
  job_id: string;
  status: JobStatus;
  result_url?: string;
  agent_thoughts: string[];
  processing_time_ms?: number;
  error?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}
