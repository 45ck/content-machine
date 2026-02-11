import { describe, expect, it } from 'vitest';
import {
  CONFIG_SURFACE_FILES,
  DEFAULT_ARTIFACT_FILENAMES,
  PROJECT_CONFIG_CANDIDATES,
  REPO_FACTS,
  SUPPORTED_LLM_PROVIDER_IDS,
  SUPPORTED_STOCK_VISUALS_PROVIDER_IDS,
  SUPPORTED_VISUALS_PROVIDER_IDS,
  USER_CONFIG_CANDIDATES,
} from '../src/domain/repo-facts.generated';

describe('repo facts generated constants', () => {
  it('includes default llm provider in supported providers', () => {
    expect(SUPPORTED_LLM_PROVIDER_IDS).toContain(REPO_FACTS.llm.default.providerId);
  });

  it('defines all canonical artifact contract filenames', () => {
    expect(DEFAULT_ARTIFACT_FILENAMES).toMatchObject({
      script: expect.any(String),
      audio: expect.any(String),
      timestamps: expect.any(String),
      'audio-mix': expect.any(String),
      visuals: expect.any(String),
      video: expect.any(String),
    });
  });

  it('keeps stock visuals providers as subset of visuals providers', () => {
    for (const providerId of SUPPORTED_STOCK_VISUALS_PROVIDER_IDS) {
      expect(SUPPORTED_VISUALS_PROVIDER_IDS).toContain(providerId);
    }
  });

  it('provides canonical project and user config aliases', () => {
    expect(PROJECT_CONFIG_CANDIDATES.length).toBeGreaterThan(0);
    expect(USER_CONFIG_CANDIDATES.length).toBeGreaterThan(0);
    expect(CONFIG_SURFACE_FILES['project-config']).toBe(PROJECT_CONFIG_CANDIDATES[0]);
  });
});
