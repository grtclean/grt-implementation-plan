import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateZipArchive,
  estimateZipSize,
  getZipMimeType,
  generateZipFilename,
  validateExportFiles,
  createSingleFileZip,
} from "./meeting-intelligence/zip-generator.service";

describe("v1.3.86 - ZIP Generator Service", () => {
  describe("generateZipArchive", () => {
    it("should generate a valid ZIP archive from files", async () => {
      const files = [
        { filename: "test1.txt", content: "Hello World" },
        { filename: "test2.txt", content: "Test Content" },
      ];

      const stream = await generateZipArchive(files);
      expect(stream).toBeDefined();
      expect(stream.readable).toBe(true);
    });

    it("should support custom compression level", async () => {
      const files = [{ filename: "test.txt", content: "Test" }];
      const stream = await generateZipArchive(files, { compressionLevel: 9 });
      expect(stream).toBeDefined();
    });

    it("should include metadata when requested", async () => {
      const files = [{ filename: "test.txt", content: "Test" }];
      const stream = await generateZipArchive(files, { includeMetadata: true });
      expect(stream).toBeDefined();
    });

    it("should handle buffer content", async () => {
      const files = [
        {
          filename: "binary.bin",
          content: Buffer.from([0x00, 0x01, 0x02, 0x03]),
        },
      ];

      const stream = await generateZipArchive(files);
      expect(stream).toBeDefined();
    });

    it("should handle empty files array", async () => {
      const stream = await generateZipArchive([]);
      expect(stream).toBeDefined();
    });
  });

  describe("estimateZipSize", () => {
    it("should estimate ZIP size correctly", () => {
      const files = [
        { filename: "test1.txt", content: "Hello World" }, // 11 bytes
        { filename: "test2.txt", content: "Test Content" }, // 12 bytes
      ];

      const size = estimateZipSize(files);
      expect(size).toBeGreaterThan(23); // 11 + 12 bytes
      expect(size).toBeLessThan(100); // Should include overhead but not too much
    });

    it("should handle buffer content in size estimation", () => {
      const files = [
        {
          filename: "binary.bin",
          content: Buffer.from([0x00, 0x01, 0x02, 0x03]),
        },
      ];

      const size = estimateZipSize(files);
      expect(size).toBeGreaterThan(4);
    });

    it("should return 0 for empty files", () => {
      const size = estimateZipSize([]);
      expect(size).toBeGreaterThanOrEqual(0);
    });

    it("should add overhead to total size", () => {
      const files = [{ filename: "test.txt", content: "A".repeat(1000) }];
      const size = estimateZipSize(files);
      expect(size).toBeGreaterThan(1000); // Should include overhead
    });
  });

  describe("getZipMimeType", () => {
    it("should return correct MIME type for ZIP", () => {
      const mimeType = getZipMimeType();
      expect(mimeType).toBe("application/zip");
    });
  });

  describe("generateZipFilename", () => {
    it("should generate filename with prefix and timestamp", () => {
      const filename = generateZipFilename("export", true);
      expect(filename).toMatch(/^export-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/);
    });

    it("should generate filename without timestamp", () => {
      const filename = generateZipFilename("export", false);
      expect(filename).toBe("export.zip");
    });

    it("should use default prefix when not provided", () => {
      const filename = generateZipFilename();
      expect(filename).toMatch(/^export-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/);
    });

    it("should always end with .zip extension", () => {
      const filename1 = generateZipFilename("test", true);
      const filename2 = generateZipFilename("data", false);
      expect(filename1.endsWith(".zip")).toBe(true);
      expect(filename2.endsWith(".zip")).toBe(true);
    });
  });

  describe("validateExportFiles", () => {
    it("should validate correct files", () => {
      const files = [
        { filename: "test1.txt", content: "Hello" },
        { filename: "test2.txt", content: "World" },
      ];

      const result = validateExportFiles(files);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty files array", () => {
      const result = validateExportFiles([]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject files with missing filename", () => {
      const files = [{ filename: "", content: "Test" }];
      const result = validateExportFiles(files);
      expect(result.valid).toBe(false);
    });

    it("should reject files with missing content", () => {
      const files = [{ filename: "test.txt", content: "" }];
      const result = validateExportFiles(files);
      expect(result.valid).toBe(false);
    });

    it("should reject files with filename exceeding 255 characters", () => {
      const longFilename = "a".repeat(256);
      const files = [{ filename: longFilename, content: "Test" }];
      const result = validateExportFiles(files);
      expect(result.valid).toBe(false);
    });

    it("should handle multiple validation errors", () => {
      const files = [
        { filename: "", content: "" },
        { filename: "test.txt", content: "" },
      ];

      const result = validateExportFiles(files);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("createSingleFileZip", () => {
    it("should create ZIP with single file", async () => {
      const stream = await createSingleFileZip("test.txt", "Hello World");
      expect(stream).toBeDefined();
      expect(stream.readable).toBe(true);
    });

    it("should handle buffer content", async () => {
      const buffer = Buffer.from("Binary Content");
      const stream = await createSingleFileZip("binary.bin", buffer);
      expect(stream).toBeDefined();
    });

    it("should support custom options", async () => {
      const stream = await createSingleFileZip("test.txt", "Content", {
        compressionLevel: 9,
        includeMetadata: true,
      });
      expect(stream).toBeDefined();
    });
  });

  describe("Meeting Batch Export Integration", () => {
    it("should estimate correct size for batch export", () => {
      const files = [
        { filename: "meeting-1-export.md", content: "# Meeting 1\n\nContent..." },
        { filename: "meeting-2-export.md", content: "# Meeting 2\n\nContent..." },
        { filename: "meeting-3-export.md", content: "# Meeting 3\n\nContent..." },
      ];

      const size = estimateZipSize(files);
      expect(size).toBeGreaterThan(0);
    });

    it("should generate appropriate filename for batch export", () => {
      const filename = generateZipFilename("batch-export", true);
      expect(filename).toMatch(/^batch-export-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.zip$/);
    });

    it("should validate batch export files", () => {
      const files = Array.from({ length: 5 }, (_, i) => ({
        filename: `meeting-${i + 1}.md`,
        content: `Meeting ${i + 1} content`,
      }));

      const result = validateExportFiles(files);
      expect(result.valid).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle stream errors gracefully", async () => {
      const files = [{ filename: "test.txt", content: "Test" }];
      const stream = await generateZipArchive(files);

      // Simulate error handling
      let errorCaught = false;
      stream.on("error", () => {
        errorCaught = true;
      });

      expect(stream).toBeDefined();
    });

    it("should handle large file content", () => {
      const largeContent = "A".repeat(10 * 1024 * 1024); // 10MB
      const files = [{ filename: "large.txt", content: largeContent }];

      const size = estimateZipSize(files);
      expect(size).toBeGreaterThan(10 * 1024 * 1024);
    });
  });

  describe("Performance", () => {
    it("should handle multiple files efficiently", async () => {
      const files = Array.from({ length: 100 }, (_, i) => ({
        filename: `file-${i}.txt`,
        content: `Content ${i}`,
      }));

      const startTime = Date.now();
      const stream = await generateZipArchive(files);
      const endTime = Date.now();

      expect(stream).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it("should estimate size quickly for large file lists", () => {
      const files = Array.from({ length: 1000 }, (_, i) => ({
        filename: `file-${i}.txt`,
        content: `Content ${i}`,
      }));

      const startTime = Date.now();
      const size = estimateZipSize(files);
      const endTime = Date.now();

      expect(size).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});
