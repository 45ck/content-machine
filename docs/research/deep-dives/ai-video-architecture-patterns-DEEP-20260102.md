# Deep Dive: AI Video Generation Architecture Patterns

**Date:** 2026-01-02  
**Repos:** `vendor/Clip-Anything/`, `vendor/VideoGraphAI/`, Various generators  
**Priority:** ⭐ CRITICAL - Architecture patterns for AI-driven video generation

---

## Executive Summary

Analysis of advanced AI-driven video generation patterns across multiple repos. These represent the most sophisticated approaches to automated content creation, combining multimodal AI, agent orchestration, and end-to-end pipelines.

### Pattern Categories

| Pattern | Example Repo | Key Innovation |
|---------|-------------|----------------|
| **Multimodal Clipping** | Clip-Anything | Prompt-based video segment extraction |
| **Agent Graph Pipeline** | VideoGraphAI | LangGraph-style agent orchestration |
| **LLM-Guided Editing** | FunClip | LLM selects viral moments from transcript |
| **Research-to-Video** | VideoGraphAI | Web research → script → video |

### Recommendation

Adopt the **Agent Graph Pipeline** pattern from VideoGraphAI as our primary architecture, enhanced with multimodal clipping from Clip-Anything for long-to-short conversion.

---

## Pattern 1: Multimodal Prompt-Based Clipping (Clip-Anything)

### Overview

Use natural language prompts to extract relevant video segments. Combines ASR transcription with LLM analysis.

### Architecture

```
Input Video
    ↓
Whisper Transcription (with timestamps)
    ↓
LLM Analysis (match prompt to transcript)
    ↓
Segment Extraction (MoviePy/FFmpeg)
    ↓
Output Clips
```

### Key Implementation

```python
# Step 1: Transcribe video with timestamps
def transcribe_video(video_path, model_name="base"):
    model = whisper.load_model(model_name)
    
    # Extract audio
    audio_path = "temp_audio.wav"
    os.system(f"ffmpeg -i {video_path} -ar 16000 -ac 1 -f mp3 {audio_path}")
    
    result = model.transcribe(audio_path)
    
    transcription = []
    for segment in result['segments']:
        transcription.append({
            'start': segment['start'],
            'end': segment['end'],
            'text': segment['text'].strip()
        })
    
    return transcription
```

```python
# Step 2: LLM identifies relevant segments
def get_relevant_segments(transcript, user_query):
    prompt = f"""You are an expert video editor. Given a transcript with segments, 
identify all conversations related to the user query.

Guidelines:
1. The conversation should be relevant to the user query
2. Include context before and after
3. Don't cut off in the middle of a sentence
4. Choose multiple relevant conversations
5. Match start/end times from segment timestamps

Output format: {{ "conversations": [{{"start": "s1", "end": "e1"}}, ...] }}

Transcript:
{transcript}

User query:
{user_query}"""

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": "Bearer KEY"},
        json={
            "model": "llama-3.1-70b-versatile",
            "messages": [{"role": "system", "content": prompt}],
        }
    )
    
    data = response.json()["choices"][0]["message"]["content"]
    conversations = ast.literal_eval(data)["conversations"]
    return conversations
```

```python
# Step 3: Extract and compile clips
def edit_video(original_video_path, segments, output_path, fade_duration=0.5):
    video = VideoFileClip(original_video_path)
    clips = []
    
    for seg in segments:
        clip = (
            video.subclip(seg['start'], seg['end'])
            .fadein(fade_duration)
            .fadeout(fade_duration)
        )
        clips.append(clip)
    
    if clips:
        final_clip = concatenate_videoclips(clips, method="compose")
        final_clip.write_videofile(output_path, codec="libx264", audio_codec="aac")
```

### Use Cases

- Extract product demo moments from long videos
- Find mentions of specific features
- Create highlight reels
- Long-to-short conversion

---

## Pattern 2: Agent Graph Pipeline (VideoGraphAI)

### Overview

Full agent-based pipeline using graph orchestration. Each agent specializes in one task, passing results to the next.

### Agent Architecture

```
RecentEventsResearchAgent (Tavily Search)
    ↓
TitleGenerationAgent (LLM)
    ↓
TitleSelectionAgent (LLM)
    ↓
DescriptionGenerationAgent (LLM)
    ↓
HashtagAndTagGenerationAgent (LLM)
    ↓
VideoScriptGenerationAgent (LLM)
    ↓
ImageGenerationAgent (Together AI FLUX)
    ↓
StoryboardGenerationAgent (LLM)
    ↓
VoiceoverGeneration (F5-TTS)
    ↓
SubtitleAlignment (Gentle)
    ↓
VideoCompilation (FFmpeg)
```

