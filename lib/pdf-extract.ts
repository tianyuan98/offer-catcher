/**
 * 客户端文件文本提取工具
 * 纯浏览器端执行，服务端（SSG）直接返回 null
 */

let _pdfjsReady = false;

/** 确保 pdfjs worker 已配置 */
async function ensurePdfjs() {
  if (_pdfjsReady) {
    return import("pdfjs-dist");
  }
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/offer-catcher/pdf.worker.min.mjs";
  _pdfjsReady = true;
  return pdfjsLib;
}

/**
 * 从 File 对象中提取 PDF 文本
 * 使用动态导入 pdfjs-dist，避免服务端打包问题
 */
export async function extractTextFromPDF(file: File): Promise<string | null> {
  // 服务端环境直接返回 null
  if (typeof window === "undefined") return null;

  try {
    // 动态导入并配置 worker
    const pdfjsLib = await ensurePdfjs();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim() || null;
  } catch (error) {
    console.error("[PDF Extract] 解析失败:", error);
    return null;
  }
}

/**
 * 通用文件文本提取
 * - .txt / .md / .json / .csv 等纯文本：直接 FileReader 读取
 * - .pdf：用 pdfjs-dist 解析
 * - .docx：用 mammoth 解析
 * - .doc：旧格式暂不支持
 */
export async function extractTextFromFile(file: File): Promise<{
  text: string | null;
  error?: string;
}> {
  // 服务端环境
  if (typeof window === "undefined") {
    return { text: null, error: "服务端不支持文件解析" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // 纯文本文件
  const textExts = ["txt", "md", "json", "csv", "js", "ts", "jsx", "tsx", "html", "css"];
  if (textExts.includes(ext)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || "";
        resolve({ text: text.trim() || null });
      };
      reader.onerror = () => resolve({ text: null, error: "文件读取失败" });
      reader.readAsText(file);
    });
  }

  // PDF 文件
  if (ext === "pdf") {
    const text = await extractTextFromPDF(file);
    if (!text) {
      return { text: null, error: "PDF 解析失败，请手动粘贴简历内容" };
    }
    return { text };
  }

  // Word .docx 文件
  if (ext === "docx") {
    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return { text: result.value.trim() || null };
    } catch (e) {
      console.error("[DOCX Extract] 解析失败:", e);
      return { text: null, error: "Word 解析失败，请手动粘贴简历内容" };
    }
  }

  // Word .doc 旧格式（暂不支持）
  if (ext === "doc") {
    return { text: null, error: "Word 97-2003 格式(.doc)暂不支持自动解析，请转换为 .docx 或手动粘贴简历内容" };
  }

  // 未知格式，尝试当文本读取
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      resolve({ text: text.trim() || null });
    };
    reader.onerror = () => resolve({ text: null, error: "文件读取失败" });
    reader.readAsText(file);
  });
}
