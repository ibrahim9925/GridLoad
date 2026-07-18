// @ts-nocheck
export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
  duration: number;
  testName?: string;
  category?: string;
  priority?: string;
  module?: string;
}

export interface BusinessTest {
  name: string;
  category: string;
  description: string;
  module: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  fn: () => Promise<TestResult>;
}

export type TestSuiteMap = Record<string, BusinessTest[]>;