### Graph Implementation

```python
# Abstract Agent class
class Agent(ABC):
    def __init__(self, name: str, model: str):
        self.name = name
        self.model = model

    @abstractmethod
    async def execute(self, input_data: Any) -> Any:
        pass

# Node wraps agent or tool
class Node:
    def __init__(self, agent: Agent = None, tool: Tool = None):
        self.agent = agent
        self.tool = tool
        self.edges: List['Edge'] = []

    async def process(self, input_data: Any) -> Any:
        if self.agent:
            return await self.agent.execute(input_data)
        elif self.tool:
            return await self.tool.use(input_data)

# Edge connects nodes
class Edge:
    def __init__(self, source: Node, target: Node, condition=None):
        self.source = source
        self.target = target
        self.condition = condition

# Graph orchestrates workflow
class Graph:
    def __init__(self):
        self.nodes: List[Node] = []
        self.edges: List[Edge] = []

    def add_node(self, node: Node):
        self.nodes.append(node)

    def add_edge(self, edge: Edge):
        self.edges.append(edge)
        edge.source.edges.append(edge)
```

### Key Agent Implementations

**Research Agent (Web Search):**
```python
class RecentEventsResearchAgent(Agent):
    def __init__(self):
        super().__init__("Recent Events Research Agent", "llama-3.1-70b-versatile")
        self.web_search_tool = WebSearchTool()

    async def execute(self, input_data: Dict) -> Any:
        topic = input_data['topic']
        time_frame = input_data['time_frame']
        
        search_query = f"{topic} events in the {time_frame}"
        search_results = await self.web_search_tool.use(search_query)
        
        # LLM summarizes results
        prompt = f"""Analyze and summarize the most engaging {topic} events...
        Search Results: {json.dumps(search_results[:10])}"""
        
        response = await self.llm.complete(prompt)
        return response
```

**Script Generation Agent:**
```python
class VideoScriptGenerationAgent(Agent):
    async def execute(self, input_data: Dict) -> Any:
        research = input_data.get('research', '')
        video_length = input_data.get('video_length', 180)
        
        prompt = f"""Craft a {video_length}-second script for a vertical video:

{research}

Include:
1. Attention-grabbing opening hook
2. Key points presented concisely
3. Strong call-to-action conclusion

Format with clear timestamps."""
        
        return await self.llm.complete(prompt)
```

**Image Generation Agent:**
```python
class ImageGenerationAgent(Agent):
    def __init__(self):
        super().__init__("Image Generation Agent", "FLUX.1-schnell")
        self.client = Together(api_key=together_api_key)

    async def execute(self, input_data: Dict) -> Any:
        scenes = input_data.get('scenes', [])
        results = []

        for scene in scenes:
            prompt = f"""Create a hyper-realistic scene: {scene['visual']}
            Focus on: {scene['image_keyword']}"""
            
            response = self.client.images.generate(
                prompt=prompt,
                model=self.model,
                width=768,
                height=1024,  # Vertical!
                n=1,
                response_format="b64_json"
            )
            
            # Save image
            image_data = base64.b64decode(response.data[0].b64_json)
            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as f:
                f.write(image_data)
                results.append({'image_path': f.name})
        
        return results
```

### Storyboard Parsing

```python
def parse_scenes(self, response: str) -> List[Dict]:
    """Parse LLM storyboard output into structured scenes."""
    scenes = []
    current_scene = {}
    
    for line in response.split('\n'):
        line = line.strip()
        
        # Detect scene number
        if line.startswith(tuple(f"{i}." for i in range(1, 51))):
            if current_scene:
                scenes.append(self.validate_scene(current_scene))
            current_scene = {'number': int(line.split('.')[0])}
        
        # Extract key-value pairs
        elif ':' in line:
            key, value = line.split(':', 1)
            current_scene[key.strip().lower()] = value.strip()
    
    # Don't forget last scene
    if current_scene:
        scenes.append(self.validate_scene(current_scene))
    
    return scenes
```

### Subtitle Generation with Gentle

