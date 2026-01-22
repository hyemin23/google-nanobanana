
import { GoogleGenAI } from "@google/genai";
import { 
  GenerationConfig, 
  Resolution, 
  AspectRatio,
  ViewMode,
  ProductInfo,
  DetailImageSegment,
  PageLength,
  AnalysisResult,
  PoseDefinition,
  TopDesignAnalysis,
  QCAnalysis,
  PoseSafetyAnalysis,
  PosePreset
} from "../types";
import { PartialEditConfig } from "../components/PartialEdit";
import { RegionKey, RegionConfig } from "../components/GarmentColorChange";

export enum GeminiErrorType {
  SAFETY = 'SAFETY',
  QUOTA = 'QUOTA',
  INVALID_KEY = 'INVALID_KEY',
  UNKNOWN = 'UNKNOWN'
}

export const parseGeminiError = (error: any) => {
  const message = error?.message || String(error);
  console.error("Gemini 에러 상세:", error);
  if (message.includes("safety") || message.includes("blocked")) {
    return { type: GeminiErrorType.SAFETY, message: "안전 정책에 의해 이미지가 차단되었습니다." };
  }
  if (message.includes("quota") || message.includes("429")) {
    return { type: GeminiErrorType.QUOTA, message: "API 할당량을 초과했습니다. 잠시 후 시도해주세요." };
  }
  if (message.includes("key") || message.includes("401") || message.includes("403") || message.includes("permission") || message.includes("entity was not found")) {
    return { type: GeminiErrorType.INVALID_KEY, message: "API 키 권한이 없거나 만료되었습니다. 다시 선택해주세요." };
  }
  return { type: GeminiErrorType.UNKNOWN, message: "이미지 생성 중 오류가 발생했습니다. (403/404 발생 시 키 재설정 필요)" };
};

// --- NanoBanana Pro System Constitution (The "Rules") ---
const NANOBANANA_CONSTITUTION = `
SYSTEM CONSTITUTION (STRICT ENFORCEMENT LEVEL)
You are NanoBanana Pro, a specialized AI fashion rendering engine.
You must adhere to the following rules absolutely. Any deviation is a critical failure.

1. IDENTITY PROTECTION (Risk Management)
- NEVER enhance, beautify, or reconstruct faces artificially.
- If identity risk is detected (e.g., public figure similarity), enforce neutral rendering or crop the face.
- Do not preserve likeness if privacy risk is high.

2. PRODUCT INTEGRITY (Highest Priority)
- The product (garment) is the hero. Locked regions must remain pixel-perfect.
- Preserve original fabric texture, weave, stitching, and washing details exactly.
- Do not alter fit, silhouette, or drape unless explicitly requested.

3. LIGHTING PHYSICS (Product-Centric)
- Principle: The background adapts to the product, NOT the product to the background.
- Preserve existing contact shadows and self-shadows on the garment.
- Do NOT create new shadows on the product unless physically mandatory for the new environment.
- Lighting must be consistent with the product's original light source direction.

4. CAMERA GEOMETRY
- Maintain original aspect ratio and dead space (breathing room).
- Do not warp body proportions. No stretching or compressing of limbs.

5. TEXT PREVENTION & HALLUCINATION CONTROL
- NO text generation allowed unless strictly requested in Korean.
- Forbidden Tokens: "section", "feature", "highlight", "rose cut", "sale", "offer".
- Do not generate watermarks, UI elements, or labels.

6. QUALITY ASSURANCE
- Negative Prompts: plastic skin, over-smoothed, illustration style, halo artifacts, english text, watermark, deformed hands, extra limbs.
`;

// --- NanoBanana Pro 프롬프트 시스템 ---

const GLOBAL_BASE_PROMPT = `
Keep the original model identity, body proportions, face shape, hairstyle, and skin tone unchanged.
Keep the original outfit design, fabric type, color, texture, stitching, and fit exactly the same.
Do not add or remove any accessories, belts, keyrings, or non-product items.
Remove any belts, keyrings, or styling accessories if present.
Keep the original background, environment, lighting, and shadows consistent.
Do not change the background style or location.
Preserve natural human anatomy and realistic posture.
`;

const ANGLE_PROMPTS: Record<string, string> = {
  'front': `Camera angle: Front view. Body rotation: 0 degrees. Facing forward naturally. Balanced weight on both feet.`,
  'left35': `Camera angle: Body rotated 35 degrees to the left. Left side emphasized. Head follows body direction naturally. Natural relaxed posture.`,
  'right35': `Camera angle: Body rotated 35 degrees to the right. Right side emphasized. Head follows body direction naturally. Natural relaxed posture.`,
  'left90': `Camera angle: Body rotated 90 degrees to the left. Full left profile view. Side silhouette clearly visible.`,
  'right90': `Camera angle: Body rotated 90 degrees to the right. Full right profile view. Side silhouette clearly visible.`
};

