declare module "fit-file-parser" {
  interface FitParserOptions {
    force?: boolean;
    mode?: "list" | "cascade" | "both";
  }

  interface FitRecord {
    position_lat?: number;
    position_long?: number;
    [key: string]: unknown;
  }

  interface FitData {
    records?: FitRecord[];
    [key: string]: unknown;
  }

  class FitParser {
    constructor(options?: FitParserOptions);
    parse(
      content: ArrayBuffer | Buffer,
      callback: (error: string | null, data: FitData) => void
    ): void;
  }

  export default FitParser;
}