```python
def align_with_gentle(audio_file: str, transcript_file: str) -> dict:
    """Aligns audio and text using Gentle forced aligner."""
    url = 'http://localhost:8765/transcriptions?async=false'
    files = {
        'audio': open(audio_file, 'rb'),
        'transcript': open(transcript_file, 'r')
    }
    response = requests.post(url, files=files)
    return response.json()

def gentle_alignment_to_ass(alignment: dict, ass_file: str):
    """Convert Gentle alignment to ASS subtitle format."""
    with open(ass_file, 'w') as f:
        # Write ASS header with styling
        f.write("""[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, ...
Style: Default,Verdana,13,&H00FFFFFF,...

[Events]
Format: Layer, Start, End, Style, Name, ..., Text
""")
        
        words = alignment.get('words', [])
        i = 0
        while i < len(words):
            if words[i].get('start') is None:
                i += 1
                continue
            
            # Group 2 words per subtitle
            text_words = []
            for j in range(2):
                if i + j < len(words):
                    text_words.append(words[i + j].get('word', ''))
            
            start = format_ass_time(words[i]['start'])
            end = format_ass_time(words[i + len(text_words) - 1].get('end'))
            
            # First word highlighted, second word white
            dialogue_text = f"{{\\c&H0080FF&}}{text_words[0]} {{\\c&HFFFFFF&}}{text_words[1] if len(text_words) > 1 else ''}"
            
            f.write(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{dialogue_text}\n")
            i += len(text_words)
```

### Video Compilation

```python
def compile_youtube_short(scenes: List[Dict], audio_file: str) -> str:
    temp_dir = tempfile.mkdtemp()
    scene_files = []
    
    # Process each scene
    for i, scene in enumerate(scenes):
        duration = scene.get('adjusted_duration', 3.0)
        
        if 'image_path' in scene:
            # Create video from image with zoom effect
            processed = apply_zoom_effect(scene['image_path'], duration, temp_dir, i)
        else:
            # Fallback colored scene
            processed = create_fallback_scene(temp_dir, i, duration, scene.get('text', ''))
        
        scene_files.append(processed)
    
    # Create concat file
    concat_file = os.path.join(temp_dir, 'concat.txt')
    with open(concat_file, 'w') as f:
        for file in scene_files:
            f.write(f"file '{file}'\n")
    
    # FFmpeg final assembly
    output_path = "youtube_short.mp4"
    subprocess.run([
        'ffmpeg', '-y',
        '-f', 'concat', '-safe', '0', '-i', concat_file,
        '-i', audio_file,
        '-vf', f"subtitles='{subtitle_file}'",
        '-c:v', 'libx264', '-c:a', 'aac', '-shortest',
        output_path
    ])
    
    return output_path

def apply_zoom_effect(image_path: str, duration: float, temp_dir: str, i: int) -> str:
    """Apply Ken Burns zoom effect to image."""
    output = os.path.join(temp_dir, f"scene_{i}.mp4")
    
    subprocess.run([
        'ffmpeg', '-y',
        '-loop', '1', '-i', image_path,
        '-t', str(duration),
        '-filter_complex', f"zoompan=z='min(zoom+0.0015,1.5)':d={duration*30}:s=1080x1920",
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        output
    ])
    
    return output
```

---

## Pattern 3: Streamlit UI Integration

### Overview

VideoGraphAI uses Streamlit for user interface, making it easy to trigger pipelines.

```python
def main():
    st.set_page_config(page_title="YouTube Shorts Generator", page_icon="🎥")
    st.title("YouTube Shorts Generator")

    # Input fields
    topic = st.text_input("Enter the topic:")
    time_frame = st.text_input("Time frame (e.g., 'past week'):")
    video_length = st.number_input("Video length in seconds:")
    
    # Optional user script
    user_script = st.text_area("Your own script (optional):")

    if st.button("Generate YouTube Shorts"):
        with st.spinner("Generating... (3-5 minutes)"):
            results = asyncio.run(youtube_shorts_workflow(
                topic, time_frame, video_length, user_script
            ))
            display_results(results)

def display_results(results):
    for agent_name, result in results.items():
        with st.expander(f"{agent_name}"):
            st.write(result)
    
    if "Output Video Path" in results:
        st.video(results["Output Video Path"])
```

---

## TypeScript Adaptation

### Agent Framework

```typescript
// src/agents/types.ts
export interface AgentContext {
  topic: string;
  timeFrame: string;
  videoLength: number;
}

export interface AgentResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export abstract class Agent<TInput, TOutput> {
  abstract name: string;
  abstract execute(input: TInput): Promise<AgentResult<TOutput>>;
}
```

### Research Agent

```typescript
// src/agents/ResearchAgent.ts
import { Agent, AgentResult } from './types';

interface ResearchInput {
  topic: string;
  timeFrame: string;
}

interface ResearchOutput {
  summary: string;
  sources: string[];
}

export class ResearchAgent extends Agent<ResearchInput, ResearchOutput> {
  name = 'ResearchAgent';
  
  async execute(input: ResearchInput): Promise<AgentResult<ResearchOutput>> {
    // Use MCP to search
    const searchResults = await this.mcpClient.call('search_reddit', {
      query: input.topic,
      time_filter: input.timeFrame,
      limit: 20,
    });
    
    // LLM summarizes
    const summary = await this.llm.complete({
      model: 'claude-sonnet-4-0',
      messages: [{
        role: 'user',
        content: `Summarize these results for a video script:\n${JSON.stringify(searchResults)}`,
      }],
    });
    
    return {
      success: true,
      data: {
        summary: summary.content,
        sources: searchResults.map(r => r.url),
      },
    };
  }
}
```