export const generateFittingVariation = async (
  base64: string, 
  ref64: string | null, 
  userPrompt: string, 
  viewMode: ViewMode, 
  quality: Resolution, 
  ratio: AspectRatio, 
  angleKey: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const framingText = viewMode === 'top' ? 'upper body' : viewMode === 'bottom' ? 'lower body' : 'full body';
  
  const globalRenderPrompt = `
Framing: ${framingText}.
Aspect ratio: ${ratio}.
Resolution: high quality commercial photo.
Style: clean fashion product photography.
Purpose: e-commerce fitting variation.
No text, no icons, no watermarks, no graphic overlays.
All visual text must be in Korean if text appears naturally in the scene.
`;

  const angleOverridePrompt = ANGLE_PROMPTS[angleKey] || ANGLE_PROMPTS['front'];
  
  const finalPrompt = `
${GLOBAL_BASE_PROMPT}
${globalRenderPrompt}
${angleOverridePrompt}
Additional context: ${userPrompt}
Do not generate identical poses. Each generated image must have a clearly different body rotation and camera angle.
`;

  const parts: any[] = [
    { text: finalPrompt },
    { inlineData: { data: base64.split(',')[1] || base64, mimeType: 'image/png' } }
  ];
  
  if (ref64) {
    parts.push({ inlineData: { data: ref64.split(',')[1] || ref64, mimeType: 'image/png' } });
  }
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: { 
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: { 
        aspectRatio: ratio, 
        imageSize: quality 
      } 
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("이미지 생성 결과가 없습니다.");
  return `data:image/png;base64,${part.inlineData.data}`;
};

export const generateFashionContent = async (config: GenerationConfig, locationPrompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  if (!config.imageFile) throw new Error("이미지 파일이 필요합니다.");
  
  const reader = new FileReader();
  const dataPromise = new Promise<string>((resolve) => {
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(config.imageFile!);
  });
  const data = await dataPromise;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { inlineData: { data, mimeType: config.imageFile.type } },
        { text: `Create high-end fashion UGC. Prompt: ${config.freePrompt}. Location: ${locationPrompt}. Professional commercial style.` }
      ]
    },
    config: { 
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: { aspectRatio: config.aspectRatio, imageSize: config.quality } 
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("이미지 생성 실패");
  return { imageUrl: `data:image/png;base64,${part.inlineData.data}` };
};

export const generatePoseChange = async (baseImage: string, refImage: string | null, prompt: string, resolution: Resolution, ratio: AspectRatio, faceOptions: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const parts: any[] = [{ text: `${GLOBAL_BASE_PROMPT} ${prompt}. Gender: ${faceOptions.gender}.` }];
  parts.push({ inlineData: { data: baseImage.split(',')[1] || baseImage, mimeType: 'image/png' } });
  if (refImage) parts.push({ inlineData: { data: refImage.split(',')[1] || refImage, mimeType: 'image/png' } });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: { 
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: { aspectRatio: ratio, imageSize: resolution } 
    }
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : '';
};

export const generateDetailExtra = async (baseImage: string, refImage: string | null, prompt: string, resolution: Resolution, ratio: AspectRatio): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const parts: any[] = [{ text: prompt }];
  parts.push({ inlineData: { data: baseImage.split(',')[1] || baseImage, mimeType: 'image/png' } });
  if (refImage) parts.push({ inlineData: { data: refImage.split(',')[1] || refImage, mimeType: 'image/png' } });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: { 
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: { aspectRatio: ratio, imageSize: resolution } 
    }
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : '';
};

