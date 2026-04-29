# zhouxiaoka AutoClip

Local path:
`vendor/imports-20260423-shortform-downloads-direct/direct-repos/zhouxiaoka__autoclip`

## Archetype

`longform-clip-factory`

## Production Pattern

Web app for YouTube/Bilibili/local ingest, AI content analysis, automatic
clip extraction, collections, progress tracking, and manual curation.

## Useful Extraction

- FastAPI plus Celery task queue
- Redis-backed progress and WebSocket updates
- content outline and topic timeline extraction
- exciting-clip scoring
- smart collections and drag-and-drop sorting
- task/project database model

## Content-Machine Implication

Longform clipping needs a candidate collection layer. Agents should be able to
curate, reorder, approve, and reject clips before rendering.
