import { claudeProvider } from './claude.js';

export const PROVIDERS = {
  claude: claudeProvider
};

export const PROVIDER_LIST = [
  { id: 'claude', displayName: 'Claude', domain: 'claude.ai' }
];