export const generateBackgroundChange = async (
  baseImage: string, 
  bgRefImage: string,
  userPrompt: string,
  resolution: Resolution,
  ratio: AspectRatio
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
You are a professional fashion image editor.

Use Image A as the primary subject reference.
Use Image B as the background reference only.

TASK:
- Keep the subject, pose, body proportions, clothing fit, fabric texture, and camera angle of Image A completely unchanged.
- Extract ONLY the background environment from Image B and replace the background of Image A with it.
- Do NOT change the subject’s pose, framing, crop, or perspective from Image A.

LIGHTING & SHADOW RULES (VERY IMPORTANT):
- Preserve the original natural light direction, intensity, color temperature, and softness from Image A.
- Preserve all existing shadows, shadow edges, gradients, and silhouettes cast by the subject in Image A.
- Match the background from Image B to the lighting of Image A, NOT the other way around.
- Ensure the ground contact shadows remain physically consistent and realistic.
- No artificial glow, no HDR look, no AI-styled lighting.

REALISM CONSTRAINTS:
- The background replacement must look naturally photographed, not composited.
- No edge artifacts, no halo, no blur mismatch.
- Grain, sharpness, and depth must match Image A.
- Perspective and horizon alignment must feel optically correct.

STRICT EXCLUSIONS:
- Do NOT add text, labels, sections, UI elements, or decorative graphics.
- Do NOT modify clothing color, fabric, wrinkles, or silhouette.
- Do NOT alter skin tone, body shape, or proportions.
- Do NOT introduce new shadows or remove existing ones.

ADDITIONAL USER INSTRUCTIONS:
${userPrompt}

OUTPUT:
- Photorealistic fashion image.
- Natural studio-quality result.
- Clean, professional, e-commerce ready.
`;

  const parts: any[] = [{ text: prompt }];
  // Image A (Subject)
  parts.push({ inlineData: { data: baseImage.split(',')[1] || baseImage, mimeType: 'image/png' } });
  // Image B (Background)
  parts.push({ inlineData: { data: bgRefImage.split(',')[1] || bgRefImage, mimeType: 'image/png' } });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: { 
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: { 
        aspectRatio: ratio, 
        imageSize: resolution 
      } 
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : '';
};

export const generateAutoBackgrounds = async (
  baseImage: string,
  userPrompt: string,
  resolution: Resolution,
  ratio: AspectRatio
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const AUTO_SCENARIOS = [
    { name: "Studio", desc: "Soft daylight studio with subtle floor shadow, clean minimal aesthetic, professional e-commerce look." },
    { name: "Urban", desc: "Minimal urban concrete or asphalt ground with natural sunlight, city street vibe but clean background." },
    { name: "Indoor", desc: "Warm neutral indoor space with indirect window light, cozy but minimal interior atmosphere." }
  ];

  const basePrompt = `
You are a professional fashion image editor.

TASK:
- Change the background of the provided image to: [SCENARIO_DESCRIPTION].
- Keep the subject, pose, body proportions, clothing fit, fabric texture, and camera angle of the input image completely unchanged.
- Do NOT change the subject’s pose, framing, crop, or perspective.

STRICT RULES:
- Preserve the original natural light direction and shadows of the subject.
- Match the new background lighting to the subject.
- Ensure realistic ground contact shadows.
- No artifacts, no halo, no blur mismatch.
- Do NOT add text or graphics.
- Do NOT modify clothing color, fabric, or wrinkles.

ADDITIONAL USER INSTRUCTIONS:
${userPrompt}
`;

  const results: string[] = [];

  // Generate 3 variations in parallel
  const tasks = AUTO_SCENARIOS.map(async (scenario) => {
    const finalPrompt = basePrompt.replace('[SCENARIO_DESCRIPTION]', scenario.desc);
    
    const parts: any[] = [{ text: finalPrompt }];
    parts.push({ inlineData: { data: baseImage.split(',')[1] || baseImage, mimeType: 'image/png' } });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { 
          systemInstruction: NANOBANANA_CONSTITUTION,
          imageConfig: { 
            aspectRatio: ratio, 
            imageSize: resolution 
          } 
        }
      });

      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    } catch (e) {
      console.error(`Error generating ${scenario.name} background:`, e);
    }
    return null;
  });

  const generated = await Promise.all(tasks);
  return generated.filter(img => img !== null) as string[];
};

export const generatePartialEdit = async (
  baseImage: string,
  config: PartialEditConfig,
  userPrompt: string,
  resolution: Resolution,
  ratio: AspectRatio
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const isLocked = (id: string) => config.lockedRegions.includes(id);

  // Construct Lock Prompts
  const lockInstructions: string[] = [];
  if (isLocked('bottom')) lockInstructions.push("- BOTTOM GARMENT: Preserve pants/skirt color, fit, fabric, wrinkles, and silhouette exactly. Do NOT change.");
  if (isLocked('top')) lockInstructions.push("- TOP GARMENT: Do not modify the top garment in any way.");
  if (isLocked('shoes')) lockInstructions.push("- SHOES: Keep the original shoes unchanged.");
  if (isLocked('pose')) lockInstructions.push("- POSE: Do not change the model’s pose or stance.");
  if (isLocked('face')) lockInstructions.push("- FACE: Preserve facial features and expression.");
  if (isLocked('accessories')) lockInstructions.push("- ACCESSORIES: Keep existing accessories.");

  // Construct Edit Prompts
  const editInstructions: string[] = [];
  
  if (!isLocked('top')) {
    if (config.topOptions.mode === 'color') editInstructions.push("- TOP EDIT: Change only the color of the top garment while preserving design and fit.");
    if (config.topOptions.mode === 'design') editInstructions.push("- TOP EDIT: Replace the top garment design with a different style.");
    if (config.topOptions.mode === 'material') editInstructions.push("- TOP EDIT: Change the material texture of the top garment.");
    if (config.topOptions.mode === 'replace') editInstructions.push("- TOP EDIT: Replace the entire top garment with a new one.");
    
    if (config.topOptions.fitLock) editInstructions.push("  * Maintain the original fit and silhouette.");
    if (config.topOptions.neckLock) editInstructions.push("  * Preserve the neckline shape.");
    if (config.topOptions.sleeveLock) editInstructions.push("  * Keep sleeve length unchanged.");
  }

  if (!isLocked('shoes')) {
    if (config.shoesOption === 'change') editInstructions.push("- SHOES EDIT: Replace the shoes with a different style in the same category. Do not alter leg length.");
    if (config.shoesOption === 'remove') editInstructions.push("- SHOES EDIT: Remove the shoes cleanly (barefoot or socks).");
  }

  if (!isLocked('pose')) {
    if (config.poseOption === 'subtle') editInstructions.push("- POSE EDIT: Make a subtle pose adjustment (5–10 degrees).");
    if (config.poseOption === 'rotate') editInstructions.push("- POSE EDIT: Rotate the body slightly to the left/right.");
  }

  if (!isLocked('accessories')) {
    if (config.accessoryOption === 'remove') editInstructions.push("- ACCESSORIES EDIT: Remove all non-product accessories such as belts, watches, keyrings.");
  }

  const prompt = `
[NanoBanana Pro - Selective Edit Mode]

You are an expert AI fashion editor.
Your goal is to edit specific parts of the image while STRICTLY PRESERVING others.

**LOCKED REGIONS (PRESERVE EXACTLY):**
${lockInstructions.join('\n')}

**EDIT REGIONS (APPLY CHANGES):**
${editInstructions.join('\n')}

**ADDITIONAL USER INSTRUCTIONS:**
${userPrompt}

**GLOBAL PROTECTION RULES:**
- Preserve body proportions, camera angle, lighting, shadows, and fabric realism.
- Avoid AI artifacts, distortions, or unnatural textures.
- Ensure natural blending between locked and edited regions.

Output a high-quality, photorealistic fashion image.
`;

  const parts: any[] = [{ text: prompt }];
  parts.push({ inlineData: { data: baseImage.split(',')[1] || baseImage, mimeType: 'image/png' } });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: {
        aspectRatio: ratio,
        imageSize: resolution
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("이미지 생성 실패");
  return `data:image/png;base64,${part.inlineData.data}`;
};

export const generateMultiGarmentColorChange = async (
  baseImage: string,
  configs: Record<RegionKey, RegionConfig>
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const activeRegions = Object.entries(configs).filter(([_, cfg]) => cfg.isEnabled);
  
  // Construct a detailed multi-step instruction
  const taskSteps = activeRegions.map(([key, cfg], index) => {
    const regionName = {
      upper_garment: "UPPER GARMENT (Top)",
      lower_garment: "LOWER GARMENT (Bottom)",
      outerwear: "OUTERWEAR (Jacket/Coat)"
    }[key];

    let sourceDesc = "";
    if (cfg.mode === 'picker') {
      sourceDesc = `Use solid color: ${cfg.targetColor}`;
    } else {
      sourceDesc = `
        - SOURCE: Reference Image ${index + 1}
        - EXTRACT FROM: ${cfg.sourceRegion}
        - GROUND TRUTH COLOR (PIGMENT): ${cfg.extractedHex || 'Detect from image'}
        - INSTRUCTION: Extract the pigment from the reference source and apply it to the target region.
      `;
    }

    return `
      STEP ${index + 1} - TARGET: ${regionName}
      ${sourceDesc}
    `;
  }).join('\n');

  const prompt = `
[NanoBanana Pro - Multi-Region Color Engine v2]

You are a layered fashion rendering engine.
Your task is to change the colors of specific garment regions based on the instructions below.

**INPUTS:**
- Image A: Base Image (Target)
- Image B, C...: Reference Images (Source for colors)

**TASK QUEUE:**
${taskSteps}

**LAYER PRIORITY (CRITICAL for Occlusion):**
1. Render LOWER GARMENT first.
2. Render UPPER GARMENT next (over lower if tucked out).
3. Render OUTERWEAR last (over upper).

**LIGHTING NORMALIZATION RULES:**
- **IGNORE** the lighting/environment of the Reference Images.
- **ADAPT** the extracted pigment to the Base Image's lighting environment.
- Preserve the Base Image's shadows, highlights, and fabric texture exactly.
- If the reference is dark and base is bright, adjust luminance but keep hue/saturation.

**CROSS-MATCHING:**
- You may be asked to apply "Bottom" color to "Top" region. This is intentional (Cross-Match).
- Extract color from the requested source region and apply to the target.

Output the final composite image.
  `;

  const parts: any[] = [{ text: prompt }];
  
  // 1. Base Image
  parts.push({ inlineData: { data: baseImage.split(',')[1] || baseImage, mimeType: 'image/png' } });
  
  // 2. Reference Images (Only for enabled reference modes)
  activeRegions.forEach(([_, cfg]) => {
    if (cfg.mode === 'reference' && cfg.refImage) {
      parts.push({ inlineData: { data: cfg.refImage.split(',')[1] || cfg.refImage, mimeType: 'image/png' } });
    }
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: '2K'
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("이미지 생성 실패");
  return `data:image/png;base64,${part.inlineData.data}`;
};

// --- Top Design Replacement Logic ---

export const analyzeGarmentStructure = async (baseImage: string, refImage: string): Promise<TopDesignAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `
    Analyze the Upper Garment in Image A (Base) and Image B (Reference).
    Compare their structure and volume to determine safety level for replacement.

    RULES:
    - L1 (Safe): Structural match or simple volume change (e.g. Tee <-> Tee, Sweatshirt <-> Knit).
    - L2 (Caution): Reference is significantly smaller/simpler than Base (e.g. Hoodie -> Tee), requiring background inpainting behind removed parts.
    - L3 (Block): Drastic volume change (e.g. Sleeveless -> Padded Jacket, Jacket -> T-shirt) or impossible anatomy generation.

    Return JSON:
    {
      "level": "L1" | "L2" | "L3",
      "reason": "Brief explanation",
      "baseCategory": "e.g. Hoodie",
      "refCategory": "e.g. T-shirt"
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', // Faster model for analysis
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: baseImage.split(',')[1] || baseImage, mimeType: 'image/png' } },
        { inlineData: { data: refImage.split(',')[1] || refImage, mimeType: 'image/png' } }
      ]
    },
    config: {
      responseMimeType: 'application/json'
    }
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Analysis Parse Error", e);
    return { level: 'L2', reason: 'Analysis failed, proceeding with caution.' };
  }
};

