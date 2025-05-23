import { runCLI } from '@jest/core';
import { Config } from '@jest/types';
import { resolve } from 'path';

interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  pattern?: string;
}

const defaultConfig: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.{ts,sjs}'],
  moduleFileExtensions: ['ts', 'sjs', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,sjs}',
    '!src/**/*.test.{ts,sjs}',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  transform: {
    '^.+\\.(ts|sjs)$': 'ts-jest',
  },
};

export async function runTests(options: TestOptions = {}): Promise<void> {
  const { watch = false, coverage = false, pattern } = options;

  const config: Config.InitialOptions = {
    ...defaultConfig,
    watch,
    coverage,
    ...(pattern ? { testMatch: [pattern] } : {}),
  };

  try {
    const { results } = await runCLI(
      {
        config: JSON.stringify(config),
        runInBand: true,
        silent: false,
      },
      [process.cwd()]
    );

    if (!results.success && !watch) {
      throw new Error(`Tests failed with ${results.numFailedTests} failures`);
    }

    if (!watch) {
      console.log('Testing complete');
      if (coverage) {
        console.log(`Coverage: ${results.coverageMap?.getCoverageSummary().lines.pct}%`);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Testing failed:', error.message);
    }
    throw error;
  }
} 