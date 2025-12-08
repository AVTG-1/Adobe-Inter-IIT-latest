import numpy as np
import torch
from typing import Union, Tuple, Optional, Dict

class LightingCalculator:
    """
    Vectorized implementation of Phong reflection model for generating lighting guidance maps.
    
    This class computes physically-based lighting intensity maps using:
    - Normal maps (surface orientation)
    - Depth maps (3D geometry)
    - Camera parameters (3D reconstruction)
    - Light positions (illumination sources)
    
    No ML model required - pure mathematical computation using vectorized operations.
    
    NEW: Includes F8 (Shadow Casting via SSRM) and F9 (Final Light Map Generation)
    """
    
    def __init__(self, 
                 use_gpu: bool = True,
                 k_linear: float = 0.09,
                 k_quadratic: float = 0.032,
                 light_intensity: float = 1.0):
        """
        Initialize the lighting calculator.
        
        Args:
            use_gpu: Whether to use GPU acceleration (requires CUDA)
            k_linear: Linear attenuation coefficient (controls how quickly light fades)
            k_quadratic: Quadratic attenuation coefficient (inverse square law)
            light_intensity: Base light intensity multiplier
            
        Attenuation coefficients explanation:
        - k_linear=0.09, k_quadratic=0.032: Suitable for range ~50 units
        - k_linear=0.014, k_quadratic=0.0007: Suitable for range ~200 units
        - Adjust based on your scene scale
        """
        self.device = torch.device('cuda' if use_gpu and torch.cuda.is_available() else 'cpu')
        self.k_linear = k_linear
        self.k_quadratic = k_quadratic
        self.light_intensity = light_intensity
        
    def depth_to_pointcloud(self,
                           depth_map: Union[np.ndarray, torch.Tensor],
                           fx: float,
                           fy: float,
                           cx: float,
                           cy: float) -> torch.Tensor:
        """
        Unproject depth map to 3D point cloud using camera intrinsics.
        
        This is Function F5 - converting 2D depth to 3D coordinates (P).
        
        Args:
            depth_map: (H, W) depth values in meters/units
            fx, fy: Focal lengths in pixels
            cx, cy: Principal point (image center) in pixels
            
        Returns:
            point_cloud: (H, W, 3) tensor of 3D coordinates [x, y, z]
            
        Mathematical explanation:
        Given a pixel (u, v) with depth d, the 3D point is:
            x = (u - cx) * d / fx
            y = (v - cy) * d / fy
            z = d
        This reverses the perspective projection.
        """
        # Convert to torch tensor if needed
        if isinstance(depth_map, np.ndarray):
            depth_map = torch.from_numpy(depth_map).float()
        depth_map = depth_map.to(self.device)
        
        H, W = depth_map.shape
        
        # Create pixel coordinate grids
        # u: horizontal pixel coordinates [0, W-1]
        # v: vertical pixel coordinates [0, H-1]
        v, u = torch.meshgrid(torch.arange(H, device=self.device),
                             torch.arange(W, device=self.device),
                             indexing='ij')
        
        # Unproject to 3D using pinhole camera model
        # This converts pixel coordinates + depth to 3D world coordinates
        x = (u - cx) * depth_map / fx
        y = (v - cy) * depth_map / fy
        z = depth_map
        
        # Stack into (H, W, 3) point cloud
        point_cloud = torch.stack([x, y, z], dim=-1)
        
        return point_cloud
    
    def compute_light_directions(self,
                                point_cloud: torch.Tensor,
                                light_position: Union[np.ndarray, torch.Tensor, list]
                               ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Compute normalized light direction vectors and distances.
        
        Args:
            point_cloud: (H, W, 3) 3D coordinates of each pixel
            light_position: (3,) or (1, 1, 3) position of light source [x, y, z]
            
        Returns:
            light_dirs_normalized: (H, W, 3) unit vectors pointing from surface to light
            distances: (H, W) distances from each point to light
            light_vectors: (H, W, 3) unnormalized vectors (for debugging)
            
        Mathematical explanation:
        For each surface point P and light position L:
            Light_vector = L - P  (direction from surface to light)
            Distance = ||Light_vector||₂
            Light_direction = Light_vector / Distance (normalized)
        """
        # Convert light position to tensor
        if isinstance(light_position, (list, np.ndarray)):
            light_position = torch.tensor(light_position, dtype=torch.float32)
        light_position = light_position.to(self.device)
        
        # Ensure light_position has shape (1, 1, 3) for broadcasting
        if light_position.dim() == 1:
            light_position = light_position.view(1, 1, 3)
        
        # Compute vectors from each point to light source
        # Broadcasting: (H, W, 3) - (1, 1, 3) = (H, W, 3)
        light_vectors = light_position - point_cloud
        
        # Compute distances (L2 norm)
        distances = torch.norm(light_vectors, dim=-1, keepdim=False)  # (H, W)
        
        # Normalize light vectors (avoid division by zero)
        # Add small epsilon to prevent NaN when distance is 0
        light_dirs_normalized = light_vectors / (distances.unsqueeze(-1) + 1e-8)
        
        return light_dirs_normalized, distances, light_vectors
    
    def compute_diffuse_term(self,
                            normals: Union[np.ndarray, torch.Tensor],
                            light_dirs: torch.Tensor) -> torch.Tensor:
        """
        Compute Lambertian diffuse reflection (N · L).
        
        Args:
            normals: (H, W, 3) surface normal vectors (should be normalized)
            light_dirs: (H, W, 3) normalized light direction vectors
            
        Returns:
            diffuse: (H, W) diffuse intensity [0, 1]
            
        Mathematical explanation:
        Lambertian reflection model: I_diffuse = max(N · L, 0)
        - N · L > 0: Surface faces light (illuminated)
        - N · L = 0: Surface perpendicular to light (boundary)
        - N · L < 0: Surface faces away (in shadow) → clamp to 0
        
        Physical interpretation:
        The dot product measures alignment between surface normal and light.
        Maximum intensity when they're parallel (cos(0°) = 1).
        """
        # Convert normals to tensor if needed
        if isinstance(normals, np.ndarray):
            normals = torch.from_numpy(normals).float()
        normals = normals.to(self.device)
        
        # Ensure normals are normalized (unit length)
        # DSINE outputs should already be normalized, but let's be safe
        normals = normals / (torch.norm(normals, dim=-1, keepdim=True) + 1e-8)
        
        # Compute dot product: N · L
        # Element-wise multiplication then sum along last dimension
        diffuse = torch.sum(normals * light_dirs, dim=-1)  # (H, W)
        
        # Clamp negative values to 0 (surfaces facing away from light)
        diffuse = torch.clamp(diffuse, min=0.0)
        
        return diffuse
    
    def compute_attenuation(self, distances: torch.Tensor) -> torch.Tensor:
        """
        Compute light attenuation based on distance (inverse square law variant).
        
        Args:
            distances: (H, W) distances from surface points to light
            
        Returns:
            attenuation: (H, W) attenuation factor [0, 1]
            
        Mathematical explanation:
        Physical light follows inverse square law: I ∝ 1/d²
        We use a modified version to prevent singularities:
            Att = 1 / (1 + k_linear*d + k_quadratic*d²)
        
        Why the modification?
        - Constant 1: Prevents division by zero when d=0
        - Linear term: Provides smoother falloff at close range
        - Quadratic term: Approximates physical inverse square law at distance
        
        Effect on lighting:
        - Near light (d≈0): Att ≈ 1 (full brightness)
        - Medium distance: Smooth falloff
        - Far from light: Att ≈ 1/d² (physically accurate)
        """
        attenuation = 1.0 / (1.0 + 
                            self.k_linear * distances + 
                            self.k_quadratic * distances ** 2)
        
        return attenuation
    
    def compute_lighting_intensity(self,
                                  normal_map: Union[np.ndarray, torch.Tensor],
                                  depth_map: Union[np.ndarray, torch.Tensor],
                                  light_position: Union[np.ndarray, torch.Tensor, list],
                                  camera_intrinsics: Optional[dict] = None,
                                  return_components: bool = False
                                 ) -> Union[torch.Tensor, Tuple[torch.Tensor, dict]]:
        """
        Main function (F7) - Compute lighting intensity map using Phong reflection model.
        
        This is the complete pipeline that combines all steps:
        1. Unproject depth to 3D (F5)
        2. Compute light directions
        3. Calculate diffuse shading (N · L)
        4. Apply distance attenuation
        5. Multiply by light intensity
        
        Args:
            normal_map: (H, W, 3) surface normals in world space, range [-1, 1]
            depth_map: (H, W) depth values in meters/units
            light_position: (3,) light source position [x, y, z] in world space
            camera_intrinsics: Dict with keys 'fx', 'fy', 'cx', 'cy'
                              If None, uses standard intrinsics based on image size
            return_components: If True, returns intermediate results for debugging
            
        Returns:
            intensity_map: (H, W) final lighting intensity [0, light_intensity]
            components: (optional) dict with intermediate results
            
        Complete mathematical pipeline:
        
        Step 1: Depth → 3D Point Cloud (P)
            P(u,v) = [(u-cx)*d/fx, (v-cy)*d/fy, d]
            
        Step 2: Light Direction (L)
            L = P_light - P
            d = ||L||₂
            L̂ = L / d
            
        Step 3: Diffuse Term (Lambertian)
            I_diffuse = max(N · L̂, 0)
            
        Step 4: Attenuation
            Att = 1 / (1 + k_linear*d + k_quadratic*d²)
            
        Step 5: Final Intensity
            I_raw = I_diffuse × Att × LightIntensity
        
        Why this works:
        - Physically plausible: Based on real light-surface interaction
        - Fast: All operations are vectorized (GPU: ~10-20ms for 1080p)
        - Stable: No ML model needed, deterministic results
        - Informative: Provides strong geometric cues for AI models
        """
        # Convert inputs to tensors
        if isinstance(depth_map, np.ndarray):
            depth_map = torch.from_numpy(depth_map).float()
        depth_map = depth_map.to(self.device)
        
        H, W = depth_map.shape
        
        # Set default camera intrinsics if not provided
        if camera_intrinsics is None:
            # Standard assumptions for a typical camera
            # Field of View (FOV) ≈ 60 degrees
            # fx = fy = W / (2 * tan(FOV/2))
            fx = fy = W / (2 * np.tan(np.radians(30)))  # ~60° horizontal FOV
            cx = W / 2.0
            cy = H / 2.0
            print(f"Using default camera intrinsics: fx={fx:.2f}, fy={fy:.2f}, cx={cx:.2f}, cy={cy:.2f}")
        else:
            fx = camera_intrinsics['fx']
            fy = camera_intrinsics['fy']
            cx = camera_intrinsics['cx']
            cy = camera_intrinsics['cy']
        
        # Step 1: Unproject depth to 3D point cloud (F5)
        print("Step 1: Converting depth map to 3D point cloud...")
        point_cloud = self.depth_to_pointcloud(depth_map, fx, fy, cx, cy)
        
        # Step 2: Compute light directions and distances

        # satvik changed
        u = light_position[0]
        v = light_position[1]
        d = light_position[2]

        X = (u - cx) * d / fx
        Y = (v - cy) * d / fy
        Z = d

        light_position = [X, Y, Z]   
        print("Step 2: Computing light directions...")
        light_dirs_normalized, distances, light_vectors = self.compute_light_directions(
            point_cloud, light_position
        )
        
        # Step 3: Compute diffuse term (N · L)
        print("Step 3: Computing diffuse reflection (N · L)...")
        diffuse_term = self.compute_diffuse_term(normal_map, light_dirs_normalized)
        
        # Step 4: Compute attenuation
        print("Step 4: Computing distance attenuation...")
        attenuation = self.compute_attenuation(distances)
        
        # Step 5: Combine all terms
        print("Step 5: Computing final intensity...")
        intensity_map = diffuse_term * attenuation * self.light_intensity
        
        if return_components:
            components = {
                'point_cloud': point_cloud,
                'light_directions': light_dirs_normalized,
                'distances': distances,
                'diffuse_term': diffuse_term,
                'attenuation': attenuation,
                'intensity_map': intensity_map,
                'fx': fx,
                'fy': fy,
                'cx': cx,
                'cy': cy
            }
            return intensity_map, components
        
        return intensity_map
    
    def compute_specular_term(self,
                             normals: torch.Tensor,
                             light_dirs: torch.Tensor,
                             view_dirs: torch.Tensor,
                             shininess: float = 32.0) -> torch.Tensor:
        """
        (Optional) Compute specular reflection for enhanced realism.
        
        This implements the Blinn-Phong specular term.
        Use this if you want highlights/glossy effects in the guidance map.
        
        Args:
            normals: (H, W, 3) surface normals
            light_dirs: (H, W, 3) light directions
            view_dirs: (H, W, 3) view directions (camera to surface)
            shininess: Specular exponent (higher = sharper highlights)
            
        Returns:
            specular: (H, W) specular intensity
            
        Mathematical explanation:
        Blinn-Phong model uses halfway vector:
            H = normalize(L + V)
            I_specular = max(N · H, 0)^shininess
        
        Why halfway vector?
        - More efficient than Phong's reflection vector
        - Physically plausible approximation
        - Widely used in real-time rendering
        """
        # Compute halfway vector
        halfway = light_dirs + view_dirs
        halfway = halfway / (torch.norm(halfway, dim=-1, keepdim=True) + 1e-8)
        
        # Compute N · H
        spec_angle = torch.sum(normals * halfway, dim=-1)
        spec_angle = torch.clamp(spec_angle, min=0.0)
        
        # Apply shininess (specular exponent)
        specular = torch.pow(spec_angle, shininess)
        
        return specular
    
    def generate_shadow_mask(self,
                            depth_map: torch.Tensor,
                            point_cloud: torch.Tensor,
                            light_position: Union[np.ndarray, torch.Tensor, list],
                            fx: float,
                            fy: float,
                            cx: float,
                            cy: float,
                            max_steps: int = 50,
                            step_size: float = 0.05,
                            bias: float = 0.01,
                            soft_shadow: bool = True) -> torch.Tensor:
        """
        F8: Screen-Space Ray Marching (SSRM) for shadow casting.
        
        This function implements screen-space shadow mapping by ray marching
        from each surface point towards the light source through the depth buffer.
        
        Args:
            depth_map: (H, W) depth values in meters/units
            point_cloud: (H, W, 3) 3D coordinates of each pixel (from F5)
            light_position: (3,) light source position [x, y, z]
            fx, fy: Focal lengths in pixels
            cx, cy: Principal point in pixels
            max_steps: Maximum number of ray marching steps
            step_size: Step size as fraction of ray length (0.0-1.0)
            bias: Depth comparison bias to prevent self-shadowing
            soft_shadow: If True, returns soft shadow values; else binary
            
        Returns:
            shadow_mask: (H, W) shadow factor [0=full shadow, 1=fully lit]
            
        Algorithm:
        For each pixel p:
            1. Compute ray R from P(p) to P_light
            2. March along R in discrete steps
            3. At each step i:
                - Project 3D position back to screen space (u_i, v_i)
                - Compare ray depth Z_ray with scene depth D(u_i, v_i)
                - If Z_ray > D(u_i, v_i) + bias: pixel is occluded
            4. Return occlusion factor
        
        Mathematical Details:
        Ray equation: R(t) = P + t * (P_light - P), t ∈ [0, 1]
        Projection: (u, v) = (fx * X/Z + cx, fy * Y/Z + cy)
        Occlusion test: Z_ray > D_scene + bias
        """
        # Convert light position to tensor
        if isinstance(light_position, (list, np.ndarray)):
            light_position = torch.tensor(light_position, dtype=torch.float32)
        light_position = light_position.to(self.device)
        
        if light_position.dim() == 1:
            light_position = light_position.view(1, 1, 3)
        
        H, W = depth_map.shape
        
        # Initialize shadow mask (1 = fully lit, 0 = fully shadowed)
        shadow_mask = torch.ones((H, W), device=self.device, dtype=torch.float32)
        
        # Compute ray directions from each point to light
        light_vectors = light_position - point_cloud  # (H, W, 3)
        ray_lengths = torch.norm(light_vectors, dim=-1, keepdim=True)  # (H, W, 1)
        ray_dirs = light_vectors / (ray_lengths + 1e-8)  # Normalized (H, W, 3)
        
        # Determine step size in world units
        world_step_size = step_size * ray_lengths.squeeze(-1) / max_steps  # (H, W)
        
        print(f"F8: Ray marching with {max_steps} steps (step_size={step_size})...")
        
        # Ray march for each pixel
        # For efficiency, we'll use a semi-vectorized approach
        # Process all pixels simultaneously but iterate through steps
        
        for step in range(1, max_steps):
            # Current position along ray (t = step / max_steps)
            t = step / max_steps
            
            # 3D position along ray: P + t * (P_light - P)
            ray_pos = point_cloud + t * light_vectors  # (H, W, 3)
            
            # Project ray position back to screen space
            # Projection: u = fx * X/Z + cx, v = fy * Y/Z + cy
            X, Y, Z = ray_pos[..., 0], ray_pos[..., 1], ray_pos[..., 2]
            
            # Avoid division by zero
            Z_safe = torch.clamp(Z, min=1e-3)
            
            u_proj = fx * X / Z_safe + cx  # (H, W)
            v_proj = fy * Y / Z_safe + cy  # (H, W)
            
            # Convert to integer pixel coordinates
            u_int = torch.clamp(u_proj.long(), 0, W - 1)
            v_int = torch.clamp(v_proj.long(), 0, H - 1)
            
            # Sample depth at projected position
            sampled_depth = depth_map[v_int, u_int]  # (H, W)
            
            # Current ray depth
            ray_depth = Z  # (H, W)
            
            # Occlusion test: if ray depth > scene depth + bias, pixel is occluded
            occluded = ray_depth > (sampled_depth + bias)
            
            # Update shadow mask (once occluded, stays occluded)
            if soft_shadow:
                # Accumulate occlusion (soft shadows)
                occlusion_strength = occluded.float() * (1.0 / max_steps)
                shadow_mask = shadow_mask - occlusion_strength
            else:
                # Binary occlusion (hard shadows)
                shadow_mask = torch.where(occluded, 
                                         torch.zeros_like(shadow_mask), 
                                         shadow_mask)
        
        # Clamp to [0, 1] range
        shadow_mask = torch.clamp(shadow_mask, 0.0, 1.0)
        
        return shadow_mask
    
    def generate_light_map(self,
                          intensity_diffuse: torch.Tensor,
                          shadow_mask: torch.Tensor,
                          light_color: Union[list, np.ndarray, torch.Tensor] = None,
                          intensity_specular: Optional[torch.Tensor] = None,
                          ambient_term: float = 0.1) -> torch.Tensor:
        """
        F9: Final Light Map Generation - Combines diffuse, specular, shadows, and color.
        
        This function produces the final lighting map by compositing:
        - Diffuse illumination (Lambertian shading)
        - Specular highlights (optional)
        - Shadow occlusion
        - Light color tinting
        - Ambient lighting (prevents pure black shadows)
        
        Args:
            intensity_diffuse: (H, W) diffuse intensity from F7
            shadow_mask: (H, W) shadow factor [0=shadow, 1=lit] from F8
            light_color: (3,) or (1, 1, 3) RGB color [0-1]. Default: white (1, 1, 1)
            intensity_specular: (H, W) optional specular intensity
            ambient_term: Minimum ambient lighting (prevents pure black)
            
        Returns:
            light_map: (H, W, 3) final RGB light map
            
        Mathematical Formula:
        L_map = [(I_diffuse + I_specular) × shadow_mask + ambient] × Color_light
        
        Where:
        - I_diffuse: Lambertian term (N · L) with attenuation
        - I_specular: Blinn-Phong specular highlights (optional)
        - shadow_mask: Binary or soft shadow occlusion [0, 1]
        - ambient: Minimum baseline illumination
        - Color_light: RGB tint of the light source
        
        Physical Interpretation:
        1. Combine diffuse + specular (total surface response)
        2. Multiply by shadow mask (occlude light where blocked)
        3. Add ambient term (simulate indirect/scattered light)
        4. Apply light color (tint the illumination)
        """
        # Set default light color (white)
        if light_color is None:
            light_color = [1.0, 1.0, 1.0]
        
        # Convert light color to tensor
        if isinstance(light_color, (list, np.ndarray)):
            light_color = torch.tensor(light_color, dtype=torch.float32)
        light_color = light_color.to(self.device)
        
        # Ensure light_color has shape (1, 1, 3) for broadcasting
        if light_color.dim() == 1:
            light_color = light_color.view(1, 1, 3)
        
        # Combine diffuse and specular
        if intensity_specular is not None:
            total_intensity = intensity_diffuse + intensity_specular
        else:
            total_intensity = intensity_diffuse

        # total_intensity = intensity_diffuse
        
        # Apply shadow mask (modulate by occlusion)
        # Shadow mask: 1 = fully lit, 0 = fully shadowed
        lit_intensity = total_intensity * (1-shadow_mask)
        
        # Add ambient term (prevents pure black in shadows)
        # This simulates indirect illumination and scattered light
        final_intensity = lit_intensity + ambient_term
        
        # Clamp to reasonable range [0, 1+ambient]
        final_intensity = torch.clamp(final_intensity, 0.0, 1.0 + ambient_term)
        
        # Apply light color (RGB tinting)
        # Broadcast: (H, W) × (1, 1, 3) → (H, W, 3)
        light_map = final_intensity.unsqueeze(-1) * light_color
        
        # Final clamp to [0, 1] for valid RGB values
        light_map = torch.clamp(light_map, 0.0, 1.0)
        
        return light_map


    def create_view_directions(point_cloud: torch.Tensor,
                            camera_position: Union[np.ndarray, torch.Tensor, list],
                            device: torch.device) -> torch.Tensor:
        """
        Helper function to compute view directions for specular calculations.
        
        Args:
            point_cloud: (H, W, 3) 3D points
            camera_position: (3,) camera position in world space
            device: torch device
            
        Returns:
            view_dirs: (H, W, 3) normalized view directions
        """
        if isinstance(camera_position, (list, np.ndarray)):
            camera_position = torch.tensor(camera_position, dtype=torch.float32)
        camera_position = camera_position.to(device)
        
        if camera_position.dim() == 1:
            camera_position = camera_position.view(1, 1, 3)
        
        view_vectors = camera_position - point_cloud
        view_dirs = view_vectors / (torch.norm(view_vectors, dim=-1, keepdim=True) + 1e-8)
        
        return view_dirs


    def relight_image_pipeline(
        rgb_image: Optional[Union[np.ndarray, torch.Tensor]],
        normal_map: Union[np.ndarray, torch.Tensor],
        depth_map: Union[np.ndarray, torch.Tensor],
        albedo_map: Optional[Union[np.ndarray, torch.Tensor]],
        light_position: Union[list, np.ndarray, torch.Tensor],
        light_color: Union[list, np.ndarray, torch.Tensor] = None,
        camera_intrinsics: Optional[Dict] = None,
        use_gpu: bool = True,
        include_shadows: bool = True,
        shadow_params: Optional[Dict] = None,
        light_intensity: float = 1.0,
        ambient_term: float = 0.1
    ) -> Dict[str, Union[torch.Tensor, np.ndarray]]:
        """
        Complete relighting pipeline integrating all stages.
        
        STAGE 1: 3D Inference (Assumes already computed - inputs provided)
            - F1: Depth Map Estimation (depth_map)
            - F2: Surface Normal Estimation (normal_map)
            - F3: Albedo Map Extraction (albedo_map)
        
        STAGE 2: User Input & Light Placement
            - F5: Depth → 3D Point Cloud (P)
            - User specifies light_position (3D coordinates)
        
        STAGE 3: Physics Engine (Illumination)
            - F7: Compute diffuse lighting intensity
            - F8: Screen-Space Ray Marching for shadows
            - F9: Final light map generation
        
        STAGE 4: Generative Synthesis (Placeholder)
            - Returns prepared inputs for IC-Light or similar models
        
        Args:
            rgb_image: (H, W, 3) original RGB image
            normal_map: (H, W, 3) surface normals from DSINE or similar
            depth_map: (H, W) depth values from Depth-Anything or similar
            albedo_map: (H, W, 3) albedo/base color (optional)
            light_position: (3,) 3D light position [x, y, z]
            light_color: (3,) RGB light color [0-1], default white
            camera_intrinsics: Camera parameters dict {'fx', 'fy', 'cx', 'cy'}
            use_gpu: Whether to use GPU acceleration
            include_shadows: Whether to compute shadows (F8)
            shadow_params: Shadow parameters dict (max_steps, step_size, bias, soft_shadow)
            light_intensity: Light intensity multiplier
            ambient_term: Ambient lighting term
        
        Returns:
            results: Dictionary containing:
                - 'light_map': (H, W, 3) Final RGB light map
                - 'intensity_diffuse': (H, W) Diffuse intensity
                - 'shadow_mask': (H, W) Shadow occlusion mask (if computed)
                - 'point_cloud': (H, W, 3) 3D point cloud
                - 'albedo_map': (H, W, 3) Albedo map (for Stage 4)
                - 'rgb_image': (H, W, 3) Original image (for Stage 4)
                - 'stage4_inputs': Dict with inputs ready for IC-Light
        """
        
        print("="*80)
        print("RELIGHTING PIPELINE - COMPLETE STAGES 1-3")
        print("="*80)
        
        # Initialize calculator
        calculator = LightingCalculator(
            use_gpu=use_gpu,
            light_intensity=light_intensity
        )
        
        # ========================================================================
        # STAGE 2 & 3: User Input + Physics Engine
        # ========================================================================
        
        print("\n[STAGE 2] User Input & 3D Reconstruction")
        print(f"Light position: {light_position}")
        
        # F7: Compute lighting intensity (includes F5: depth→pointcloud)
        print("\n[STAGE 3] Physics Engine - Computing Illumination")
        intensity_diffuse, components = calculator.compute_lighting_intensity(
            normal_map=normal_map,
            depth_map=depth_map,
            light_position=light_position,
            camera_intrinsics=camera_intrinsics,
            return_components=True
        )
        
        # Extract components
        point_cloud = components['point_cloud']
        fx, fy = components['fx'], components['fy']
        cx, cy = components['cx'], components['cy']
        
        u = light_position[0]
        v = light_position[1]
        d = light_position[2]

        X = (u - cx) * d / fx
        Y = (v - cy) * d / fy
        Z = d

        light_position = [X, Y, Z]   

        # F8: Shadow casting (optional)
        if include_shadows:
            print("\n[F8] Computing Shadow Mask via Screen-Space Ray Marching...")
            
            # Set default shadow parameters
            if shadow_params is None:
                shadow_params = {
                    'max_steps': 50,
                    'step_size': 0.05,
                    'bias': 0.01,
                    'soft_shadow': True
                }
            
            shadow_mask = calculator.generate_shadow_mask(
                depth_map=components['point_cloud'][..., 2],  # Z-depth
                point_cloud=point_cloud,
                light_position=light_position,
                fx=fx, fy=fy, cx=cx, cy=cy,
                **shadow_params
            )
        else:
            # No shadows - all pixels fully lit
            H, W = intensity_diffuse.shape
            shadow_mask = torch.ones((H, W), device=calculator.device, dtype=torch.float32)
            print("\n[F8] Skipping shadow computation (include_shadows=False)")
        
        # F9: Generate final light map
        print("\n[F9] Generating Final Light Map...")
        light_map = calculator.generate_light_map(
            intensity_diffuse=intensity_diffuse,
            shadow_mask=shadow_mask,
            light_color=light_color,
            intensity_specular=None,  # Can add specular later
            ambient_term=ambient_term
        )
        # ========================================================================
        
        # Compile results
        results = {
            'light_map': light_map,
            'intensity_diffuse': intensity_diffuse,
            'shadow_mask': shadow_mask,
            'point_cloud': point_cloud,
            'albedo_map': albedo_map,
            'components': components  # All intermediate results
        }
        
        print("\n" + "="*80)
        print("✓ Pipeline Complete - Ready for Stage 4 (Generative Synthesis)")
        print("="*80)
        print(f"\nOutput shapes:")
        print(f"  - Light Map: {light_map.shape}")
        print(f"  - Shadow Mask: {shadow_mask.shape}")
        print(f"  - Point Cloud: {point_cloud.shape}")
        
        return results


# Example usage with real data files
if __name__ == "__main__":
    """
    Example demonstrating the complete pipeline with F8 and F9 using real data.
    Loads depth map (.npy), normal map (.npy), and RGB image (.jpg) from files.
    """
    import matplotlib.pyplot as plt
    import os
    from PIL import Image
    
    # ========================================================================
    # CONFIGURATION - Update these paths to your actual files
    # ========================================================================
    
    # File paths (update these to match your files)
    DEPTH_MAP_PATH = "depth_test_output.npy"        # Depth map .npy file
    NORMAL_MAP_PATH = "normals_output.npy"      # Normal map .npy file
    RGB_IMAGE_PATH = "scene.jpg"      # Input RGB image .jpg
    ALBEDO_MAP_PATH = None                  # Optional: "albedo_map.npy" or None
    
    # Light parameters
    LIGHT_POSITION = [1, -1, 2]            # [x, y, z] 3D coordinates
    LIGHT_COLOR = [1.0, 0.9, 0.8]           # RGB [0-1], warm white
    LIGHT_INTENSITY = 1.0                   # Brightness multiplier
    AMBIENT_TERM = 0.1                      # Ambient lighting
    
    # Shadow parameters
    ENABLE_SHADOWS = True
    SHADOW_PARAMS = {
        'max_steps': 50,                    # Ray marching steps
        'step_size': 0.05,                  # Step size fraction
        'bias': 0.02,                       # Self-shadow prevention
        'soft_shadow': True                 # Soft vs hard shadows
    }
    
    # Camera intrinsics (None = auto-compute from image size)
    CAMERA_INTRINSICS = None
    
    # ========================================================================
    # LOAD DATA FROM FILES
    # ========================================================================
    
    print("="*80)
    print("LOADING DATA FROM FILES")
    print("="*80)
    
    # Load depth map
    if not os.path.exists(DEPTH_MAP_PATH):
        raise FileNotFoundError(f"Depth map not found: {DEPTH_MAP_PATH}")
    
    depth_map = np.load(DEPTH_MAP_PATH)
    print(f"✓ Loaded depth map: {DEPTH_MAP_PATH}")
    print(f"  Shape: {depth_map.shape}, Range: [{depth_map.min():.3f}, {depth_map.max():.3f}]")
    
    # Load normal map
    if not os.path.exists(NORMAL_MAP_PATH):
        raise FileNotFoundError(f"Normal map not found: {NORMAL_MAP_PATH}")
    
    normal_map = np.load(NORMAL_MAP_PATH)
    print(f"✓ Loaded normal map: {NORMAL_MAP_PATH}")
    print(f"  Shape: {normal_map.shape}, Range: [{normal_map.min():.3f}, {normal_map.max():.3f}]")
    
    # Load RGB image
    if not os.path.exists(RGB_IMAGE_PATH):
        raise FileNotFoundError(f"RGB image not found: {RGB_IMAGE_PATH}")
    
    rgb_image_pil = Image.open(RGB_IMAGE_PATH).convert('RGB')
    rgb_image = np.array(rgb_image_pil).astype(np.float32) / 255.0  # Normalize to [0, 1]
    print(f"✓ Loaded RGB image: {RGB_IMAGE_PATH}")
    print(f"  Shape: {rgb_image.shape}, Range: [{rgb_image.min():.3f}, {rgb_image.max():.3f}]")
    
    # Load albedo map (optional)
    if ALBEDO_MAP_PATH is not None and os.path.exists(ALBEDO_MAP_PATH):
        albedo_map = np.load(ALBEDO_MAP_PATH)
        print(f"✓ Loaded albedo map: {ALBEDO_MAP_PATH}")
        print(f"  Shape: {albedo_map.shape}")
    else:
        # Use RGB image as fallback albedo
        albedo_map = rgb_image.copy()
        print(f"⚠ No albedo map provided, using RGB image as albedo")
    
    # ========================================================================
    # VALIDATE DATA SHAPES
    # ========================================================================
    
    H, W = rgb_image.shape[:2]
    print(f"\nImage dimensions: {H}x{W}")
    
    # Check depth map shape
    if depth_map.shape != (H, W):
        raise ValueError(f"Depth map shape {depth_map.shape} doesn't match image {(H, W)}")
    
    # Check normal map shape
    if normal_map.shape != (H, W, 3):
        raise ValueError(f"Normal map shape {normal_map.shape} doesn't match expected {(H, W, 3)}")
    
    # Check albedo map shape
    if albedo_map.shape != (H, W, 3):
        raise ValueError(f"Albedo map shape {albedo_map.shape} doesn't match expected {(H, W, 3)}")
    
    # Ensure normals are in [-1, 1] range
    if normal_map.min() >= 0:
        print("⚠ Normal map appears to be in [0, 1] range, converting to [-1, 1]")
        normal_map = normal_map * 2.0 - 1.0
    
    print("✓ All data shapes validated")
    
    # ========================================================================
    # RUN COMPLETE PIPELINE
    # ========================================================================
    
    print("\n" + "="*80)
    print("RUNNING COMPLETE PIPELINE WITH F8 (SHADOWS) AND F9 (LIGHT MAP)")
    print("="*80)
    print(f"Light position: {LIGHT_POSITION}")
    print(f"Light color: {LIGHT_COLOR}")
    print(f"Light intensity: {LIGHT_INTENSITY}")
    print(f"Ambient term: {AMBIENT_TERM}")
    print(f"Shadows enabled: {ENABLE_SHADOWS}")
    print("="*80)
    
    import time
    start_time = time.time()
    
    # Run pipeline
    results = relight_image_pipeline(
        rgb_image=rgb_image,
        normal_map=normal_map,
        depth_map=depth_map,
        albedo_map=albedo_map,
        light_position=LIGHT_POSITION,
        light_color=LIGHT_COLOR,
        camera_intrinsics=CAMERA_INTRINSICS,
        use_gpu=torch.cuda.is_available(),
        include_shadows=ENABLE_SHADOWS,
        shadow_params=SHADOW_PARAMS,
        light_intensity=LIGHT_INTENSITY,
        ambient_term=AMBIENT_TERM
    )
    
    elapsed = (time.time() - start_time) * 1000
    print(f"\n✓ Total pipeline time: {elapsed:.2f}ms")
    
    # ========================================================================
    # VISUALIZE RESULTS
    # ========================================================================
    
    print("\n" + "="*80)
    print("GENERATING VISUALIZATIONS")
    print("="*80)
    
    fig, axes = plt.subplots(3, 3, figsize=(18, 18))
    
    # Convert tensors to numpy for plotting
    if isinstance(results['intensity_diffuse'], torch.Tensor):
        intensity_np = results['intensity_diffuse'].cpu().numpy()
    else:
        intensity_np = results['intensity_diffuse']
    
    if isinstance(results['shadow_mask'], torch.Tensor):
        shadow_np = results['shadow_mask'].cpu().numpy()
    else:
        shadow_np = results['shadow_mask']
    
    if isinstance(results['light_map'], torch.Tensor):
        light_map_np = results['light_map'].cpu().numpy()
    else:
        light_map_np = results['light_map']
    
    # Visualize normal map (convert from [-1,1] to [0,1] for RGB display)
    normal_viz = (normal_map + 1) / 2
    normal_viz = np.clip(normal_viz, 0, 1)
    print("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    print("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    # Row 1: Input data
    axes[0, 0].imshow(rgb_image)
    axes[0, 0].set_title('Original RGB Image', fontsize=14, fontweight='bold')
    axes[0, 0].axis('off')
    
    axes[0, 1].imshow(depth_map, cmap='viridis')
    axes[0, 1].set_title('Depth Map (Input)', fontsize=14, fontweight='bold')
    axes[0, 1].axis('off')
    cbar1 = plt.colorbar(axes[0, 1].images[0], ax=axes[0, 1], fraction=0.046)
    cbar1.set_label('Depth (units)', rotation=270, labelpad=20)
    
    axes[0, 2].imshow(normal_viz)
    axes[0, 2].set_title('Normal Map (Input)', fontsize=14, fontweight='bold')
    axes[0, 2].axis('off')
    
    # Row 2: Intermediate results
    axes[1, 0].imshow(intensity_np, cmap='hot')
    axes[1, 0].set_title('F7: Diffuse Intensity', fontsize=14, fontweight='bold')
    axes[1, 0].axis('off')
    cbar2 = plt.colorbar(axes[1, 0].images[0], ax=axes[1, 0], fraction=0.046)
    cbar2.set_label('Intensity', rotation=270, labelpad=20)
    
    axes[1, 1].imshow(shadow_np, cmap='gray')
    axes[1, 1].set_title('F8: Shadow Mask', fontsize=14, fontweight='bold')
    axes[1, 1].axis('off')
    cbar3 = plt.colorbar(axes[1, 1].images[0], ax=axes[1, 1], fraction=0.046)
    cbar3.set_label('Shadow [0=dark, 1=lit]', rotation=270, labelpad=20)
    
    axes[1, 2].imshow(light_map_np)
    axes[1, 2].set_title('F9: Final Light Map (RGB)', fontsize=14, fontweight='bold')
    axes[1, 2].axis('off')
    
    # Row 3: Light map channels
    axes[2, 0].imshow(light_map_np[..., 0], cmap='Reds')
    axes[2, 0].set_title('Light Map - Red Channel', fontsize=12)
    axes[2, 0].axis('off')
    
    axes[2, 1].imshow(light_map_np[..., 1], cmap='Greens')
    axes[2, 1].set_title('Light Map - Green Channel', fontsize=12)
    axes[2, 1].axis('off')
    
    axes[2, 2].imshow(light_map_np[..., 2], cmap='Blues')
    axes[2, 2].set_title('Light Map - Blue Channel', fontsize=12)
    axes[2, 2].axis('off')
    
    plt.tight_layout()
    output_path = 'complete_pipeline_visualization.png'
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"✓ Visualization saved to '{output_path}'")
    
    # ========================================================================
    # SAVE OUTPUT FILES
    # ========================================================================
    
    print("\n" + "="*80)
    print("SAVING OUTPUT FILES")
    print("="*80)
    
    # Save light map as .npy
    light_map_output_path = 'light_map_output.npy'
    np.save(light_map_output_path, light_map_np)
    print(f"✓ Saved light map (numpy): {light_map_output_path}")
    
    # Save light map as .jpg (for visualization)
    light_map_jpg = (light_map_np * 255).astype(np.uint8)
    light_map_pil = Image.fromarray(light_map_jpg)
    light_map_jpg_path = 'light_map_output.jpg'
    light_map_pil.save(light_map_jpg_path, quality=95)
    print(f"✓ Saved light map (JPEG): {light_map_jpg_path}")
    
    # Save shadow mask
    shadow_output_path = 'shadow_mask_output.npy'
    np.save(shadow_output_path, shadow_np)
    print(f"✓ Saved shadow mask: {shadow_output_path}")
    
    # Save shadow mask as .jpg (for visualization)
    shadow_jpg = (shadow_np * 255).astype(np.uint8)
    shadow_pil = Image.fromarray(shadow_jpg, mode='L')
    shadow_jpg_path = 'shadow_mask_output.jpg'
    shadow_pil.save(shadow_jpg_path, quality=95)
    print(f"✓ Saved shadow mask (JPEG): {shadow_jpg_path}")
    
    # ========================================================================
    # PRINT STATISTICS
    # ========================================================================
    
    print("\n" + "="*80)
    print("STATISTICS")
    print("="*80)
    print(f"Input image size: {H}x{W}")
    print(f"Processing time: {elapsed:.2f}ms")
    print(f"\nDepth Map:")
    print(f"  Range: [{depth_map.min():.3f}, {depth_map.max():.3f}] units")
    print(f"  Mean: {depth_map.mean():.3f} units")
    print(f"\nNormal Map:")
    print(f"  Range: [{normal_map.min():.3f}, {normal_map.max():.3f}]")
    print(f"\nDiffuse Intensity:")
    print(f"  Range: [{intensity_np.min():.3f}, {intensity_np.max():.3f}]")
    print(f"  Mean: {intensity_np.mean():.3f}")
    print(f"\nShadow Mask:")
    print(f"  Range: [{shadow_np.min():.3f}, {shadow_np.max():.3f}]")
    print(f"  Mean: {shadow_np.mean():.3f}")
    print(f"  Shadow coverage: {(1 - shadow_np.mean())*100:.1f}% of pixels in shadow")
    print(f"\nLight Map (RGB):")
    print(f"  Range: [{light_map_np.min():.3f}, {light_map_np.max():.3f}]")
    print(f"  Mean per channel: R={light_map_np[...,0].mean():.3f}, "
          f"G={light_map_np[...,1].mean():.3f}, B={light_map_np[...,2].mean():.3f}")
    print("="*80)
    
    # ========================================================================
    # PREPARE STAGE 4 INPUTS
    # ========================================================================
    
    print("\n" + "="*80)
    print("STAGE 4 INPUTS (for IC-Light or similar)")
    print("="*80)
    
    stage4_inputs = results['stage4_inputs']
    print("Available inputs:")
    for key, value in stage4_inputs.items():
        if isinstance(value, np.ndarray):
            print(f"  - {key}: shape {value.shape}, dtype {value.dtype}")
        else:
            print(f"  - {key}: {value}")
    
    print("\nThese can be passed to a generative model like IC-Light for final relighting.")
    print("="*80)
    
    print("\n✓ Pipeline complete! Check the output files and visualization.")


# ============================================================================
# ALTERNATIVE: Load from custom paths
# ============================================================================

def load_and_run_pipeline(depth_path, normal_path, image_path, 
                         albedo_path=None, light_pos=None, 
                         light_color=None, **kwargs):
    """
    Convenience function to load data from custom paths and run pipeline.
    
    Args:
        depth_path: Path to depth map .npy file
        normal_path: Path to normal map .npy file
        image_path: Path to RGB image .jpg/.png file
        albedo_path: Optional path to albedo map .npy file
        light_pos: Light position [x, y, z], default [-1, -1, 2]
        light_color: Light color [R, G, B], default [1.0, 0.9, 0.8]
        **kwargs: Additional arguments for relight_image_pipeline()
    
    Returns:
        results: Dictionary with all pipeline outputs
    """
    # Load data
    depth_map = np.load(depth_path)
    normal_map = np.load(normal_path)
    
    rgb_image_pil = Image.open(image_path).convert('RGB')
    rgb_image = np.array(rgb_image_pil).astype(np.float32) / 255.0
    
    if albedo_path is not None:
        albedo_map = np.load(albedo_path)
    else:
        albedo_map = rgb_image.copy()
    
    # Set defaults
    if light_pos is None:
        light_pos = [-1, -1, 2]
    if light_color is None:
        light_color = [1.0, 0.9, 0.8]
    
    # Ensure normal map is in [-1, 1] range
    if normal_map.min() >= 0:
        normal_map = normal_map * 2.0 - 1.0
    
    # Run pipeline
    results = relight_image_pipeline(
        rgb_image=rgb_image,
        normal_map=normal_map,
        depth_map=depth_map,
        albedo_map=albedo_map,
        light_position=light_pos,
        light_color=light_color,
        **kwargs
    )
    
    return results


# ============================================================================
# USAGE EXAMPLES
# ============================================================================

"""
Example 1: Basic usage with default settings
-----------------------------------------------
python lighting_calculator_complete.py

This will look for:
- depth_map.npy
- normal_map.npy  
- input_image.jpg

in the current directory.


Example 2: Custom paths (programmatic)
---------------------------------------
from lighting_calculator_complete import load_and_run_pipeline

results = load_and_run_pipeline(
    depth_path="data/my_depth.npy",
    normal_path="data/my_normals.npy",
    image_path="data/my_image.jpg",
    light_pos=[2, -3, 5],
    light_color=[1.0, 0.8, 0.6],
    include_shadows=True,
    shadow_params={'max_steps': 60, 'soft_shadow': True}
)

light_map = results['light_map']
shadow_mask = results['shadow_mask']


Example 3: Batch processing multiple images
--------------------------------------------
import glob

image_files = glob.glob("input_images/*.jpg")

for img_path in image_files:
    base_name = os.path.splitext(os.path.basename(img_path))[0]
    depth_path = f"depth_maps/{base_name}_depth.npy"
    normal_path = f"normal_maps/{base_name}_normals.npy"
    
    if os.path.exists(depth_path) and os.path.exists(normal_path):
        results = load_and_run_pipeline(
            depth_path=depth_path,
            normal_path=normal_path,
            image_path=img_path,
            light_pos=[-1, -2, 3],
            include_shadows=True
        )
        
        # Save outputs
        np.save(f"outputs/{base_name}_lightmap.npy", 
                results['light_map'].cpu().numpy())


Example 4: Different lighting scenarios
----------------------------------------
# Scenario 1: Bright overhead light
results_overhead = load_and_run_pipeline(
    depth_path="depth.npy",
    normal_path="normals.npy",
    image_path="image.jpg",
    light_pos=[0, 0, 5],
    light_color=[1.0, 1.0, 1.0],
    light_intensity=1.5,
    ambient_term=0.2
)

# Scenario 2: Warm side lighting (sunset effect)
results_sunset = load_and_run_pipeline(
    depth_path="depth.npy",
    normal_path="normals.npy",
    image_path="image.jpg",
    light_pos=[-3, 0, 2],
    light_color=[1.0, 0.7, 0.4],
    light_intensity=1.2,
    ambient_term=0.15
)

# Scenario 3: Cool moonlight
results_moonlight = load_and_run_pipeline(
    depth_path="depth.npy",
    normal_path="normals.npy",
    image_path="image.jpg",
    light_pos=[2, -2, 4],
    light_color=[0.6, 0.7, 1.0],
    light_intensity=0.8,
    ambient_term=0.1
)
"""