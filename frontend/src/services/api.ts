import axios, { AxiosInstance } from 'axios';
import {
  EditRequest,
  WorkflowResponse,
  HealthResponse,
  JobStatus,
  RelightRequest,
  RelightResponse,
  PoseRequest,
  PoseResponse,
} from '../types/api';

/**
 * API Client for Adobe Photo Editor Backend
 *
 * Backend endpoints:
 * - GET  /api/v1/health
 * - POST /api/v1/edit/general
 *
 * Backend is a FastAPI service (Python) with AI agents for image processing.
 */
class ApiClient {
  private client: AxiosInstance;
  private useMockData: boolean;

  constructor(baseURL?: string, useMockData: boolean = true) {
    // Default to localhost backend (FastAPI on port 8000)
    const apiBaseURL = baseURL || 'http://localhost:8000/api/v1';

    this.client = axios.create({
      baseURL: apiBaseURL,
      timeout: 90000, // 90 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.useMockData = useMockData;

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[API Response] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[API Response Error]', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Health Check
   * GET /api/v1/health
   */
  async checkHealth(): Promise<HealthResponse> {
    if (this.useMockData) {
      return this.mockHealthCheck();
    }

    try {
      const response = await this.client.get<HealthResponse>('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Submit Image Edit Workflow
   * POST /api/v1/edit/general
   *
   * @param request - Image URL and list of operations to apply
   * @returns Workflow response with job ID and result
   */
  async submitEditWorkflow(request: EditRequest): Promise<WorkflowResponse> {
    if (this.useMockData) {
      return this.mockEditWorkflow(request);
    }

    try {
      console.log("Calling http post to edit/general")
      const response = await this.client.post<WorkflowResponse>(
        '/edit/general',
        request
      );
      return response.data;
    } catch (error) {
      console.error('Edit workflow failed:', error);
      throw error;
    }
  }

  /**
   * Get Job Status (Future endpoint - not yet implemented in backend)
   * GET /api/v1/jobs/:jobId
   */
  async getJobStatus(jobId: string): Promise<WorkflowResponse> {
    if (this.useMockData) {
      return this.mockJobStatus(jobId);
    }

    try {
      const response = await this.client.get<WorkflowResponse>(`/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Get job status failed:', error);
      throw error;
    }
  }

  /**
   * Relight Image
   * POST /api/v1/relight
   *
   * @param request - Relight parameters (x, y, z_depth, warmth, intensity, image_url)
   * @returns Relight response with processed image URL
   */
  async relightImage(request: RelightRequest): Promise<RelightResponse> {
    console.log("Calling http post to relight")
    // if (this.useMockData) {
    //   console.log("Using mock data for relight")
    //   return this.mockRelightImage(request);
    // }

    try {
      console.log('Calling POST to /relight with params:', {
        x: request.x,
        y: request.y,
        z_depth: request.z_depth,
        steps: request.steps,
        prompt: request.prompt,
      });

      const response = await this.client.post<RelightResponse>(
        '/relight',
        request
      );
      console.log("Response from relight API:", response.data);
      return response.data;
    } catch (error) {
      console.error('Relight API failed:', error);
      throw error;
    }
  }

  /**
   * Pose Change
   * POST /api/v1/pose
   *
   * @param request - Pose parameters (image_url, keypoints, confidence_threshold)
   * @returns Pose response with processed image URL
   */
  async poseChange(request: PoseRequest): Promise<PoseResponse> {
    if (this.useMockData) {
      return this.mockPoseChange(request);
    }

    try {
      console.log('Calling POST to /pose with params:', {
        keypoints_count: request.keypoints.length,
        confidence_threshold: request.confidence_threshold,
      });

      const response = await this.client.post<PoseResponse>(
        '/pose',
        request
      );
      return response.data;
    } catch (error) {
      console.error('Pose API failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // MOCK DATA METHODS (for Phase 1)
  // ============================================================================

  private mockHealthCheck(): Promise<HealthResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'healthy',
          version: '0.1.0',
          timestamp: new Date().toISOString(),
        });
      }, 500);
    });
  }

  private mockEditWorkflow(request: EditRequest): Promise<WorkflowResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const jobId = `mock-job-${Date.now()}`;
        resolve({
          job_id: jobId,
          status: JobStatus.COMPLETED,
          result_url: request.image_url, // Return original image URL instead of placeholder
          agent_thoughts: [
            'General edit workflow initiated',
            `Applying ${request.operations.length} operation(s)`,
            'Image processing completed successfully',
          ],
          processing_time_ms: 1500,
        });
      }, 1500);
    });
  }

  private mockJobStatus(jobId: string): Promise<WorkflowResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          job_id: jobId,
          status: JobStatus.COMPLETED,
          // result_url is optional - omit it since we don't have access to the original image URL
          agent_thoughts: ['Job completed'],
          processing_time_ms: 2000,
        });
      }, 500);
    });
  }

  private mockRelightImage(request: RelightRequest): Promise<RelightResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const jobId = `relight-job-${Date.now()}`;
        // For mock, return the original image URL
        // In real implementation, this would be the processed image URL
        resolve({
          job_id: jobId,
          status: JobStatus.COMPLETED,
          result_url: request.image_url, // Mock: return original image, real API will return processed image
          agent_thoughts: [
            'Relight workflow initiated',
            `Processing with coordinates (${request.x}, ${request.y})`,
            `Z-depth: ${request.z_depth}, Warmth: ${request.warmth}, Intensity: ${request.intensity}`,
            'Image relighting completed successfully',
          ],
          processing_time_ms: 2000,
        });
      }, 2000); // Simulate 2 second processing time
    });
  }

  private mockPoseChange(request: PoseRequest): Promise<PoseResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const jobId = `pose-job-${Date.now()}`;
        // For mock, return the original image URL
        // In real implementation, this would be the processed image URL with new pose
        resolve({
          job_id: jobId,
          status: JobStatus.COMPLETED,
          result_url: request.image_url, // Mock: return original image, real API will return processed image
          detected_keypoints: request.keypoints, // Mock: echo back the keypoints
          agent_thoughts: [
            'Pose change workflow initiated',
            `Processing ${request.keypoints.length} keypoints`,
            `Confidence threshold: ${request.confidence_threshold || 0.7}`,
            'Detecting source pose...',
            'Generating target pose transformation...',
            'Applying pose-conditional diffusion...',
            'Image pose transformation completed successfully',
          ],
          processing_time_ms: 2500,
        });
      }, 2500); // Simulate 2.5 second processing time
    });
  }

  /**
   * Switch between mock and real API
   */
  setUseMockData(useMock: boolean) {
    this.useMockData = useMock;
  }

  /**
   * Update base URL (useful for connecting to deployed backend)
   */
  setBaseURL(baseURL: string) {
    this.client.defaults.baseURL = baseURL;
  }
}

// Export singleton instance
// NOTE: By default, useMockData is true. This means the API client will return mock data.
// To connect to the real FastAPI backend:
//   1. Ensure the backend is running: cd backend && ./run.sh
//   2. Call apiClient.setUseMockData(false) in your component
// Or create a new instance: new ApiClient('http://localhost:8000/api/v1', false)
export const apiClient = new ApiClient();

// Export class for custom instances
export default ApiClient;
