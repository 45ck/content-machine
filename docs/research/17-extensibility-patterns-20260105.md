# Extensibility Patterns for Video Generation Pipelines

**Research Date:** 2026-01-05  
**Status:** Research Complete  
**Scope:** Plugin architectures, provider abstraction, pipeline extensibility, hook systems

---

## Executive Summary

This document analyzes software engineering patterns for building extensible/modular video generation pipelines. Patterns were extracted from:

- **MoneyPrinterTurbo** - Provider switching for LLM/TTS/stock footage
- **short-video-maker-gyori** - Constructor injection, library abstraction
- **openai-agents-js** - Tool registration, lifecycle hooks, model provider interface
- **LangChain** - Abstract base classes, callback handlers, tool decorators
- **n8n** - Directory loader, package-based node registration

---

## 1. Provider Abstraction Patterns

### Pattern 1A: Configuration-Driven Provider Switching (MoneyPrinterTurbo)

The simplest pattern - switch providers via config without changing code:

```python
# MoneyPrinterTurbo approach: provider selection via config string
def _generate_response(prompt: str) -> str:
    llm_provider = config.app.get("llm_provider", "openai")
    
    if llm_provider == "moonshot":
        api_key = config.app.get("moonshot_api_key")
        model_name = config.app.get("moonshot_model_name")
        base_url = "https://api.moonshot.cn/v1"
    elif llm_provider == "ollama":
        api_key = "ollama"
        model_name = config.app.get("ollama_model_name")
        base_url = config.app.get("ollama_base_url", "http://localhost:11434/v1")
    elif llm_provider == "openai":
        api_key = config.app.get("openai_api_key")
        model_name = config.app.get("openai_model_name")
        base_url = config.app.get("openai_base_url", "https://api.openai.com/v1")
    # ... 12+ more providers
```

**Pros:** Simple, no abstractions needed  
**Cons:** Large switch statements, hard to add new providers, no type safety

### Pattern 1B: Abstract Base Class with Interface Contract (LangChain)

LangChain defines abstract base classes that all providers must implement:

```python
# langchain_core/language_models/base.py
class BaseLanguageModel(RunnableSerializable[LanguageModelInput, LanguageModelOutputVar], ABC):
    """Abstract base class for interfacing with language models."""
    
    cache: BaseCache | bool | None = Field(default=None, exclude=True)
    verbose: bool = Field(default_factory=_get_verbosity, exclude=True)
    callbacks: Callbacks = Field(default=None, exclude=True)
    
    @abstractmethod
    def generate_prompt(
        self,
        prompts: list[PromptValue],
        stop: list[str] | None = None,
        callbacks: Callbacks = None,
        **kwargs: Any,
    ) -> LLMResult:
        """Pass prompts to the model and return generations."""
        
    @abstractmethod
    async def agenerate_prompt(
        self,
        prompts: list[PromptValue],
        stop: list[str] | None = None,
        callbacks: Callbacks = None,
        **kwargs: Any,
    ) -> LLMResult:
        """Async version of generate_prompt."""
```

**Pros:** Type-safe, clear contract, IDE support  
**Cons:** More complex, requires inheritance

### Pattern 1C: Interface-Based Model Provider (openai-agents-js)

TypeScript interface pattern with factory:

```typescript
// openai-agents-js approach
export interface Model {
  getResponse(request: ModelRequest): Promise<ModelResponse>;
  getStreamedResponse(request: ModelRequest): AsyncIterable<StreamEvent>;
}

export interface ModelProvider {
  getModel(modelName?: string): Promise<Model> | Model;
}

// Global default provider registration
let DEFAULT_PROVIDER: ModelProvider | undefined;

export function setDefaultModelProvider(provider: ModelProvider) {
  DEFAULT_PROVIDER = provider;
}

export function getDefaultModelProvider(): ModelProvider {
  if (typeof DEFAULT_PROVIDER === 'undefined') {
    throw new Error('No default model provider set.');
  }
  return DEFAULT_PROVIDER;
}
```

**Pros:** Clean separation, easy testing  
**Cons:** Requires explicit provider setup

---

## 2. Plugin/Tool Registration Patterns

### Pattern 2A: Function-to-Tool Decorator (LangChain)

Convert any function to a tool with schema validation:

