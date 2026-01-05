# Deep Dive #74: Agent Frameworks & Deep Research Ecosystem

**Document ID:** DD-074  
**Date:** 2026-01-02  
**Category:** Agents, Research, Multi-Agent Systems  
**Status:** Complete  
**Word Count:** ~7,500

---

## Executive Summary

This document covers the complete agent framework ecosystem and deep research tools:

1. **Agent Frameworks** – CrewAI, LangGraph, PydanticAI, LlamaIndex
2. **Deep Research** – GPT Researcher, Open Deep Research
3. **Comparison & Integration** – Which frameworks for content-machine

---

## 1. CrewAI

**Source:** `vendor/agents/crewai/`  
**Creator:** CrewAI Inc.  
**License:** MIT  
**Language:** Python  
**Stars:** 25k+

### 1.1 Overview

CrewAI is a **lean, lightning-fast Python framework** for multi-agent automation. Built from scratch independently of LangChain, it offers both **Crews** (autonomous agents) and **Flows** (event-driven control).

### 1.2 Core Concepts

| Concept        | Description                                      |
| -------------- | ------------------------------------------------ |
| **Crews**      | Teams of AI agents with autonomous collaboration |
| **Flows**      | Event-driven workflows with granular control     |
| **Agents**     | Role-based AI entities with goals and expertise  |
| **Tasks**      | Units of work assigned to agents                 |
| **Tools**      | External capabilities for agents                 |
| **Delegation** | Agents can delegate tasks to each other          |

### 1.3 Key Features

| Feature               | Description                           |
| --------------------- | ------------------------------------- |
| **Standalone**        | No LangChain dependency               |
| **High Performance**  | Optimized for speed                   |
| **Low-level Control** | Customize prompts, execution logic    |
| **Enterprise Ready**  | Control plane, tracing, observability |
| **100k+ Developers**  | Large certified community             |

### 1.4 Installation

```bash
pip install crewai crewai-tools
```

### 1.5 Crew Example

```python
from crewai import Agent, Task, Crew
from crewai_tools import SerperDevTool

# Define tools
search_tool = SerperDevTool()

# Define agents
researcher = Agent(
    role='Senior Trend Researcher',
    goal='Find trending topics for short-form video',
    backstory='Expert at identifying viral content patterns',
    tools=[search_tool],
    verbose=True,
)

scriptwriter = Agent(
    role='Video Scriptwriter',
    goal='Write engaging 60-second video scripts',
    backstory='Master of hook-driven content creation',
    verbose=True,
)

# Define tasks
research_task = Task(
    description='Research trending topics in AI for TikTok',
    expected_output='List of 5 trending topics with engagement metrics',
    agent=researcher,
)

script_task = Task(
    description='Write a 60-second script for the top topic',
    expected_output='Complete video script with timestamps',
    agent=scriptwriter,
    context=[research_task],  # Depends on research
)

# Create crew
content_crew = Crew(
    agents=[researcher, scriptwriter],
    tasks=[research_task, script_task],
    verbose=True,
)

# Execute
result = content_crew.kickoff()
print(result)
```

### 1.6 Flows Example

```python
from crewai.flow.flow import Flow, listen, start

class VideoGenerationFlow(Flow):

    @start()
    def research_trends(self):
        # First step: research
        topics = self.call_llm('Find trending AI topics')
        return topics

    @listen(research_trends)
    def generate_script(self, topics):
        # Second step: script
        script = self.call_llm(f'Write script about {topics[0]}')
        return script

    @listen(generate_script)
    def generate_audio(self, script):
        # Third step: audio
        audio_path = generate_tts(script)
        return audio_path

flow = VideoGenerationFlow()
result = flow.kickoff()
```

### 1.7 Crews + Flows Integration

```python
from crewai import Crew
from crewai.flow.flow import Flow, listen, start

class ProductionFlow(Flow):

    @start()
    def research_phase(self):
        # Use a Crew for research
        return research_crew.kickoff()

    @listen(research_phase)
    def production_phase(self, research_result):
        # Use another Crew for production
        production_crew.inputs = {'research': research_result}
        return production_crew.kickoff()
```

