/**
 * Projects Service
 *
 * Save and load editing projects
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Project {
  id: string;
  name: string;
  thumbnail: string;
  imageUrl?: string;
  isBlankCanvas?: boolean;
  createdAt: number;
  updatedAt: number;
}

const PROJECTS_KEY = '@ai_photo_editor:projects';
const MAX_RECENT_PROJECTS = 20;

/**
 * Get all projects
 */
export const getProjects = async (): Promise<Project[]> => {
  try {
    const data = await AsyncStorage.getItem(PROJECTS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
};

/**
 * Save a new project
 */
export const saveProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
  try {
    const projects = await getProjects();

    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Add to beginning of array
    const updatedProjects = [newProject, ...projects].slice(0, MAX_RECENT_PROJECTS);

    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));

    return newProject;
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

/**
 * Update an existing project
 */
export const updateProject = async (id: string, updates: Partial<Project>): Promise<void> => {
  try {
    const projects = await getProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        ...updates,
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

/**
 * Delete a project
 */
export const deleteProject = async (id: string): Promise<void> => {
  try {
    const projects = await getProjects();
    const updatedProjects = projects.filter(p => p.id !== id);

    await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

/**
 * Get recent projects (limited to MAX_RECENT_PROJECTS)
 */
export const getRecentProjects = async (limit: number = 6): Promise<Project[]> => {
  try {
    const projects = await getProjects();
    return projects.slice(0, limit);
  } catch (error) {
    console.error('Error loading recent projects:', error);
    return [];
  }
};

/**
 * Clear all projects
 */
export const clearAllProjects = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PROJECTS_KEY);
  } catch (error) {
    console.error('Error clearing projects:', error);
    throw error;
  }
};
