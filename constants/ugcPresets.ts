
export interface LocationOption {
  id: string;
  name: string;
  category: string;
  prompt: string;
  icon: string;
}

export const TECHNICAL_INSTRUCTION = `
[RAW_PHOTO_ENGINE_LOGIC]
- Camera: 4K court snap shot on iPhone 15 Pro, 4K resolution, 26mm, f/1.8, ISO 400.
- Processing: Add subtle film grain (noise: 0.05). Use natural phone colors (contrast: 0.9). No artificial smoothing on clothes.
- Lighting: Authentic 'Found Lighting' (mixed ambient light, natural glare, or atmospheric haze).
- Facial Aesthetics: Perfectly clean and clear skin texture, flawless porcelain complexion with a healthy skincare glow, sharp and defined jawline, K-pop idol visuals, high-end grooming. The skin must be smooth and radiant without any blemishes, spots, or imperfections.

[GARMENT_INTEGRITY]
Use the uploaded product as the clothing worn by the model. Preserve the exact silhouette, details, stitching, texture, and proportions of the item. Do not redesign or reinterpret the garment. The clothing looks naturally worn and realistic.

[ANTI_TEXT_LOGIC]
- No text, No typography, No watermarks, No logos. 
- Clean background without any legible signs, posters, or readable characters. 
- Background elements like advertisements are naturally out of focus (bokeh) or blurred to prevent garbled text.

[FORMAT]
- Square format, Aspect ratio 1:1.
`;