---

## 2. LangGraph

**Source:** `vendor/agents/langgraph/`  
**Creator:** LangChain  
**License:** MIT  
**Language:** Python, JavaScript  
**Stars:** 10k+

### 2.1 Overview

LangGraph is a **low-level orchestration framework** for building, managing, and deploying long-running, stateful agents. Used by Klarna, Replit, Elastic, and more.

### 2.2 Core Benefits

| Benefit                   | Description                              |
| ------------------------- | ---------------------------------------- |
| **Durable Execution**     | Survives failures, resumes automatically |
| **Human-in-the-Loop**     | Inspect/modify state at any point        |
| **Comprehensive Memory**  | Short and long-term memory               |
| **LangSmith Debugging**   | Trace visualization, metrics             |
| **Production Deployment** | Scalable infrastructure                  |

### 2.3 Installation

```bash
pip install langgraph
```

### 2.4 Basic Graph

```python
from langgraph.graph import START, StateGraph
from typing_extensions import TypedDict

class State(TypedDict):
    topic: str
    script: str
    audio_path: str

def research_node(state: State) -> dict:
    # Research logic
    return {'topic': 'AI coding assistants'}

def script_node(state: State) -> dict:
    # Script generation
    return {'script': f'Script about {state["topic"]}'}

def audio_node(state: State) -> dict:
    # Audio generation
    return {'audio_path': '/audio/output.mp3'}

# Build graph
graph = StateGraph(State)
graph.add_node('research', research_node)
graph.add_node('script', script_node)
graph.add_node('audio', audio_node)

graph.add_edge(START, 'research')
graph.add_edge('research', 'script')
graph.add_edge('script', 'audio')

app = graph.compile()
result = app.invoke({'topic': '', 'script': '', 'audio_path': ''})
```

### 2.5 Conditional Branching

```python
from langgraph.graph import StateGraph, END

def should_continue(state: State) -> str:
    if state.get('approved'):
        return 'publish'
    return 'review'

graph = StateGraph(State)
graph.add_node('generate', generate_node)
graph.add_node('review', review_node)
graph.add_node('publish', publish_node)

graph.add_conditional_edges(
    'generate',
    should_continue,
    {'review': 'review', 'publish': 'publish'}
)
graph.add_edge('review', 'generate')  # Loop back
graph.add_edge('publish', END)
```

### 2.6 Human-in-the-Loop

```python
from langgraph.checkpoint.memory import MemorySaver

memory = MemorySaver()
app = graph.compile(checkpointer=memory, interrupt_before=['review'])

# Start execution (pauses at review)
config = {'configurable': {'thread_id': 'video-123'}}
result = app.invoke({'topic': 'AI'}, config)

# Resume after human approval
app.update_state(config, {'approved': True})
final = app.invoke(None, config)
```

---

## 3. PydanticAI

**Source:** `vendor/agents/pydantic-ai/`  
**Creator:** Pydantic Team  
**License:** MIT  
**Language:** Python  
**Stars:** 5k+

### 3.1 Overview

PydanticAI is a Python agent framework that brings the **FastAPI feeling** to GenAI development. Built by the creators of Pydantic validation.

### 3.2 Key Features

| Feature                    | Description                                      |
| -------------------------- | ------------------------------------------------ |
| **Built by Pydantic**      | The validation layer for OpenAI, Anthropic, etc. |
| **Model-agnostic**         | 100+ model/provider combinations                 |
| **Seamless Observability** | Logfire integration                              |
| **Fully Type-safe**        | IDE support, static checking                     |
| **Powerful Evals**         | Built-in evaluation framework                    |
| **MCP Support**            | Model Context Protocol integration               |
| **A2A**                    | Agent-to-Agent interoperability                  |
| **Durable Execution**      | Survives failures, restarts                      |

### 3.3 Installation

```bash
pip install pydantic-ai
```

### 3.4 Basic Example

```python
from pydantic_ai import Agent

agent = Agent(
    'anthropic:claude-sonnet-4-0',
    instructions='Be concise, reply with one sentence.',
)

result = agent.run_sync('What is the best AI for video generation?')
print(result.output)
```

