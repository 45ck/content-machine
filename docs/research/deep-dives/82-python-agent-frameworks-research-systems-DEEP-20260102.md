# Deep Dive #82: Python Agent Frameworks & Research Systems

**Date:** 2026-01-02
**Category:** Agent Frameworks & AI Research
**Complexity:** High
**Dependencies:** DD-080 (Orchestration), DD-081 (MCP Ecosystem)

---

## Executive Summary

This deep dive covers **Python agent frameworks** (PydanticAI, LlamaIndex) and **AI research systems** (GPT Researcher, Open Deep Research) that are foundational for content-machine's intelligent content generation. These tools enable building production-grade agents for trend research, script generation, and content ideation.

**Key Findings:**
- **PydanticAI:** FastAPI-like ergonomics for agent development, type-safe, model-agnostic
- **LlamaIndex:** Data framework for RAG, 300+ integrations, mature ecosystem
- **GPT Researcher:** Deep research agent with multi-agent architecture, MCP integration
- **Open Deep Research:** LangGraph-based configurable research, Deep Research Bench compatible

---

## 1. PydanticAI

**Repository:** vendor/agents/pydantic-ai
**Stars:** 15k+ | **Language:** Python | **License:** MIT

PydanticAI brings the "FastAPI feeling" to GenAI agent development—elegant, type-safe, and production-ready.

### 1.1 Why PydanticAI?

| Feature | Description |
|---------|-------------|
| **By Pydantic Team** | Validation layer for OpenAI SDK, Anthropic SDK, LangChain, etc. |
| **Model-Agnostic** | OpenAI, Anthropic, Gemini, DeepSeek, Mistral, Ollama, 20+ providers |
| **Type-Safe** | Full IDE completion, static type checking |
| **Observability** | Pydantic Logfire integration (OpenTelemetry) |
| **MCP Integration** | Model Context Protocol support |
| **Human-in-the-Loop** | Tool approval workflows |
| **Durable Execution** | Preserve progress across failures |

### 1.2 Hello World

```python
from pydantic_ai import Agent

# Define a simple agent
agent = Agent(
    'anthropic:claude-sonnet-4-0',
    instructions='Be concise, reply with one sentence.',
)

# Run synchronously
result = agent.run_sync('Where does "hello world" come from?')
print(result.output)
# → The first known use of "hello, world" was in a 1974 textbook about C.
```

### 1.3 Dependency Injection + Tools

```python
from dataclasses import dataclass
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext

@dataclass
class TrendDependencies:
    reddit_client: RedditClient
    trends_api: TrendsAPI

class TrendOutput(BaseModel):
    topic: str = Field(description='Trending topic')
    sentiment: str = Field(description='Positive/Negative/Neutral')
    viral_score: int = Field(description='Score 0-100', ge=0, le=100)

trend_agent = Agent(
    'openai:gpt-4o',
    deps_type=TrendDependencies,
    output_type=TrendOutput,
    instructions='Analyze trending topics for video content potential.',
)

@trend_agent.tool
async def get_reddit_trends(
    ctx: RunContext[TrendDependencies], 
    subreddit: str
) -> list[dict]:
    """Get trending posts from a subreddit."""
    return await ctx.deps.reddit_client.top_posts(subreddit)

@trend_agent.tool
async def get_google_trends(
    ctx: RunContext[TrendDependencies],
    keywords: list[str]
) -> dict:
    """Get Google Trends data."""
    return await ctx.deps.trends_api.interest_over_time(keywords)

# Run agent
async def main():
    deps = TrendDependencies(
        reddit_client=RedditClient(),
        trends_api=TrendsAPI()
    )
    result = await trend_agent.run(
        "Find viral developer tools trends",
        deps=deps
    )
    print(result.output)  # TrendOutput validated!
```

### 1.4 Streaming Outputs

```python
from pydantic_ai import Agent

agent = Agent('openai:gpt-4o')

async def generate_script():
    async with agent.run_stream('Write a 30-second TikTok script') as response:
        async for text in response.stream():
            yield text  # Real-time streaming
```

### 1.5 content-machine Integration Points

| Use Case | Implementation |
|----------|----------------|
| Trend Analysis | Agent with Reddit/HN/Trends tools |
| Script Generation | Structured output with video schema |
| Content Planning | Multi-agent workflow with handoffs |
| Quality Check | Agent with approval gates |

---

## 2. LlamaIndex

**Repository:** vendor/agents/llama-index
**Stars:** 40k+ | **Language:** Python | **License:** MIT

LlamaIndex is the leading data framework for LLM applications—connecting your data to LLMs with 300+ integrations.

### 2.1 Core Concepts

| Concept | Description |
|---------|-------------|
| **Indices** | Data structures for fast LLM retrieval |
| **Retrievers** | Find relevant context for queries |
| **Query Engines** | Answer questions over indexed data |
| **Data Connectors** | Load from APIs, PDFs, DBs, etc. |
| **Embeddings** | Convert text to vectors |
| **Vector Stores** | Store and search embeddings |

### 2.2 Basic RAG Pipeline