export const generateTopDesignReplacement = async (
  baseImage: string,
  refImage: string,
  resolution: Resolution,
  aspectRatio: AspectRatio,
  promptOverride: string = ''
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `
    [Top Garment Design Replacement]
    
    Task: Replace the Upper Garment in Image A (Base) with the design/texture/structure from Image B (Reference).
    
    Strict Rules:
    1. **TARGET:** Upper Garment ONLY.
    2. **PRESERVE:** 
       - Face & Hair (Identity)
       - Hands & Arms Pose
       - Lower Garment (Pants/Skirt)
       - Background Environment
    3. **TRANSFER:**
       - Texture, Pattern, Graphics, and Collar/Sleeve style from Image B.
    4. **ADAPT:**
       - Apply the new design to the model's body shape and pose in Image A.
       - Match the Lighting and Shadows of Image A.
    
    ${promptOverride ? `User Instruction: ${promptOverride}` : ''}
    
    Output: Photorealistic composite image.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: baseImage.split(',')[1] || baseImage, mimeType: 'image/png' } },
        { inlineData: { data: refImage.split(',')[1] || refImage, mimeType: 'image/png' } }
      ]
    },
    config: {
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: resolution
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("이미지 생성 실패");
  return `data:image/png;base64,${part.inlineData.data}`;
};

// --- Commercial Pose Variation & CTR Scoring ---

export const generateCommercialPose = async (
  baseImage: string, 
  userPrompt: string = '',
  resolution: Resolution = '2K',
  aspectRatio: AspectRatio = '9:16'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `
    [Commercial Pose Variation Engine - Physics Aware]

    Input: Fashion Model Image.
    Task: Generate a high-quality commercial pose variation while preserving the outfit's texture and identity.

    **PHYSICS SIMULATION RULES:**
    1. **Reacting Fabric:** When limbs move, the clothing folds must change naturally. Do not copy-paste rigid wrinkles from the source. Simulate how the fabric (cotton, silk, denim) would fold in the NEW pose.
    2. **Texture Preservation:** Strictly maintain the fabric pattern (check, stripe, floral) and material finish (matte, glossy).
    3. **Background Inpainting:** If the model moves and reveals the background, fill it naturally.

    **POSE STRATEGY:**
    - Create a dynamic, commercially viable pose (e.g., walking, hand in pocket, slight turn, leaning).
    - Ensure the pose highlights the garment's fit.
    
    ${userPrompt ? `Additional Instruction: ${userPrompt}` : ''}

    Output: Photorealistic image.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: baseImage.split(',')[1] || baseImage, mimeType: 'image/png' } }
      ]
    },
    config: {
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: resolution
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Image generation failed");
  return `data:image/png;base64,${part.inlineData.data}`;
};