```python
# langchain_core/tools/base.py
class BaseTool(RunnableSerializable[str | dict | ToolCall, Any]):
    name: str
    description: str
    args_schema: ArgsSchema | None = Field(default=None)
    return_direct: bool = False
    handle_tool_error: bool | str | Callable[[ToolException], str] | None = False
    response_format: Literal["content", "content_and_artifact"] = "content"
    
    @abstractmethod
    def _run(self, *args: Any, **kwargs: Any) -> Any:
        """Use the tool. Override in subclass."""

# Schema inference from function signature
def create_schema_from_function(
    model_name: str,
    func: Callable,
    *,
    filter_args: Sequence[str] | None = None,
    parse_docstring: bool = False,
) -> type[BaseModel]:
    """Create a Pydantic schema from a function's signature."""
    sig = inspect.signature(func)
    # Automatically builds args_schema from type hints
```

### Pattern 2B: Typed Tool Factory (openai-agents-js)

Type-safe tool creation with Zod schema validation:

```typescript
// openai-agents-js tool pattern
export type FunctionTool<
  Context = UnknownContext,
  TParameters extends ToolInputParameters = undefined,
  Result = unknown,
> = {
  type: 'function';
  name: string;
  description: string;
  parameters: JsonObjectSchema<any>;
  strict: boolean;
  invoke: (runContext: RunContext<Context>, input: string) => Promise<string | Result>;
  needsApproval: ToolApprovalFunction<TParameters>;
  isEnabled: ToolEnabledFunction<Context>;
};

// Tool factory function
export function tool<TParameters, Context, Result>(
  options: ToolOptions<TParameters, Context>,
): FunctionTool<Context, TParameters, Result> {
  const name = options.name ?? toFunctionToolName(options.execute.name);
  const { parser, schema: parameters } = getSchemaAndParserFromInputType(options.parameters, name);
  
  async function invoke(runContext: RunContext<Context>, input: string): Promise<Result> {
    const [error, parsed] = await safeExecute(() => parser(input));
    if (error !== null) {
      throw new InvalidToolInputError('Invalid JSON input');
    }
    return options.execute(parsed, runContext);
  }
  
  return { type: 'function', name, description: options.description, parameters, invoke, ... };
}
```

### Pattern 2C: Package-Based Node Registration (n8n)

Dynamic discovery and loading from packages:

```typescript
// n8n directory-loader.ts
export abstract class DirectoryLoader {
  loadedNodes: INodeTypeNameVersion[] = [];
  nodeTypes: INodeTypeData = {};
  credentialTypes: ICredentialTypeData = {};
  known: KnownNodesAndCredentials = { nodes: {}, credentials: {} };
  
  loadNodeFromFile(filePath: string, packageVersion?: string) {
    const tempNode = this.loadClass<INodeType | IVersionedNodeType>(filePath);
    this.addCodex(tempNode, filePath);
    
    const nodeType = tempNode.description.name;
    this.known.nodes[nodeType] = {
      className: tempNode.constructor.name,
      sourcePath: filePath,
    };
    this.nodeTypes[nodeType] = { type: tempNode, sourcePath: filePath };
    this.loadedNodes.push({ name: nodeType, version: nodeVersion });
  }
  
  private loadClass<T>(sourcePath: string) {
    const filePath = this.resolvePath(sourcePath);
    const [className] = path.parse(sourcePath).name.split('.');
    return loadClassInIsolation<T>(filePath, className);
  }
}
```

**n8n package.json structure for auto-discovery:**
```typescript
export namespace n8n {
  export interface PackageJson {
    name: string;
    version: string;
    n8n?: {
      credentials?: string[];  // paths to credential files
      nodes?: string[];        // paths to node files
    };
  }
}
```

---

## 3. Constructor Injection Pattern (short-video-maker-gyori)

Clean dependency injection for library components:

