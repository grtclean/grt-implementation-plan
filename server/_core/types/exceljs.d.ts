declare namespace ExcelJS {
  interface Style {
    font?: Record<string, unknown>;
    fill?: Record<string, unknown>;
    alignment?: Record<string, unknown>;
    border?: Record<string, unknown>;
    numFmt?: string;
  }
}