export const analyzePoseQuality = async (imageUrl: string): Promise<QCAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `
    Act as a 'PoseQCGuard' (Automated Quality Control Layer) for a fashion AI engine.
    Analyze the provided image for physical plausibility, framing quality, and commercial appeal.

    **1. AUTO-FAIL CHECKS (Strict):**
    - **Limb Distortion:** Check arm/leg lengths. If left/right ratio diff > 1.3 or joints bend backward -> "LIMB_DISTORTION".
    - **Hand Artifacts:** Check for malformed hands or extra fingers -> "HAND_ARTIFACT".
    - **Framing Error:** Is the head (eyes/nose) fully visible? If cut off -> "HEAD_CROP". (Ignore if the image is intentionally headless crop, but assume full body/portrait for this score).
    - **Garment Occlusion:** Do hands/arms cover >30% of the main torso garment? -> "GARMENT_OCCLUSION".

    **2. SCORING (0-100):**
    - **Face Confidence (40%):** Are facial features clear and sharp?
    - **Body Ratio (30%):** Are proportions natural and aesthetic?
    - **Centering (30%):** Is the subject well-centered and framed?

    **3. CLASSIFICATION LOGIC:**
    - **NOT_RECOMMENDED:** If ANY Auto-Fail check triggers OR Score < 40.
    - **RECOMMENDED:** No failures AND Score >= 80.
    - **USABLE:** No failures AND 40 <= Score < 80.

    **4. SIGNATURE EXTRACTION (For De-duplication):**
    - Estimate body rotation in degrees (-90 to 90).
    - Describe arm state (e.g., "crossed", "hips", "straight", "pocket").

    Return JSON:
    {
      "status": "RECOMMENDED" | "USABLE" | "NOT_RECOMMENDED",
      "score": number,
      "rejectReasons": string[], 
      "signature": { "rotation": number, "armState": "string" },
      "details": {
        "faceConfidence": number,
        "bodyRatio": number,
        "centering": number,
        "total": number
      }
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: imageUrl.split(',')[1] || imageUrl, mimeType: 'image/png' } }
      ]
    },
    config: {
      responseMimeType: 'application/json'
    }
  });

  const text = response.text || "{}";
  try {
    const res = JSON.parse(text);
    // Ensure 'total' is present in details
    if (res.details && !res.details.total) res.details.total = res.score;
    return res;
  } catch (e) {
    console.error("QC Analysis Error", e);
    // Return a fail-safe object
    return { 
      status: 'NOT_RECOMMENDED', 
      score: 0, 
      rejectReasons: ['ANALYSIS_FAILED'], 
      signature: { rotation: 0, armState: 'unknown' },
      details: { faceConfidence: 0, bodyRatio: 0, centering: 0, total: 0 }
    };
  }
};

// --- Smart Pose Reference v2.0 (Safety & Fallback & Presets) ---

export const analyzePoseSafety = async (refImage: string): Promise<PoseSafetyAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const prompt = `
    [SmartPoseEngine - Safety Gatekeeper]
    Analyze this reference pose image for safety and product visibility.

    **1. SAFETY CHECK (Biomechanics):**
    - **Arm Angle:** Is the arm raised > 45 degrees above shoulder? -> EXTREME_ARM_ANGLE
    - **Body Twist:** Is torso rotated > 30 degrees? -> EXTREME_TWIST
    - **Lean:** Is torso leaning > 15 degrees? -> EXTREME_LEAN
    - **Complexity:** Are limbs entangled or in a yoga/acrobatic pose? -> COMPLEX_POSE

    **2. VISIBILITY CHECK (Occlusion):**
    - **Torso Block:** Do hands/arms cover the center chest/stomach area where a logo/print would be? -> TORSO_OCCLUSION
    - **Self-Hugging:** Is the model hugging themselves or crossing arms tightly? -> SELF_HUGGING

    **DECISION:**
    - **SAFE:** No issues.
    - **WARNING:** Minor occlusion or slight lean. (Allow with caution)
    - **DANGER:** Extreme angles or major occlusion. (Recommend Fallback)

    Return JSON:
    {
      "isSafe": boolean, // True if SAFE or WARNING
      "riskLevel": "SAFE" | "WARNING" | "DANGER",
      "issues": string[], 
      "fallbackRecommended": boolean, // True if DANGER
      "reason": "Brief explanation"
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: refImage.split(',')[1] || refImage, mimeType: 'image/png' } }
      ]
    },
    config: { responseMimeType: 'application/json' }
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Safety Analysis Error", e);
    return { isSafe: true, riskLevel: 'SAFE', issues: [], fallbackRecommended: false, reason: "Analysis failed, assuming safe." };
  }
};