```typescript
// ShortCreator with explicit dependencies
export class ShortCreator {
  constructor(
    private config: Config,
    private remotion: Remotion,
    private kokoro: Kokoro,      // TTS provider
    private whisper: Whisper,    // ASR provider
    private ffmpeg: FFMpeg,      // Video processing
    private pexelsApi: PexelsAPI, // Stock footage provider
    private musicManager: MusicManager,
  ) {}

  private async createShort(videoId: string, inputScenes: SceneInput[], config: RenderConfig) {
    // Uses injected services
    const audio = await this.kokoro.generate(scene.text, config.voice ?? "af_heart");
    const captions = await this.whisper.CreateCaption(tempWavPath);
    const video = await this.pexelsApi.findVideo(scene.searchTerms, audioLength, ...);
    await this.remotion.render({ music, scenes, config }, videoId, orientation);
  }
}

// Library wrapper with static init factory
export class Kokoro {
  constructor(private tts: KokoroTTS) {}
  
  static async init(dtype: kokoroModelPrecision): Promise<Kokoro> {
    const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype, device: "cpu" });
    return new Kokoro(tts);
  }
  
  async generate(text: string, voice: Voices): Promise<{ audio: ArrayBuffer; audioLength: number }> {
    // Implementation
  }
  
  listAvailableVoices(): Voices[] {
    return Object.values(VoiceEnum) as Voices[];
  }
}
```

**Benefits:**
- Each provider can be easily swapped
- Testing with mocks is straightforward
- Clear separation of concerns

---

## 4. Hook/Event Systems

### Pattern 4A: Mixin-Based Callback Handlers (LangChain)

Composable callback mixins for different concerns:

```python
# langchain_core/callbacks/base.py
class LLMManagerMixin:
    """Mixin for LLM callbacks."""
    
    def on_llm_new_token(self, token: str, *, chunk=None, run_id: UUID, **kwargs):
        """Run on new output token. Only available when streaming is enabled."""
        
    def on_llm_end(self, response: LLMResult, *, run_id: UUID, **kwargs):
        """Run when LLM ends running."""
        
    def on_llm_error(self, error: BaseException, *, run_id: UUID, **kwargs):
        """Run when LLM errors."""

class ChainManagerMixin:
    """Mixin for chain callbacks."""
    
    def on_chain_end(self, outputs: dict[str, Any], *, run_id: UUID, **kwargs):
        """Run when chain ends running."""
        
    def on_agent_action(self, action: AgentAction, *, run_id: UUID, **kwargs):
        """Run on agent action."""

class ToolManagerMixin:
    """Mixin for tool callbacks."""
    
    def on_tool_end(self, output: Any, *, run_id: UUID, **kwargs):
        """Run when tool ends."""
        
    def on_tool_error(self, error: BaseException, *, run_id: UUID, **kwargs):
        """Run when tool errors."""

# Compose into a full handler
class BaseCallbackHandler(
    LLMManagerMixin,
    ChainManagerMixin,
    ToolManagerMixin,
    RetrieverManagerMixin,
):
    """Base callback handler."""
```

### Pattern 4B: Typed Event Emitter (openai-agents-js)

Type-safe lifecycle events:

```typescript
// Strongly typed event definitions
export type AgentHookEvents<TContext, TOutput> = {
  agent_start: [context: RunContext<TContext>, agent: Agent<TContext, TOutput>, turnInput?: AgentInputItem[]];
  agent_end: [context: RunContext<TContext>, output: string];
  agent_handoff: [context: RunContext<TContext>, nextAgent: Agent<any, any>];
  agent_tool_start: [context: RunContext<TContext>, tool: Tool<any>, details: { toolCall: ToolCallItem }];
  agent_tool_end: [context: RunContext<TContext>, tool: Tool<any>, result: string, details: { toolCall: ToolCallItem }];
};

// Event emitter delegate pattern
export abstract class EventEmitterDelegate<EventTypes extends EventEmitterEvents> 
  implements EventEmitter<EventTypes> {
  protected abstract eventEmitter: EventEmitter<EventTypes>;

  on<K extends keyof EventTypes>(type: K, listener: (...args: EventTypes[K]) => void): EventEmitter<EventTypes> {
    this.eventEmitter.on(type, listener);
    return this.eventEmitter;
  }
  
  emit<K extends keyof EventTypes>(type: K, ...args: EventTypes[K]): boolean {
    return this.eventEmitter.emit(type, ...args);
  }
}

// Agent hooks inherit from delegate
export class AgentHooks<TContext, TOutput> extends EventEmitterDelegate<AgentHookEvents<TContext, TOutput>> {
  protected eventEmitter = new RuntimeEventEmitter<AgentHookEvents<TContext, TOutput>>();
}
```