### Graph Orchestration

```typescript
// src/pipeline/VideoGraph.ts
import { StateGraph, START } from 'langgraph';

interface VideoState {
  topic: string;
  research?: string;
  script?: string;
  scenes?: Scene[];
  audioPath?: string;
  videoPath?: string;
}

const graph = new StateGraph<VideoState>()
  .addNode('research', researchAgent.execute)
  .addNode('script', scriptAgent.execute)
  .addNode('storyboard', storyboardAgent.execute)
  .addNode('images', imageAgent.execute)
  .addNode('tts', ttsAgent.execute)
  .addNode('render', renderAgent.execute)
  .addEdge(START, 'research')
  .addEdge('research', 'script')
  .addEdge('script', 'storyboard')
  .addEdge('storyboard', 'images')
  .addEdge('images', 'tts')
  .addEdge('tts', 'render');

export const videoWorkflow = graph.compile();
```

---

## Best Practices from These Patterns

### 1. Agent Specialization

Each agent does ONE thing well:
- ResearchAgent → Web search
- ScriptAgent → Script generation
- ImageAgent → Image generation
- TTSAgent → Voice synthesis

### 2. Error Handling

```python
try:
    result = await agent.execute(input)
    results[agent.name] = result
except Exception as e:
    logger.error(f"Error in {agent.name}: {str(e)}")
    results["Error"] = f"{agent.name} failed: {str(e)}"
    return results  # Stop pipeline
```

### 3. Scene Validation

Always validate scene data before rendering:
```python
def validate_scene(scene: Dict, scene_number: int) -> Dict:
    required_keys = ['visual', 'text', 'video_keyword', 'image_keyword']
    for key in required_keys:
        if key not in scene:
            scene[key] = f"Default {key} for scene {scene_number}"
            logger.warning(f"Added missing {key}")
    return scene
```

### 4. Duration Adjustment

Scale scene durations to match audio:
```python
total_audio = sum(scene['audio_duration'] for scene in scenes)
total_video = sum(scene['duration'] for scene in scenes)
scaling_factor = total_audio / total_video

for scene in scenes:
    scene['adjusted_duration'] = scene['duration'] * scaling_factor
```

### 5. Fallback Scenes

Always have a fallback for failed media generation:
```python
if 'image_path' not in scene:
    scene['image_path'] = create_colored_background(
        text=scene['text'],
        color='#1a1a2e',
        duration=scene['duration']
    )
```

---

## Recommendations for content-machine

### Adopt These Patterns

1. **Agent Graph Architecture** - Modular, testable, extensible
2. **Multimodal Clipping** - For long-to-short conversion
3. **Forced Alignment** - Gentle or WhisperX for accurate subtitles
4. **Image Generation with Zoom** - Ken Burns effect for static images
5. **Duration Synchronization** - Match video to audio length

### Key Components to Build

1. **Agent Framework** (TypeScript)
2. **MCP-based Research** (Reddit, HN connectors)
3. **TTS with Timestamps** (Kokoro-FastAPI)
4. **Remotion Rendering** (Captions, transitions)
5. **FFmpeg Processing** (Final assembly)

### Architecture Recommendation

```
                    ┌─────────────────────┐
                    │   Streamlit/React   │
                    │        UI           │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Agent Orchestrator │
                    │    (LangGraph-style) │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼───────┐    ┌─────────▼─────────┐    ┌──────▼───────┐
│  Research     │    │   Content Gen     │    │   Media Gen  │
│  Agents       │    │   Agents          │    │   Agents     │
│               │    │                   │    │              │
│ • Reddit MCP  │    │ • Script Gen      │    │ • Image Gen  │
│ • HN API      │    │ • Storyboard      │    │ • TTS        │
│ • Trends      │    │ • Titles/Tags     │    │ • Capture    │
└───────────────┘    └───────────────────┘    └──────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Rendering Layer   │
                    │                     │
                    │ • Remotion          │
                    │ • FFmpeg            │
                    │ • Captions          │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Storage/Queue     │
                    │                     │
                    │ • MinIO             │
                    │ • BullMQ            │
                    └─────────────────────┘
```

---

**Status:** Research complete. Architecture patterns documented.