export const generateSmartPose = async (
  baseImage: string,
  refImage: string | null, // Made optional for preset mode
  useFallbackPrompt: boolean,
  options: { 
    headless: boolean, 
    resolution: Resolution, 
    aspectRatio: AspectRatio,
    freePrompt?: string // Added Free Prompt Support
  },
  preset?: PosePreset // Optional preset input
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  // 1. Determine Prompt Strategy
  let promptText = "";

  if (preset) {
    // A. Preset Mode (Standardized)
    const { pose_signature } = preset.skeleton_template;
    const { forbidden_rules } = preset.safety_constraints;
    
    promptText = `
      [SMART POSE LIBRARY: ${preset.name_en}]
      Apply the following specific pose instructions to the model in Image A (Target).
      
      **POSE SIGNATURE:**
      - Rotation: ${pose_signature.body_rotation_deg} degrees.
      - Arms: ${pose_signature.arm_state}.
      - Description: ${pose_signature.description}
      
      **SAFETY CONSTRAINTS:**
      - Strictly avoid: ${forbidden_rules.join(', ')}.
      - Ensure clear visibility of the garment.
      
      **PRESERVE:**
      - Keep the original outfit from Image A exactly as is.
      - Adjust fabric folds naturally to match the new pose.
    `;
  } else if (useFallbackPrompt) {
    // B. Fallback Mode (Safety Net)
    promptText = `
      [FALLBACK MODE ACTIVE]
      Ignore any complex pose instructions.
      Generate a **Standard Commercial Front Pose**:
      - Standing naturally, facing forward.
      - Arms relaxed by the sides, not covering the torso.
      - Feet shoulder-width apart.
      - Focus on clear product visibility.
    `;
  } else {
    // C. Reference Mode (Strict Skeleton Transfer)
    promptText = `
      [SMART POSE REFERENCE MODE - STRICT SKELETON TRANSFER]

      **TASK:** Extract the body pose (skeleton) from Image B (Reference) and apply it to the subject in Image A (Target).

      **1. DIRECTIONAL STANDARD (CRITICAL):**
      - **Subject-Centric Mapping:** The Target Subject's Left Hand corresponds to the Reference Subject's Left Hand.
      - **Visual Matching:** Maintain the exact limb orientation relative to the camera. If the reference shows the right shoulder forward, the result must show the right shoulder forward.
      - Do NOT flip or mirror the pose.

      **2. CLEAN POSE (NO PROPS):**
      - **IGNORE PROPS:** If the reference model in Image B is holding objects (phones, bags, cups, flowers, etc.), **DO NOT GENERATE THEM**.
      - **Empty Hands:** Render the target model's hands natural and empty (unless Image A already has an accessory).
      - **Focus:** Transfer ONLY the joint angles and body geometry.

      **3. PRESERVATION:**
      - Keep the original outfit from Image A (Target) exactly as is.
      - Retain the Target Subject's identity and body type.
      - Adjust fabric folds naturally to match the new pose physics.
    `;
  }

  // Inject User's Free Prompt if available
  const userInstruction = options.freePrompt 
    ? `\n**ADDITIONAL USER INSTRUCTION:** ${options.freePrompt}` 
    : "";

  const finalPrompt = `
    ${promptText}
    ${options.headless ? "**HEADLESS MODE:** Crop the image from the nose down. Focus on the outfit." : ""}
    ${userInstruction}
    Output: Photorealistic fashion image.
  `;

  // 2. Build Payload
  const parts: any[] = [
    { text: finalPrompt },
    { inlineData: { data: baseImage.split(',')[1] || baseImage, mimeType: 'image/png' } }
  ];

  // Only add ref image if we are in Reference Mode (not Preset or Fallback)
  if (!preset && !useFallbackPrompt && refImage) {
    parts.push({ inlineData: { data: refImage.split(',')[1] || refImage, mimeType: 'image/png' } });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: {
        aspectRatio: options.aspectRatio,
        imageSize: options.resolution
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Image generation failed");
  return `data:image/png;base64,${part.inlineData.data}`;
};

// --- Legacy Export (Keep for backward compatibility if needed) ---
export const generateGarmentColorChange = async (
  baseImage: string,
  region: 'upper_garment' | 'lower_garment' | 'outerwear' | 'all_garments',
  targetColor: string,
  patternMode: 'solid' | 'preserve' = 'solid',
  isExtremeChange: boolean = false,
  referenceData?: { refImage: string, sourceRegion: string }
): Promise<string> => {
  // Simple wrapper calling multi-region logic for single region compatibility
  const regionMap: Record<string, RegionKey> = {
    'upper_garment': 'upper_garment',
    'lower_garment': 'lower_garment',
    'outerwear': 'outerwear',
    'all_garments': 'upper_garment' // Fallback
  };
  
  const key = regionMap[region] || 'upper_garment';
  
  const singleConfig: Record<RegionKey, RegionConfig> = {
    upper_garment: { isEnabled: false, mode: 'picker', targetColor: '', refImage: null, sourceRegion: 'upper_garment', extractedHex: null },
    lower_garment: { isEnabled: false, mode: 'picker', targetColor: '', refImage: null, sourceRegion: 'lower_garment', extractedHex: null },
    outerwear: { isEnabled: false, mode: 'picker', targetColor: '', refImage: null, sourceRegion: 'outerwear', extractedHex: null }
  };

  singleConfig[key] = {
    isEnabled: true,
    mode: referenceData ? 'reference' : 'picker',
    targetColor: targetColor,
    refImage: referenceData ? referenceData.refImage : null,
    sourceRegion: referenceData ? (regionMap[referenceData.sourceRegion] || 'upper_garment') : 'upper_garment',
    extractedHex: null 
  };

  return generateMultiGarmentColorChange(baseImage, singleConfig);
};

// --- Thumbnail Generator ---
export const generateImages = async (
  prompt: string,
  baseImages: File[],
  resolution: Resolution,
  layoutMode: string,
  viewMode: ViewMode,
  imageCount: number
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const imageParts = await Promise.all(baseImages.map(async (file) => {
    const reader = new FileReader();
    const dataPromise = new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return { inlineData: { data: await dataPromise, mimeType: file.type } };
  }));

  const results: string[] = [];
  
  for (let i = 0; i < imageCount; i++) {
    const finalPrompt = `
      Create a high-quality fashion thumbnail.
      Prompt: ${prompt}.
      Framing: ${viewMode}.
      Layout: ${layoutMode}.
      Resolution: ${resolution}.
      Style: Commercial fashion photography, clean, high aesthetic.
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: finalPrompt },
          ...imageParts
        ]
      },
      config: {
        systemInstruction: NANOBANANA_CONSTITUTION,
        imageConfig: {
          aspectRatio: '1:1', 
          imageSize: resolution
        }
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData) {
      results.push(`data:image/png;base64,${part.inlineData.data}`);
    }
  }
  
  return results;
};

// --- Detail Page Planning ---
export const planDetailPage = async (
  product: ProductInfo | AnalysisResult, 
  lengthOrName: PageLength | string = '7'
): Promise<DetailImageSegment[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  let promptContext = "";
  if ('features' in product) {
     promptContext = `Product Name: ${product.name}, Features: ${product.features}, Category: ${product.category}`;
  } else {
     promptContext = `Product Category: ${product.category}, Fit: ${product.fit}, Material: ${product.materialType}`;
     if (typeof lengthOrName === 'string') promptContext += `, Name: ${lengthOrName}`;
  }
  
  const prompt = `
    Plan a fashion product detail page structure based on this product info:
    ${promptContext}
    
    Target Length: ${lengthOrName} sections.
    
    Return a JSON array of objects with these keys:
    - id: unique string
    - title: section title
    - logicalSection: e.g., "Intro", "Feature", "Detail", "Size", "Outro"
    - keyMessage: A catchy one-line copy in Korean.
    - visualPrompt: A detailed English prompt for image generation describing the product shot.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json'
    }
  });

  const text = response.text || "[]";
  try {
    const json = JSON.parse(text);
    return Array.isArray(json) ? json : [];
  } catch (e) {
    console.error("JSON parse error", e);
    return [];
  }
};

