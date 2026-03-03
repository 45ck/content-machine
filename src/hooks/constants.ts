import { homedir } from 'os';
import { join } from 'path';
import type { HookAudioMode, HookFit } from '../domain';

export const DEFAULT_HOOKS_DIR = join(homedir(), '.cm', 'assets', 'hooks');
export const DEFAULT_HOOK_LIBRARY = 'transitionalhooks';
export const DEFAULT_HOOK_AUDIO: HookAudioMode = 'keep';
export const DEFAULT_HOOK_FIT: HookFit = 'cover';
export const DEFAULT_HOOK_MAX_DURATION = 3;