```python
import os
os.environ["OPENAI_API_KEY"] = "YOUR_KEY"

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

# Load documents
documents = SimpleDirectoryReader("./docs").load_data()

# Create vector index
index = VectorStoreIndex.from_documents(documents)

# Query
query_engine = index.as_query_engine()
response = query_engine.query("What video formats are supported?")
print(response)
```

### 2.3 Custom LLM + Embeddings

```python
from llama_index.core import Settings, VectorStoreIndex, SimpleDirectoryReader
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.ollama import Ollama

# Use local Ollama model
Settings.llm = Ollama(model="llama3.1")

# Use local embeddings
Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5"
)

# Now all operations use local models
documents = SimpleDirectoryReader("./my-docs").load_data()
index = VectorStoreIndex.from_documents(documents)
```

### 2.4 Integration Ecosystem

| Category | Examples |
|----------|----------|
| **LLMs** | OpenAI, Anthropic, Gemini, Ollama, Replicate |
| **Embeddings** | OpenAI, HuggingFace, Cohere, Voyage |
| **Vector Stores** | Qdrant, Weaviate, Pinecone, Chroma, Milvus |
| **Data Loaders** | PDFs, Notion, Slack, GitHub, S3 |

### 2.5 content-machine Integration

```python
# Index video scripts for similar content retrieval
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.qdrant import QdrantVectorStore

# Connect to Qdrant
vector_store = QdrantVectorStore(
    collection_name="video-scripts",
    client=qdrant_client,
)

# Create index
index = VectorStoreIndex.from_vector_store(vector_store)

# Find similar scripts
query_engine = index.as_query_engine()
similar = query_engine.query(
    "AI coding assistants comparison video script"
)
```

---

## 3. GPT Researcher

**Repository:** vendor/research/gpt-researcher
**Stars:** 25k+ | **Language:** Python | **License:** Apache-2.0

GPT Researcher is an open deep research agent that produces detailed, factual, and unbiased research reports.

### 3.1 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Research Query                         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      PLANNER AGENT                           │
│              Generate research questions                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         ┌─────────┐    ┌─────────┐    ┌─────────┐
         │Crawler 1│    │Crawler 2│    │Crawler N│
         │  Agent  │    │  Agent  │    │  Agent  │
         └────┬────┘    └────┬────┘    └────┬────┘
              │              │              │
              └───────────────┼───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     PUBLISHER AGENT                          │
│              Aggregate into final report                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Quick Start

```python
from gpt_researcher import GPTResearcher

# Simple research
researcher = GPTResearcher(
    query="Why is AI coding assistants market growing?"
)
research_result = await researcher.conduct_research()
report = await researcher.write_report()
print(report)  # Detailed research report with citations
```

### 3.3 MCP Integration

```python
import os
from gpt_researcher import GPTResearcher

# Enable hybrid web + MCP research
os.environ["RETRIEVER"] = "tavily,mcp"

researcher = GPTResearcher(
    query="What are the top AI video generation tools?",
    mcp_configs=[
        {
            "name": "github",
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {"GITHUB_TOKEN": os.getenv("GITHUB_TOKEN")}
        }
    ]
)

research_result = await researcher.conduct_research()
report = await researcher.write_report()
```

### 3.4 Features

| Feature | Description |
|---------|-------------|
| **20+ Sources** | Aggregates from multiple web sources |
| **2,000+ Words** | Detailed research reports |
| **Citations** | Full source tracking |
| **Image Scraping** | Smart image filtering |
| **Local Docs** | Research on your own documents |
| **Multi-Agent** | LangGraph-based team research |
| **Deep Research** | Tree-like recursive exploration |

### 3.5 content-machine Use Cases

| Use Case | Implementation |
|----------|----------------|
| **Trend Research** | Research viral topics in tech niches |
| **Competitor Analysis** | Analyze competing video content |
| **Script Research** | Gather facts for video scripts |
| **Fact Checking** | Verify claims before publishing |

---

## 4. Open Deep Research

**Repository:** vendor/research/open-deep-research
**Stars:** 5k+ | **Language:** Python | **License:** MIT

Open Deep Research is a LangGraph-based configurable deep research agent with benchmark-leading performance.

### 4.1 Architecture

| Stage | Model | Purpose |
|-------|-------|---------|
| **Summarization** | gpt-4.1-mini | Summarize search results |
| **Research** | gpt-4.1 | Power search agent |
| **Compression** | gpt-4.1 | Compress findings |
| **Final Report** | gpt-4.1 | Write comprehensive report |

### 4.2 Quick Start

```bash
# Clone and setup
git clone https://github.com/langchain-ai/open_deep_research.git
cd open_deep_research
uv venv && source .venv/bin/activate
uv sync

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run with LangGraph server
uvx --refresh --from "langgraph-cli[inmem]" \
    --with-editable . --python 3.11 \
    langgraph dev --allow-blocking
```

### 4.3 Configuration Options