// --- Section Image Generator ---
export const generateSectionImage = async (
  segment: DetailImageSegment, 
  baseImages: File[], 
  resolution: Resolution
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const imageParts = await Promise.all(baseImages.map(async (file) => {
    const reader = new FileReader();
    const dataPromise = new Promise<string>((resolve) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return { inlineData: { data: await dataPromise, mimeType: file.type } };
  }));

  const prompt = `
    Generate a fashion detail page image for section: "${segment.title}".
    Visual description: ${segment.visualPrompt}.
    Style: Professional e-commerce, clean, high resolution, consistent lighting.
    Aspect Ratio: 9:16 (Vertical).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { text: prompt },
        ...imageParts
      ]
    },
    config: {
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: {
        aspectRatio: '9:16',
        imageSize: resolution
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Image generation failed");
  return `data:image/png;base64,${part.inlineData.data}`;
};

// --- Lookbook Studio ---
export const generateLookbookImage = async (
  base64Data: string, 
  description: string, 
  analysis: AnalysisResult | undefined, 
  resolution: Resolution
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  let context = description;
  if (analysis) {
    context += ` Category: ${analysis.category}, Fit: ${analysis.fit}, Material: ${analysis.materialType}`;
  }

  const prompt = `
    Generate a professional fashion lookbook image.
    Product Description: ${context}.
    Focus: Neck-down crop, high fashion style.
    Background: Studio setting.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: 'image/png' } }
      ]
    },
    config: {
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: {
        aspectRatio: '9:16',
        imageSize: resolution
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Image generation failed");
  return `data:image/png;base64,${part.inlineData.data}`;
};

// --- Product Analysis ---
export const analyzeProduct = async (mainImageUrl: string, userDesc: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Analyze this fashion product image and description.
    Description: ${userDesc}
    
    Return a JSON object with:
    - category: string (e.g., 상의, 하의, 아우터)
    - fit: string (e.g., 오버핏, 슬림핏, 레귤러핏)
    - materialType: string (e.g., 면, 울, 폴리에스테르)
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: mainImageUrl.split(',')[1], mimeType: 'image/png' } }
      ]
    },
    config: {
      responseMimeType: 'application/json'
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text);
};

