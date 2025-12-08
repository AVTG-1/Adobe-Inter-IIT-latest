"""
IC-Light Core Module
Pure Python implementation for relighting images using IC-Light model.
No GUI dependencies - only torch, diffusers, transformers, and related libraries.
"""

import os
import math
import numpy as np
import torch
import safetensors.torch as sf
from PIL import Image
from typing import Optional, Tuple, List
from enum import Enum

from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline
from diffusers import AutoencoderKL, UNet2DConditionModel, DDIMScheduler, EulerAncestralDiscreteScheduler, DPMSolverMultistepScheduler
from diffusers.models.attention_processor import AttnProcessor2_0
from transformers import CLIPTextModel, CLIPTokenizer
from torch.hub import download_url_to_file


class LightDirection(Enum):
    """Light map directions for relighting"""
    NONE = "none"
    LEFT = "left"
    RIGHT = "right"
    TOP = "top"
    BOTTOM = "bottom"


class ICLightModel:
    """
    IC-Light model wrapper for image relighting.
    Handles model loading, preprocessing, and inference.
    """
    
    def __init__(
        self,
        base_model: str = 'runwayml/stable-diffusion-v1-5',
        ic_model_path: str = './models/iclight_sd15_fc.safetensors',
        device: str = 'cuda',
        dtype_unet: torch.dtype = torch.float16,
        dtype_vae: torch.dtype = torch.bfloat16,
    ):
        """
        Initialize IC-Light model.
        
        Args:
            base_model: HuggingFace model ID for SD 1.5 base model
            ic_model_path: Path to IC-Light weights (.safetensors)
            device: Device to run on ('cuda' or 'cpu')
            dtype_unet: Data type for UNet (default: float16)
            dtype_vae: Data type for VAE (default: bfloat16)
        """
        self.device = torch.device(device)
        self.dtype_unet = dtype_unet
        self.dtype_vae = dtype_vae
        
        print(f"Loading IC-Light model on {device}...")
        
        # Load base SD 1.5 components
        print("Loading tokenizer and text encoder...")
        self.tokenizer = CLIPTokenizer.from_pretrained(base_model, subfolder="tokenizer")
        self.text_encoder = CLIPTextModel.from_pretrained(base_model, subfolder="text_encoder")
        
        print("Loading VAE...")
        self.vae = AutoencoderKL.from_pretrained(base_model, subfolder="vae")
        
        print("Loading UNet...")
        self.unet = UNet2DConditionModel.from_pretrained(base_model, subfolder="unet")
        
        # Modify UNet for IC-Light (8 input channels instead of 4) 
        self._modify_unet_for_iclight()
        
        # Load IC-Light weights
        self._load_iclight_weights(ic_model_path)
        
        # Move models to device
        print("Moving models to device...")
        self.text_encoder = self.text_encoder.to(device=self.device, dtype=self.dtype_unet)
        self.vae = self.vae.to(device=self.device, dtype=self.dtype_vae)
        self.unet = self.unet.to(device=self.device, dtype=self.dtype_unet)
        
        # Set attention processors for efficiency
        self.unet.set_attn_processor(AttnProcessor2_0())
        self.vae.set_attn_processor(AttnProcessor2_0())
        
        # Initialize schedulers
        self._init_schedulers()
        
        # Create pipelines
        self._create_pipelines()
        
        print("IC-Light model loaded successfully!")
    
    def _modify_unet_for_iclight(self):
        """Modify UNet to accept 8-channel input (4 for image + 4 for foreground condition)"""
        with torch.no_grad():
            # Create new conv_in layer with 8 input channels
            new_conv_in = torch.nn.Conv2d(
                8, 
                self.unet.conv_in.out_channels,
                self.unet.conv_in.kernel_size,
                self.unet.conv_in.stride,
                self.unet.conv_in.padding
            )
            
            # Initialize: copy original 4-channel weights, zero the rest
            new_conv_in.weight.zero_()
            new_conv_in.weight[:, :4, :, :].copy_(self.unet.conv_in.weight)
            new_conv_in.bias = self.unet.conv_in.bias
            
            self.unet.conv_in = new_conv_in
        
        # Hook the forward pass to concatenate conditions
        self.unet_original_forward = self.unet.forward
        
        def hooked_unet_forward(sample, timestep, encoder_hidden_states, **kwargs):
            c_concat = kwargs['cross_attention_kwargs']['concat_conds'].to(sample)
            c_concat = torch.cat([c_concat] * (sample.shape[0] // c_concat.shape[0]), dim=0)
            new_sample = torch.cat([sample, c_concat], dim=1)
            kwargs['cross_attention_kwargs'] = {}
            return self.unet_original_forward(new_sample, timestep, encoder_hidden_states, **kwargs)
        
        self.unet.forward = hooked_unet_forward
    
    def _load_iclight_weights(self, model_path: str):
        """Load IC-Light model weights (offset from base SD 1.5)"""
        # Download if not exists
        if not os.path.exists(model_path):
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            print(f"Downloading IC-Light weights to {model_path}...")
            download_url_to_file(
                url='https://huggingface.co/lllyasviel/ic-light/resolve/main/iclight_sd15_fc.safetensors',
                dst=model_path
            )
        
        print("Loading IC-Light weights...")
        sd_offset = sf.load_file(model_path)
        sd_origin = self.unet.state_dict()
        
        # Merge: origin + offset
        sd_merged = {k: sd_origin[k] + sd_offset[k] for k in sd_origin.keys()}
        self.unet.load_state_dict(sd_merged, strict=True)
        
        del sd_offset, sd_origin, sd_merged
        # sd_offset = sf.load_file(model_path)
        # sd_origin = self.unet.state_dict()
        
        # # === MODIFICATION FOR STABLE MERGING ===
        # # Convert origin state dict to a higher precision (float32) for the addition.
        # # The offset tensors are typically float32 or float16/bfloat16.
        # # Performing the addition in float32 ensures maximum precision.
        # sd_merged = {}
        # for k in sd_origin.keys():
        #     # Ensure addition is done in float32 for stability
        #     merged_tensor = sd_origin[k].float() + sd_offset[k].float()
        #     # Cast the result back to the target UNet dtype for loading
        #     sd_merged[k] = merged_tensor.to(self.dtype_unet)
    
        # self.unet.load_state_dict(sd_merged, strict=True)
        
        # del sd_offset, sd_origin, sd_merged
    
    def _init_schedulers(self):
        """Initialize different samplers/schedulers"""
        self.ddim_scheduler = DDIMScheduler(
            num_train_timesteps=1000,
            beta_start=0.00085,
            beta_end=0.012,
            beta_schedule="scaled_linear",
            clip_sample=False,
            set_alpha_to_one=False,
            steps_offset=1,
        )
        
        self.euler_a_scheduler = EulerAncestralDiscreteScheduler(
            num_train_timesteps=1000,
            beta_start=0.00085,
            beta_end=0.012,
            steps_offset=1
        )
        
        self.dpmpp_scheduler = DPMSolverMultistepScheduler(
            num_train_timesteps=1000,
            beta_start=0.00085,
            beta_end=0.012,
            algorithm_type="sde-dpmsolver++",
            use_karras_sigmas=True,
            steps_offset=1
        )
    
    def _create_pipelines(self):
        """Create text-to-image and image-to-image pipelines"""
        self.t2i_pipe = StableDiffusionPipeline(
            vae=self.vae,
            text_encoder=self.text_encoder,
            tokenizer=self.tokenizer,
            unet=self.unet,
            scheduler=self.dpmpp_scheduler,
            safety_checker=None,
            requires_safety_checker=False,
            feature_extractor=None,
            image_encoder=None
        )
        
        self.i2i_pipe = StableDiffusionImg2ImgPipeline(
            vae=self.vae,
            text_encoder=self.text_encoder,
            tokenizer=self.tokenizer,
            unet=self.unet,
            scheduler=self.dpmpp_scheduler,
            safety_checker=None,
            requires_safety_checker=False,
            feature_extractor=None,
            image_encoder=None
        )
    
    @torch.inference_mode()
    def encode_prompt(self, prompt: str) -> torch.Tensor:
        """Encode a text prompt into embeddings"""
        max_length = self.tokenizer.model_max_length
        chunk_length = self.tokenizer.model_max_length - 2
        id_start = self.tokenizer.bos_token_id
        id_end = self.tokenizer.eos_token_id
        id_pad = id_end
        
        def pad(x, p, i):
            return x[:i] if len(x) >= i else x + [p] * (i - len(x))
        
        tokens = self.tokenizer(prompt, truncation=False, add_special_tokens=False)["input_ids"]
        chunks = [[id_start] + tokens[i: i + chunk_length] + [id_end] 
                  for i in range(0, len(tokens), chunk_length)]
        chunks = [pad(ck, id_pad, max_length) for ck in chunks]
        
        token_ids = torch.tensor(chunks).to(device=self.device, dtype=torch.int64)
        conds = self.text_encoder(token_ids).last_hidden_state
        
        return conds
    
    @torch.inference_mode()
    def encode_prompt_pair(
        self,
        positive_prompt: str,
        negative_prompt: str
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        """Encode positive and negative prompts, matching their lengths"""
        c = self.encode_prompt(positive_prompt)
        uc = self.encode_prompt(negative_prompt)
        
        c_len = float(len(c))
        uc_len = float(len(uc))
        max_count = max(c_len, uc_len)
        c_repeat = int(math.ceil(max_count / c_len))
        uc_repeat = int(math.ceil(max_count / uc_len))
        max_chunk = max(len(c), len(uc))
        
        c = torch.cat([c] * c_repeat, dim=0)[:max_chunk]
        uc = torch.cat([uc] * uc_repeat, dim=0)[:max_chunk]
        
        c = torch.cat([p[None, ...] for p in c], dim=1)
        uc = torch.cat([p[None, ...] for p in uc], dim=1)
        
        return c, uc
    
    @staticmethod
    def resize_and_center_crop(
        image: np.ndarray,
        target_width: int,
        target_height: int
    ) -> np.ndarray:
        """Resize and center crop an image to target dimensions"""
        pil_image = Image.fromarray(image)
        original_width, original_height = pil_image.size
        
        scale_factor = max(target_width / original_width, target_height / original_height)
        resized_width = int(round(original_width * scale_factor))
        resized_height = int(round(original_height * scale_factor))
        
        resized_image = pil_image.resize((resized_width, resized_height), Image.LANCZOS)
        
        left = (resized_width - target_width) / 2
        top = (resized_height - target_height) / 2
        right = (resized_width + target_width) / 2
        bottom = (resized_height + target_height) / 2
        
        cropped_image = resized_image.crop((left, top, right, bottom))
        return np.array(cropped_image)
    
    @staticmethod
    def resize_without_crop(
        image: np.ndarray,
        target_width: int,
        target_height: int
    ) -> np.ndarray:
        """Resize image without cropping"""
        pil_image = Image.fromarray(image)
        resized_image = pil_image.resize((target_width, target_height), Image.LANCZOS)
        return np.array(resized_image)
    
    @staticmethod
    def numpy2pytorch(imgs: List[np.ndarray]) -> torch.Tensor:
        """Convert numpy images to PyTorch tensor"""
        h = torch.from_numpy(np.stack(imgs, axis=0)).float() / 127.0 - 1.0
        h = h.movedim(-1, 1)
        return h
    
    @staticmethod
    def pytorch2numpy(imgs: torch.Tensor, quant: bool = True) -> List[np.ndarray]:
        """Convert PyTorch tensor to numpy images"""
        results = []
        for x in imgs:
            y = x.movedim(0, -1)
            
            if quant:
                y = y * 127.5 + 127.5
                y = y.detach().float().cpu().numpy().clip(0, 255).astype(np.uint8)
            else:
                y = y * 0.5 + 0.5
                y = y.detach().float().cpu().numpy().clip(0, 1).astype(np.float32)
            
            results.append(y)
        return results
    
    @staticmethod
    def create_light_map(
        direction: LightDirection,
        width: int,
        height: int
    ) -> Optional[np.ndarray]:
        """
        Create a simple gradient light map.
        
        Args:
            direction: Light direction (LEFT, RIGHT, TOP, BOTTOM, or NONE)
            width: Image width
            height: Image height
            
        Returns:
            RGB light map as numpy array, or None if direction is NONE
        """
        if direction == LightDirection.NONE:
            return None
        elif direction == LightDirection.LEFT:
            gradient = np.linspace(255, 0, width)
            image = np.tile(gradient, (height, 1))
        elif direction == LightDirection.RIGHT:
            gradient = np.linspace(0, 255, width)
            image = np.tile(gradient, (height, 1))
        elif direction == LightDirection.TOP:
            gradient = np.linspace(255, 0, height)[:, None]
            image = np.tile(gradient, (1, width))
        elif direction == LightDirection.BOTTOM:
            gradient = np.linspace(0, 255, height)[:, None]
            image = np.tile(gradient, (1, width))
        else:
            raise ValueError(f"Invalid light direction: {direction}")
        
        return np.stack((image,) * 3, axis=-1).astype(np.uint8)
    
    @torch.inference_mode()
    def relight(
        self,
        foreground_image: np.ndarray,
        prompt: str,
        light_direction: LightDirection = LightDirection.NONE,
        light_map: Optional[np.ndarray] = None,
        width: int = 512,
        height: int = 640,
        num_samples: int = 1,
        seed: int = 12345,
        steps: int = 25,
        cfg_scale: float = 2.0,
        lowres_denoise: float = 0.9,
        highres_scale: float = 1.5,
        highres_denoise: float = 0.5,
        added_prompt: str = 'best quality',
        negative_prompt: str = 'lowres, bad anatomy, bad hands, cropped, worst quality',
    ) -> List[np.ndarray]:
        """
        Relight an image using IC-Light.
        
        Args:
            foreground_image: Input image as numpy array (H, W, 3)
            prompt: Text prompt describing the lighting
            light_direction: Direction for automatic light map generation
            light_map: Custom light map (overrides light_direction if provided)
            width: Output width (must be multiple of 64)
            height: Output height (must be multiple of 64)
            num_samples: Number of images to generate
            seed: Random seed
            steps: Number of diffusion steps
            cfg_scale: Classifier-free guidance scale
            lowres_denoise: Denoising strength for initial generation
            highres_scale: Scale factor for high-res pass
            highres_denoise: Denoising strength for high-res pass
            added_prompt: Additional positive prompt
            negative_prompt: Negative prompt
            
        Returns:
            List of relit images as numpy arrays
        """
        # Generate or use provided light map
        if light_map is None:
            light_map = self.create_light_map(light_direction, width, height)
        
        # Set random seed
        rng = torch.Generator(device=self.device).manual_seed(int(seed))
        
        # Preprocess foreground
        fg = self.resize_and_center_crop(foreground_image, width, height)
        
        # Encode foreground to latent space
        concat_conds = self.numpy2pytorch([fg]).to(device=self.vae.device, dtype=self.vae.dtype)
        concat_conds = self.vae.encode(concat_conds).latent_dist.mode() * self.vae.config.scaling_factor
        
        # Encode prompts
        full_prompt = f"{prompt}, {added_prompt}"
        conds, unconds = self.encode_prompt_pair(full_prompt, negative_prompt)
        
        # Generate initial latents
        if light_map is None:
            # Text-to-image: generate from noise
            latents = self.t2i_pipe(
                prompt_embeds=conds,
                negative_prompt_embeds=unconds,
                width=width,
                height=height,
                num_inference_steps=steps,
                num_images_per_prompt=num_samples,
                generator=rng,
                output_type='latent',
                guidance_scale=cfg_scale,
                cross_attention_kwargs={'concat_conds': concat_conds},
            ).images.to(self.vae.dtype) / self.vae.config.scaling_factor
        else:
            # Image-to-image: use light map as initialization
            bg = self.resize_and_center_crop(light_map, width, height)
            bg_latent = self.numpy2pytorch([bg]).to(device=self.vae.device, dtype=self.vae.dtype)
            bg_latent = self.vae.encode(bg_latent).latent_dist.mode() * self.vae.config.scaling_factor
            
            latents = self.i2i_pipe(
                image=bg_latent,
                strength=lowres_denoise,
                prompt_embeds=conds,
                negative_prompt_embeds=unconds,
                width=width,
                height=height,
                num_inference_steps=int(round(steps / lowres_denoise)),
                num_images_per_prompt=num_samples,
                generator=rng,
                output_type='latent',
                guidance_scale=cfg_scale,
                cross_attention_kwargs={'concat_conds': concat_conds},
            ).images.to(self.vae.dtype) / self.vae.config.scaling_factor
        
        # Decode to pixels
        pixels = self.vae.decode(latents).sample
        pixels = self.pytorch2numpy(pixels)
        
        # High-res pass
        highres_width = int(round(width * highres_scale / 64.0) * 64)
        highres_height = int(round(height * highres_scale / 64.0) * 64)
        
        pixels = [self.resize_without_crop(p, highres_width, highres_height) for p in pixels]
        
        # Re-encode to latents
        pixels_tensor = self.numpy2pytorch(pixels).to(device=self.vae.device, dtype=self.vae.dtype)
        latents = self.vae.encode(pixels_tensor).latent_dist.mode() * self.vae.config.scaling_factor
        latents = latents.to(device=self.unet.device, dtype=self.unet.dtype)
        
        # Update dimensions
        image_height = latents.shape[2] * 8
        image_width = latents.shape[3] * 8
        
        # Re-encode foreground at higher resolution
        fg_highres = self.resize_and_center_crop(foreground_image, image_width, image_height)
        concat_conds = self.numpy2pytorch([fg_highres]).to(device=self.vae.device, dtype=self.vae.dtype)
        concat_conds = self.vae.encode(concat_conds).latent_dist.mode() * self.vae.config.scaling_factor
        
        # High-res refinement
        latents = self.i2i_pipe(
            image=latents,
            strength=highres_denoise,
            prompt_embeds=conds,
            negative_prompt_embeds=unconds,
            width=image_width,
            height=image_height,
            num_inference_steps=int(round(steps / highres_denoise)),
            num_images_per_prompt=num_samples,
            generator=rng,
            output_type='latent',
            guidance_scale=cfg_scale,
            cross_attention_kwargs={'concat_conds': concat_conds},
        ).images.to(self.vae.dtype) / self.vae.config.scaling_factor
        
        # Final decode
        pixels = self.vae.decode(latents).sample
        results = self.pytorch2numpy(pixels)
        
        return results


def load_image(image_path: str) -> np.ndarray:
    """Load an image from disk as numpy array"""
    img = Image.open(image_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    return np.array(img)


def save_images(images: List[np.ndarray], output_dir: str, prefix: str = "relit"):
    """Save a list of images to disk"""
    os.makedirs(output_dir, exist_ok=True)
    
    saved_paths = []
    for idx, img in enumerate(images):
        output_path = os.path.join(output_dir, f"{prefix}_{idx:04d}.png")
        Image.fromarray(img).save(output_path)
        saved_paths.append(output_path)
        print(f"Saved: {output_path}")
    
    return saved_paths