---

## 5. Configuration-Driven Extensibility

### Pattern 5A: Zod Schema for Type-Safe Config (short-video-maker-gyori)

```typescript
// shorts.ts - Type-safe enums and config
export enum MusicMoodEnum {
  sad = "sad", melancholic = "melancholic", happy = "happy",
  euphoric = "euphoric/high", excited = "excited", chill = "chill",
}

export enum CaptionPositionEnum {
  top = "top", center = "center", bottom = "bottom",
}

export const renderConfig = z.object({
  paddingBack: z.number().optional(),
  music: z.nativeEnum(MusicMoodEnum).optional(),
  captionPosition: z.nativeEnum(CaptionPositionEnum).optional(),
  captionBackgroundColor: z.string().optional(),
  voice: z.nativeEnum(VoiceEnum).optional(),
  orientation: z.nativeEnum(OrientationEnum).optional(),
  musicVolume: z.nativeEnum(MusicVolumeEnum).optional(),
});
export type RenderConfig = z.infer<typeof renderConfig>;

export const sceneInput = z.object({
  text: z.string().describe("Text to be spoken in the video"),
  searchTerms: z.array(z.string()).describe("Search terms for video"),
});
export type SceneInput = z.infer<typeof sceneInput>;
```

### Pattern 5B: Environment-Based Provider Selection (MoneyPrinterTurbo)

```python
# voice.py - TTS provider switching via voice name prefix
def is_siliconflow_voice(voice_name: str):
    """Check if voice is from SiliconFlow provider."""
    return voice_name.startswith("siliconflow:")

def is_gemini_voice(voice_name: str):
    """Check if voice is from Gemini TTS provider."""
    return voice_name.startswith("gemini:")

def tts(text: str, voice_name: str, voice_rate: float, voice_file: str) -> SubMaker | None:
    if is_azure_v2_voice(voice_name):
        return azure_tts_v2(text, voice_name, voice_file)
    elif is_siliconflow_voice(voice_name):
        # Parse: "siliconflow:model:voice-Gender"
        parts = voice_name.split(":")
        model, voice = parts[1], parts[2].split("-")[0]
        return siliconflow_tts(text, model, f"{model}:{voice}", voice_rate, voice_file)
    elif is_gemini_voice(voice_name):
        voice = voice_name.split(":")[1].split("-")[0]
        return gemini_tts(text, voice, voice_rate, voice_file)
    return azure_tts_v1(text, voice_name, voice_rate, voice_file)
```

---

## 6. Recommended Patterns for content-machine

### 6.1 Provider Interface (TypeScript)

```typescript
// src/common/providers/types.ts
export interface TTSProvider {
  readonly name: string;
  readonly supportedVoices: string[];
  generate(text: string, voice: string, options?: TTSOptions): Promise<TTSResult>;
  listVoices(): Promise<VoiceInfo[]>;
}

export interface ASRProvider {
  readonly name: string;
  transcribe(audioPath: string, options?: ASROptions): Promise<TranscriptionResult>;
}

export interface LLMProvider {
  readonly name: string;
  generate(prompt: string, options?: LLMOptions): Promise<LLMResult>;
  generateStream(prompt: string, options?: LLMOptions): AsyncIterable<LLMChunk>;
}

export interface StockFootageProvider {
  readonly name: string;
  search(query: string, options: FootageSearchOptions): Promise<FootageResult[]>;
  download(url: string, destPath: string): Promise<void>;
}
```

### 6.2 Provider Registry

```typescript
// src/common/providers/registry.ts
export class ProviderRegistry<T> {
  private providers = new Map<string, T>();
  private defaultProvider?: string;

  register(name: string, provider: T, isDefault = false): void {
    this.providers.set(name, provider);
    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = name;
    }
  }

  get(name?: string): T {
    const providerName = name ?? this.defaultProvider;
    if (!providerName) throw new Error('No provider specified and no default set');
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Provider "${providerName}" not found`);
    return provider;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Usage