### 3.5 Structured Output

```python
from pydantic import BaseModel, Field
from pydantic_ai import Agent

class VideoScript(BaseModel):
    hook: str = Field(description='Opening hook (5-10 seconds)')
    body: list[str] = Field(description='Main points')
    cta: str = Field(description='Call to action')

agent = Agent(
    'openai:gpt-4o',
    output_type=VideoScript,
    instructions='Generate video scripts for short-form content',
)

result = agent.run_sync('Create a script about AI coding tools')
print(result.output.hook)
print(result.output.body)
print(result.output.cta)
```

### 3.6 Dependency Injection

```python
from dataclasses import dataclass
from pydantic_ai import Agent, RunContext

@dataclass
class ContentDeps:
    topic: str
    duration: int
    db_connection: DatabaseConn

agent = Agent(
    'openai:gpt-4o',
    deps_type=ContentDeps,
)

@agent.instructions
async def add_context(ctx: RunContext[ContentDeps]) -> str:
    trends = await ctx.deps.db_connection.get_trends(ctx.deps.topic)
    return f'Focus on these trends: {trends}'

@agent.tool
async def research_trend(ctx: RunContext[ContentDeps], query: str) -> str:
    return await ctx.deps.db_connection.search(query)
```

### 3.7 MCP Integration

```python
from pydantic_ai import Agent
from pydantic_ai.mcp import MCPServerStdio

# Connect to MCP server
mcp_server = MCPServerStdio('uvx', 'mcp-server-reddit')

agent = Agent(
    'openai:gpt-4o',
    mcp_servers=[mcp_server],
)

result = await agent.run('Find trending topics on r/programming')
```

---

## 4. LlamaIndex

**Source:** `vendor/agents/llama-index/`  
**Creator:** Run-Llama  
**License:** MIT  
**Language:** Python, JavaScript  
**Stars:** 36k+

### 4.1 Overview

LlamaIndex is a **data framework** for building LLM applications. It provides data connectors, indexing, and retrieval for RAG applications.

### 4.2 Core Concepts

| Concept             | Description                        |
| ------------------- | ---------------------------------- |
| **Data Connectors** | Ingest from APIs, PDFs, SQL, etc.  |
| **Indices**         | Structure data for LLM consumption |
| **Retrievers**      | Query data efficiently             |
| **Query Engines**   | LLM-powered question answering     |
| **Agents**          | Autonomous tool-using LLM systems  |

### 4.3 Installation

```bash
# Starter package
pip install llama-index

# Or custom selection
pip install llama-index-core llama-index-llms-openai
```

### 4.4 Basic RAG

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

# Load documents
documents = SimpleDirectoryReader('data/').load_data()

# Create index
index = VectorStoreIndex.from_documents(documents)

# Query
query_engine = index.as_query_engine()
response = query_engine.query('What are the trending topics?')
print(response)
```

### 4.5 Agent with Tools

```python
from llama_index.core.agent import ReActAgent
from llama_index.llms.openai import OpenAI
from llama_index.core.tools import FunctionTool

def search_trends(topic: str) -> str:
    """Search for trending topics"""
    return f'Trending: {topic} - 10k mentions'

def generate_script(topic: str, duration: int) -> str:
    """Generate video script"""
    return f'{duration}s script about {topic}'

llm = OpenAI(model='gpt-4o')

agent = ReActAgent.from_tools(
    tools=[
        FunctionTool.from_defaults(fn=search_trends),
        FunctionTool.from_defaults(fn=generate_script),
    ],
    llm=llm,
    verbose=True,
)

