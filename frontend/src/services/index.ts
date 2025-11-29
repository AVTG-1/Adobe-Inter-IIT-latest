export { apiClient, default as ApiClient } from './api';
export {
  uploadImageToGCS,
  deleteImageFromGCS,
  validateImage,
  type UploadProgress,
  type UploadResult,
} from './storage';
export {
  getProjects,
  saveProject,
  updateProject,
  deleteProject,
  getRecentProjects,
  clearAllProjects,
  type Project,
} from './projects';