export const ttsProviders = new ProviderRegistry<TTSProvider>();
export const asrProviders = new ProviderRegistry<ASRProvider>();
export const llmProviders = new ProviderRegistry<LLMProvider>();
```

### 6.3 Pipeline Hooks

```typescript
// src/common/pipeline/hooks.ts
export type PipelineStage = 
  | 'trend_research'
  | 'content_planning'
  | 'script_generation'
  | 'tts_synthesis'
  | 'capture'
  | 'render'
  | 'review'
  | 'publish';

export type HookPhase = 'before' | 'after' | 'error';

export interface PipelineHook {
  stage: PipelineStage;
  phase: HookPhase;
  handler: (context: PipelineContext, data: unknown) => Promise<void>;
  priority?: number;
}

export class PipelineHookManager {
  private hooks: PipelineHook[] = [];

  register(hook: PipelineHook): void {
    this.hooks.push(hook);
    this.hooks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  async emit(stage: PipelineStage, phase: HookPhase, context: PipelineContext, data: unknown): Promise<void> {
    const relevantHooks = this.hooks.filter(h => h.stage === stage && h.phase === phase);
    for (const hook of relevantHooks) {
      await hook.handler(context, data);
    }
  }
}
```

### 6.4 Content Archetype Registry

```typescript
// src/common/archetypes/types.ts
export interface ContentArchetype {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly promptTemplate: string;
  readonly defaultConfig: Partial<RenderConfig>;
  readonly requiredCapabilities: string[];
  
  validateInput(input: unknown): ValidationResult;
  generateScenes(input: unknown, context: PipelineContext): Promise<SceneInput[]>;
}

export class ArchetypeRegistry {
  private archetypes = new Map<string, ContentArchetype>();

  register(archetype: ContentArchetype): void {
    this.archetypes.set(archetype.id, archetype);
  }

  get(id: string): ContentArchetype | undefined {
    return this.archetypes.get(id);
  }

  list(): ContentArchetype[] {
    return Array.from(this.archetypes.values());
  }
}

// Example built-in archetypes
// - product_demo: Product feature demonstrations
// - tech_tip: Quick developer tips
// - trend_explainer: Explain trending topics
// - comparison: A vs B comparisons
```

---

## 7. Key Takeaways

| Pattern | When to Use | Example Source |
|---------|-------------|----------------|
| Config-driven switch | Quick prototypes, few providers | MoneyPrinterTurbo |
| Abstract base class | Type-safe, many providers | LangChain |
| Interface + factory | TypeScript, clean DI | openai-agents-js |
| Constructor injection | Testable services | short-video-maker-gyori |
| Mixin callbacks | Composable event handling | LangChain |
| Typed event emitter | Type-safe hooks | openai-agents-js |
| Package-based registry | Plugin discovery | n8n |
| Zod schemas | Type-safe config | short-video-maker-gyori |

---

## 8. Implementation Priority for content-machine

1. **Phase 1 (Foundation):**
   - Define provider interfaces (TTS, ASR, LLM, Stock)
   - Implement provider registry pattern
   - Create Zod schemas for pipeline config

2. **Phase 2 (Pipeline):**
   - Implement pipeline hook manager
   - Add before/after/error hooks for each stage
   - Create PipelineContext for state management

3. **Phase 3 (Extensibility):**
   - Content archetype registry
   - Plugin loading from packages (n8n pattern)
   - Configuration-driven provider selection

---

## References

- [MoneyPrinterTurbo llm.py](vendor/MoneyPrinterTurbo/app/services/llm.py)
- [MoneyPrinterTurbo voice.py](vendor/MoneyPrinterTurbo/app/services/voice.py)
- [short-video-maker-gyori ShortCreator.ts](vendor/short-video-maker-gyori/src/short-creator/ShortCreator.ts)
- [openai-agents-js tool.ts](vendor/openai-agents-js/packages/agents-core/src/tool.ts)
- [openai-agents-js lifecycle.ts](vendor/openai-agents-js/packages/agents-core/src/lifecycle.ts)
- [LangChain base.py (language_models)](vendor/agents/langchain/libs/core/langchain_core/language_models/base.py)
- [LangChain base.py (tools)](vendor/agents/langchain/libs/core/langchain_core/tools/base.py)
- [LangChain base.py (callbacks)](vendor/agents/langchain/libs/core/langchain_core/callbacks/base.py)
- [n8n directory-loader.ts](vendor/orchestration/n8n/packages/core/src/nodes-loader/directory-loader.ts)