```python
# configuration.py
{
    # LLM Settings
    "summarization_model": "openai:gpt-4.1-mini",
    "research_model": "openai:gpt-4.1",
    "compression_model": "openai:gpt-4.1",
    "final_report_model": "openai:gpt-4.1",
    
    # Search Settings
    "search_api": "tavily",  # or "google", "bing", "perplexity"
    
    # MCP Integration
    "mcp_config": [
        {"name": "github", "command": "npx", "args": [...]}
    ]
}
```

### 4.4 Performance (Deep Research Bench)

| Configuration | RACE Score | Cost |
|---------------|------------|------|
| GPT-5 | **0.4943** | - |
| Claude Sonnet 4 | 0.4401 | $187 |
| Defaults (GPT-4.1) | 0.4309 | $46 |
| Submission | 0.4344 | $88 |

### 4.5 content-machine Integration

```python
# Use Open Deep Research for comprehensive topic analysis
from open_deep_research import DeepResearcher

researcher = DeepResearcher(
    research_model="anthropic:claude-sonnet-4",
    search_api="tavily"
)

# Research for video content
result = await researcher.research(
    "What makes developer tool videos go viral on TikTok?"
)

# Use findings for script generation
script_context = result.final_report
```

---

## 5. Comparison Matrix

### 5.1 Agent Frameworks

| Feature | PydanticAI | LlamaIndex | CrewAI | LangGraph |
|---------|------------|------------|--------|-----------|
| **Learning Curve** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Type Safety** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **RAG Support** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Multi-Agent** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Observability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **MCP Support** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |

**Recommendation:**
- **PydanticAI:** Simple agents, structured outputs, type safety
- **LlamaIndex:** RAG pipelines, document retrieval
- **CrewAI:** Multi-agent teams, autonomous research
- **LangGraph:** Complex workflows, state machines

### 5.2 Research Systems

| Feature | GPT Researcher | Open Deep Research |
|---------|----------------|-------------------|
| **Stars** | 25k+ | 5k+ |
| **Architecture** | Plan-and-Execute | LangGraph |
| **MCP Support** | ✅ Yes | ✅ Yes |
| **Benchmarks** | Custom | Deep Research Bench |
| **Multi-Agent** | ✅ Yes (LangGraph) | ✅ Yes |
| **Cost** | ~$0.40/research | ~$46-$187/100 |
| **Report Length** | 2,000+ words | 5-6 pages |

---

## 6. content-machine Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   CONTENT MACHINE RESEARCH                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  TREND AGENT  │     │ SCRIPT AGENT  │     │ QUALITY AGENT │
│  (PydanticAI) │     │  (PydanticAI) │     │  (PydanticAI) │
├───────────────┤     ├───────────────┤     ├───────────────┤
│ reddit_tool   │     │ template_tool │     │ fact_check    │
│ hn_tool       │     │ script_gen    │     │ brand_check   │
│ trends_tool   │     │ hook_gen      │     │ approve_gate  │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   DEEP RESEARCH   │
                    │ (GPT Researcher)  │
                    │                   │
                    │ Comprehensive     │
                    │ topic analysis    │
                    └───────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │    RAG INDEX      │
                    │   (LlamaIndex)    │
                    │                   │
                    │ Past scripts,     │
                    │ successful hooks  │
                    └───────────────────┘
```

---

## 7. Implementation Priority

### Phase 1: Trend Agent (Week 1)
1. PydanticAI agent with Reddit/HN/Trends tools
2. Structured TrendOutput schema
3. MCP server wrapper

### Phase 2: Script Agent (Week 2)
1. LlamaIndex RAG for past successful scripts
2. PydanticAI agent with template tools
3. Streaming output for hook/body/CTA

### Phase 3: Research Integration (Week 3)
1. GPT Researcher for deep topic analysis
2. Fact-checking pipeline
3. Citation tracking

### Phase 4: Quality Gates (Week 4)
1. Human-in-the-loop approval
2. Brand safety checks
3. Automated quality scoring

---

## 8. Key Takeaways

1. **PydanticAI for type-safe agents** - FastAPI-like ergonomics, structured outputs
2. **LlamaIndex for RAG** - Best-in-class document retrieval and indexing
3. **GPT Researcher for deep research** - Comprehensive topic analysis with citations
4. **Open Deep Research for benchmarks** - LangGraph-based, configurable, tested
5. **MCP unifies everything** - All tools support Model Context Protocol
6. **Combine frameworks** - PydanticAI agents + LlamaIndex RAG + GPT Researcher

---

## Related Documents

- [DD-080: Orchestration & Agents](./80-orchestration-job-queues-agent-frameworks-DEEP-20260102.md) - Temporal, n8n, BullMQ
- [DD-081: MCP Ecosystem](./81-mcp-ecosystem-server-infrastructure-DEEP-20260102.md) - FastMCP, MCP servers
- [DD-079: Data Connectors](../79-data-connectors-storage-content-sources-DEEP-20260102.md) - Reddit, HN, Trends APIs

---

**Document Statistics:**
- **Frameworks Covered:** 4 (PydanticAI, LlamaIndex, GPT Researcher, Open Deep Research)
- **Code Examples:** 12+
- **Architecture Diagrams:** 2
- **Comparison Tables:** 3
- **Estimated Reading Time:** 15 minutes