response = agent.chat('Find trending AI topics and create a 60s script')
```

---

## 5. Deep Research Tools

### 5.1 GPT Researcher

**Source:** `vendor/research/gpt-researcher/`  
**Creator:** Assaf Elovic  
**License:** MIT  
**Stars:** 15k+

#### Overview

GPT Researcher is an **open deep research agent** that produces detailed, factual research reports with citations.

#### Key Features

| Feature             | Description                     |
| ------------------- | ------------------------------- |
| **Plan-and-Solve**  | Planner + execution agents      |
| **20+ Sources**     | Aggregates multiple web sources |
| **2000+ Words**     | Long-form detailed reports      |
| **PDF/Word Export** | Multiple output formats         |
| **MCP Support**     | Connect to custom data sources  |
| **Image Scraping**  | Smart filtering for reports     |

#### Architecture

```
1. Task-specific agent based on query
2. Generate research questions
3. Crawler agents gather information
4. Summarize and track sources
5. Filter and aggregate to final report
```

#### Installation

```bash
pip install gpt-researcher
```

#### Usage

```python
from gpt_researcher import GPTResearcher

query = 'What are the trending AI tools for video generation?'
researcher = GPTResearcher(query=query)

# Conduct research
research_result = await researcher.conduct_research()

# Write report
report = await researcher.write_report()
print(report)
```

#### MCP Integration

```python
import os
os.environ['RETRIEVER'] = 'tavily,mcp'  # Hybrid web + MCP

researcher = GPTResearcher(
    query='Analyze our product trends',
    mcp_servers=['mcp-server-database'],
)
```

---

### 5.2 Open Deep Research

**Source:** `vendor/research/open-deep-research/`  
**Creator:** LangChain  
**License:** MIT  
**Ranking:** #6 on Deep Research Bench

#### Overview

A configurable, fully open source deep research agent built on LangGraph. Works across many model providers and search tools.

#### Key Features

| Feature          | Description                         |
| ---------------- | ----------------------------------- |
| **Multi-Model**  | GPT-4, Claude, Gemini, local models |
| **Multi-Search** | Tavily, native search, MCP          |
| **LangGraph**    | State machine architecture          |
| **Studio UI**    | Visual debugging                    |
| **Evaluation**   | Deep Research Bench compatible      |

#### Architecture

```
Summarization → Research Agent → Compression → Final Report
     ↓               ↓               ↓
  gpt-4.1-mini    gpt-4.1        gpt-4.1
```

#### Installation

```bash
git clone https://github.com/langchain-ai/open_deep_research.git
cd open_deep_research
uv sync

# Launch with LangGraph server
uvx --from "langgraph-cli[inmem]" langgraph dev
```

#### Configuration

```python
# configuration.py
summarization_model = 'openai:gpt-4.1-mini'
research_model = 'openai:gpt-4.1'
compression_model = 'openai:gpt-4.1'
final_report_model = 'openai:gpt-4.1'