// --- Factory Poses ---
export const FACTORY_POSES: PoseDefinition[] = [
  { id: 'fp_1', name: 'Front Standing', prompt: 'Front view, standing naturally, arms relaxed.' },
  { id: 'fp_2', name: 'Side Profile', prompt: 'Side profile view, walking motion.' },
  { id: 'fp_3', name: 'Back View', prompt: 'Back view, showing fit.' },
  { id: 'fp_4', name: 'Detail Zoom', prompt: 'Close up on fabric texture and details.' },
  { id: 'fp_5', name: 'Sitting', prompt: 'Sitting on a chair, relaxed pose.' },
  { id: 'fp_6', name: 'Dynamic Movement', prompt: 'Dynamic pose, showing fabric movement.' },
];

export const generateFactoryPose = async (
  mainImageUrl: string, 
  pose: PoseDefinition, 
  analysis: AnalysisResult, 
  resolution: Resolution
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Generate a fashion image based on the product.
    Pose: ${pose.prompt}.
    Product Category: ${analysis.category}.
    Fit: ${analysis.fit}.
    Material: ${analysis.materialType}.
    Maintain garment consistency.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { data: mainImageUrl.split(',')[1], mimeType: 'image/png' } }
      ]
    },
    config: {
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: {
        aspectRatio: '9:16',
        imageSize: resolution
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Image generation failed");
  return `data:image/png;base64,${part.inlineData.data}`;
};

export const generateTechSketch = async (category: string, name: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Create a technical fashion sketch (flat drawing) for: ${name} (${category}).
    Black and white line art, clean lines, white background.
    Front and back view if possible in one image.
    No shading, pure technical drawing style.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { text: prompt }
      ]
    },
    config: {
      systemInstruction: NANOBANANA_CONSTITUTION,
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: '1K'
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!part?.inlineData) throw new Error("Image generation failed");
  return `data:image/png;base64,${part.inlineData.data}`;
};
