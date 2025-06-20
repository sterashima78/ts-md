declare module 'load-tsconfig' {
  export interface TsConfig {
    path: string;
    data: {
      compilerOptions?: Record<string, unknown>;
      [key: string]: unknown;
    };
    files: string[];
  }
  export function loadTsConfig(dir: string, name?: string): TsConfig | null;
}