search_api = 'tavily'  # or perplexity, exa, etc.
```

---

## 6. Agent Framework Comparison

### 6.1 Feature Matrix

| Feature               | CrewAI           | LangGraph    | PydanticAI       | LlamaIndex   |
| --------------------- | ---------------- | ------------ | ---------------- | ------------ |
| **Paradigm**          | Role-based crews | State graphs | Type-safe agents | Data-centric |
| **Multi-Agent**       | ✅ Native        | ✅ Via nodes | ✅ Via A2A       | ✅ Via tools |
| **Durable Execution** | ❌               | ✅           | ✅               | ❌           |
| **Human-in-Loop**     | ✅               | ✅ Native    | ✅ Native        | ✅           |
| **MCP Support**       | ✅               | ❌           | ✅ Native        | ❌           |
| **Type Safety**       | ⚠️               | ⚠️           | ✅ Excellent     | ⚠️           |
| **RAG Built-in**      | ❌               | ❌           | ❌               | ✅ Native    |
| **Observability**     | Control Plane    | LangSmith    | Logfire          | LlamaCloud   |
| **Learning Curve**    | Low              | Moderate     | Low              | Moderate     |

### 6.2 Use Case Fit

| Use Case                  | Best Framework        |
| ------------------------- | --------------------- |
| Multi-agent collaboration | CrewAI                |
| Complex state machines    | LangGraph             |
| Type-safe production      | PydanticAI            |
| RAG applications          | LlamaIndex            |
| Long-running workflows    | LangGraph, PydanticAI |
| Quick prototyping         | CrewAI, PydanticAI    |

### 6.3 Recommendation for content-machine

| Layer                  | Framework                   | Rationale                            |
| ---------------------- | --------------------------- | ------------------------------------ |
| **Content Planning**   | CrewAI                      | Multi-agent for research + scripting |
| **Pipeline Control**   | LangGraph                   | Durable execution, state management  |
| **Structured Outputs** | PydanticAI/Instructor       | Type-safe LLM extraction             |
| **Trend Research**     | LlamaIndex + GPT Researcher | RAG + deep research                  |

---

## 7. Integration Architecture

### 7.1 Combined Agent Stack

```
┌────────────────────────────────────────────────────────────────┐
│                    Agent Architecture                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  RESEARCH LAYER                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  GPT Researcher + LlamaIndex                              │  │
│  │  - Trend research across Reddit, HN, Twitter              │  │
│  │  - RAG over product documentation                         │  │
│  │  - MCP integration for data sources                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  PLANNING LAYER                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CrewAI Crews                                             │  │
│  │  - Trend Analyst Agent                                    │  │
│  │  - Scriptwriter Agent                                     │  │
│  │  - Quality Review Agent                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ORCHESTRATION LAYER                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  LangGraph / BullMQ                                       │  │
│  │  - State machine for video pipeline                       │  │
│  │  - Durable execution                                      │  │
│  │  - Human-in-the-loop approval                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  EXTRACTION LAYER                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PydanticAI / Instructor                                  │  │
│  │  - Structured script generation                           │  │
│  │  - Caption timing extraction                              │  │
│  │  - Metadata parsing                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 7.2 Content Generation Flow

```python
from crewai import Agent, Crew, Task
from langgraph.graph import StateGraph
from pydantic_ai import Agent as PydanticAgent
from pydantic import BaseModel

# Step 1: Research Crew
research_crew = Crew(
    agents=[trend_researcher, topic_analyst],
    tasks=[research_task, analysis_task],
)

# Step 2: Script Generation (PydanticAI)
class VideoScript(BaseModel):
    hook: str
    body: list[str]
    cta: str

script_agent = PydanticAgent(
    'openai:gpt-4o',
    output_type=VideoScript,
)

# Step 3: Production Pipeline (LangGraph)
class ProductionState(TypedDict):
    topic: str
    script: VideoScript
    audio_path: str
    video_path: str
    status: str

graph = StateGraph(ProductionState)
graph.add_node('research', lambda s: research_crew.kickoff())
graph.add_node('script', lambda s: script_agent.run_sync(s['topic']))
graph.add_node('audio', generate_audio_node)
graph.add_node('video', render_video_node)
graph.add_node('review', human_review_node)
```

---

## 8. Document Metadata

| Field            | Value          |
| ---------------- | -------------- |
| **Document ID**  | DD-074         |
| **Created**      | 2026-01-02     |
| **Author**       | Research Agent |
| **Status**       | Complete       |
| **Dependencies** | DD-072, DD-073 |

---

## 9. Key Takeaways

1. **CrewAI** excels at multi-agent collaboration with role-based teams
2. **LangGraph** provides durable execution for production pipelines
3. **PydanticAI** offers the best type safety and structured outputs
4. **LlamaIndex** is ideal for RAG and data-centric applications
5. **GPT Researcher** automates deep research with citations
6. **Combined stack** leverages each framework's strengths
7. **MCP integration** enables tool sharing across agents

---

## 10. Quick Reference

### CrewAI

```python
crew = Crew(agents=[a1, a2], tasks=[t1, t2])
result = crew.kickoff()
```

### LangGraph

```python
graph = StateGraph(State)
graph.add_node('step', node_fn)
app = graph.compile()
```

### PydanticAI

```python
agent = Agent('openai:gpt-4o', output_type=MyModel)
result = agent.run_sync('prompt')
```

### LlamaIndex

```python
index = VectorStoreIndex.from_documents(docs)
engine = index.as_query_engine()
```

### GPT Researcher

```python
researcher = GPTResearcher(query='topic')
report = await researcher.write_report()
```
