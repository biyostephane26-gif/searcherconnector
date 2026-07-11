import { defineConfig } from 'checkly/cli';

export default defineConfig({
  projectName: 'searcher-connector',
  logicalId: 'searcher-connector-project',
  repoUrl: 'https://github.com/your-username/searcher-connector',
  checks: {
    activated: true,
    muted: false,
    runId: '',
    runtimeId: '2023.09',
    locations: [
      'us-east-1',
      'us-west-1',
      'eu-west-1',
      'eu-central-1',
      'af-south-1',
      'me-south-1',
    ],
    tags: ['searcher-connector'],
    environmentVariables: [],
  },
  cli: {
    runLocation: 'us-east-1',
  },
});