export const LOCATIONS: LocationOption[] = [
  { 
    id: 'korean_subway_station', 
    name: '지하철 승강장', 
    category: 'Outdoor', 
    prompt: 'Taking a natural mirror-style selfie or reflection shot inside a newly built modern subway station with bright clean lighting. White and light gray tones, glass screen doors, and polished floors. Spacious and open atmosphere. No dark shadows, no grunge, no old elements. Relaxed natural posture holding a smartphone, calm confident expression, soft even lighting.', 
    icon: '🚇' 
  },
  { 
    id: 'crosswalk', 
    name: '횡단보도', 
    category: 'Outdoor', 
    prompt: 'Walking across a realistic Korean crosswalk with faded white stripes on dark, textured asphalt. The background shows a typical Seoul street with grey utility poles, distant blurry parked cars, and mundane commercial buildings with realistic grey and beige tones. Natural midday sunlight with slight atmospheric haze, creating realistic shadows on the ground.', 
    icon: '🚶' 
  },
  { 
    id: 'golf_course', 
    name: '골프장 필드', 
    category: 'Outdoor', 
    prompt: 'A refined Korean {{gender}} in their 40s to 50s with mature and natural K-pop visual features, elegant and realistic style. Photographed in a clean modern golf course environment with green fairways and open sky. Quiet premium atmosphere, no crowds, no signage. Posing naturally as if captured during a casual round, relaxed posture holding a smartphone or standing comfortably. Calm, confident, and composed expression. Soft natural daylight, clean background with no clutter.', 
    icon: '⛳' 
  },
  { 
    id: 'car_side_mirror', 
    name: '사이드미러 셀피', 
    category: 'Commercial', 
    prompt: 'Standing or leaning beside a parked car while taking a selfie reflected only through the car side mirror. The side mirror and its reflection dominate the frame. Clean mirror surface with no dust, smudges, or stains. No visible car interior. Focus on the side mirror and reflected face and upper body. Background is a clean modern parking tower or quiet urban area with neutral tones and no clutter. Relaxed natural posture holding a smartphone, looking at the screen. Natural soft daylight.', 
    icon: '🪞' 
  },
  { 
    id: 'korean_elevator', 
    name: '엘리베이터 거울', 
    category: 'Indoor', 
    prompt: 'Taking a full body mirror selfie inside a newly built apartment elevator with clean modern interior. Bright silver and beige tones, seamless walls, and a large crystal-clear mirror with no scratches or stains. Soft overhead ambient lighting. Relaxed natural posture, body slightly angled with weight shifted to one leg, looking at the smartphone screen.', 
    icon: '🛗' 
  },
  { 
    id: 'korean_laundromat', 
    name: '24시 코인세탁소', 
    category: 'Commercial', 
    prompt: 'Inside a local Korean 24h coin laundry. Rows of industrial washing machines, white plastic laundry baskets, printed Korean warning signs (blurred), uneven fluorescent tube lighting, slightly worn linoleum floor.', 
    icon: '🧺' 
  },
  { 
    id: 'life_four_cuts', 
    name: '인생네컷 부스', 
    category: 'Commercial', 
    prompt: 'Inside a cramped "Life Four Cuts" (인생네컷) photo booth. Messy pastel curtain background, harsh white LED glow, direct flash glare effect, looking handsome with a cool expression.', 
    icon: '📸' 
  },
  { 
    id: 'korean_convenience', 
    name: '편의점 내부', 
    category: 'Outdoor', 
    prompt: 'Inside a brightly lit local Korean convenience store (GS25/CU style). White flickering LED light, messy shelves stocked with Korean snack brands (blurry), polished floor with scuff marks.', 
    icon: '🏪' 
  },
  { 
    id: 'korean_cafe', 
    name: '동네 감성 카페', 
    category: 'Commercial', 
    prompt: 'Small, cozy neighborhood Korean cafe. Wooden tables with subtle coffee stains, barista bar with visible espresso machine in background, natural soft sunlight coming from a large window.', 
    icon: '☕' 
  },
  { 
    id: 'entrance_mirror', 
    name: '현관문 전신거울', 
    category: 'Indoor', 
    prompt: 'Raw home mirror selfie in a narrow hallway. Cluttered background with stacked sneaker boxes and delivery cardboard, dim natural light, unedited casual smartphone aesthetic.', 
    icon: '🚪' 
  },
  { 
    id: 'drivers_seat', 
    name: '자동차 운전석', 
    category: 'Commercial', 
    prompt: "Handheld shot from a car driver's seat. Sunlight hitting the dashboard, leather seat texture, authentic luxury but casual lifestyle vlog style.", 
    icon: '🚗' 
  },
  { 
    id: 'parking_mirror', 
    name: '주차장 반사경', 
    category: 'Outdoor', 
    prompt: 'Reflected selfie in a large circular convex parking mirror. Distorted edges, dark concrete parking garage background with yellow lines, high ISO grain feel.', 
    icon: '🅿️' 
  },
  { 
    id: 'brick_wall', 
    name: '빈티지 벽돌 담벼락', 
    category: 'Outdoor', 
    prompt: 'Snapshot against a weathered red brick wall with peeling flyers and graffiti tags. Direct harsh sunlight, realistic hard shadows, rough texture, city grime.', 
    icon: '🧱' 
  },
  { 
    id: 'warehouse', 
    name: '창고형 마트', 
    category: 'Commercial', 
    prompt: 'Industrial shot in a warehouse store (Costco style). High metal shelving, bright overhead industrial lights, concrete floor with scuff marks.', 
    icon: '🛒' 
  },
  { 
    id: 'rooftop', 
    name: '루프탑 선셋', 
    category: 'Commercial', 
    prompt: 'Raw golden hour shot on a gravel rooftop. Urban skyline silhouette, lens flare from sunset, city smog on horizon, wind-blown hair effect.', 
    icon: '🌇' 
  },
  { 
    id: 'gym_locker', 
    name: '헬스장 라커룸', 
    category: 'Indoor', 
    prompt: 'Candid gym locker room selfie. Rows of metal lockers with small dents, cool white fluorescent light, sweat on brow, messy gym bag in background.', 
    icon: '💪' 
  },
  { 
    id: 'office_desk', 
    name: '사무실 책상', 
    category: 'Indoor', 
    prompt: 'Handheld snapshot at a cluttered office desk. Glow from dual monitors, tangled charging cables, half-drunk coffee cup, mixed artificial lighting.', 
    icon: '💻' 
  },
  { 
    id: 'bedroom', 
    name: '내방 거울 셀카', 
    category: 'Indoor', 
    prompt: 'Casual bedroom mirror shot. Unmade bed with wrinkled sheets, low afternoon sun casting long shadows, warm domestic atmosphere, phone shadow on floor.', 
    icon: '🛏️' 
  },
  { 
    id: 'escalator', 
    name: '쇼핑몰 에스컬레이터', 
    category: 'Commercial', 
    prompt: 'Snapshot while moving on a mall escalator. Glass panel reflections, bright ceiling spotlights, motion blur of the steps, busy mall background.', 
    icon: '🪜' 
  },
  { 
    id: 'terrace', 
    name: '테라스 카페', 
    category: 'Commercial', 
    prompt: 'Outdoor terrace snap. Marble table with crumbs, street traffic in background, natural afternoon shade, street noise vibe.', 
    icon: '🍰' 
  },
  { 
    id: 'basketball', 
    name: '농구 코트', 
    category: 'Commercial', 
    prompt: 'Urban basketball court. Cracked blue paint, chain-link fence, bright sunlight, athletic urban aesthetic, grainy low light.', 
    icon: '🏀' 
  },
  { 
    id: 'tunnel', 
    name: '지하 보도 터널', 
    category: 'Commercial', 
    prompt: 'Moody shot in a long underground pedestrian tunnel. Repetitive ceiling lights, greenish fluorescent tint, high contrast, dirty tiles.', 
    icon: '🚇' 
  },
  { 
    id: 'bathroom', 
    name: '호텔 화장실 거울', 
    category: 'Indoor', 
    prompt: 'A real mirror shot in a hotel bathroom. Slight condensation on glass, harsh overhead spotlight creating face shadows, messy sink counter.', 
    icon: '🚿' 
  },
];
