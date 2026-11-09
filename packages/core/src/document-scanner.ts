import { validation } from "./errors";

export type ScanVerdict = "clean" | "infected" | "failed";

export interface ScanResult {
  verdict: ScanVerdict;
  provider: string;
  detail: string | null;
}

export interface DocumentScanner {
  scan(bytes: Buffer, filename: string, mimeType: string): Promise<ScanResult>;
}

/** EICAR is an industry test string, not live malware. */
const EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

/**
 * Development adapter. It catches the standard test signature and obvious
 * executable payloads, but it is not a substitute for a real anti-malware
 * service. It is never selected in production.
 */
export function createLocalValidationScanner(): DocumentScanner {
  return {
    async scan(bytes, filename): Promise<ScanResult> {
      const text = bytes.toString("utf8");
      if (text.includes(EICAR_SIGNATURE) || filename.toLowerCase().endsWith(".exe")) {
        return {
          verdict: "infected",
          provider: "local-validation",
          detail: "The file matched a known test or executable signature"
        };
      }
      return {
        verdict: "clean",
        provider: "local-validation",
        detail: "Basic local validation only; connect an anti-malware service for production"
      };
    }
  };
}

export interface HttpScannerOptions {
  url: string;
  token?: string | null;
  fetchImpl?: typeof fetch;
}

/**
 * Provider-neutral anti-malware hook. The scanner must return JSON:
 * `{ "status": "clean" | "infected" | "failed", "detail": "..." }`.
 */
export function createHttpDocumentScanner(options: HttpScannerOptions): DocumentScanner {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async scan(bytes, filename, mimeType): Promise<ScanResult> {
      let response: Response;
      try {
        response = await fetchImpl(options.url, {
          method: "POST",
          headers: {
            "content-type": "application/octet-stream",
            "x-veyra-filename": filename,
            "x-veyra-content-type": mimeType,
            ...(options.token ? { authorization: `Bearer ${options.token}` } : {})
          },
          body: new Uint8Array(bytes),
          signal: AbortSignal.timeout(20_000)
        });
      } catch {
        throw validation("The malware scanner is unavailable. Try again shortly.");
      }

      if (!response.ok) {
        throw validation("The malware scanner could not check this file. Try again shortly.");
      }

      const body = (await response.json().catch(() => null)) as
        | { status?: unknown; detail?: unknown }
        | null;
      const status = body?.status;
      if (status !== "clean" && status !== "infected" && status !== "failed") {
        throw validation("The malware scanner returned an invalid result");
      }
      return {
        verdict: status,
        provider: "http-scanner",
        detail: typeof body?.detail === "string" ? body.detail.slice(0, 500) : null
      };
    }
  };
}

/**
 * Production fails closed if no scanner is configured. Local development uses
 * the explicitly labelled validation adapter.
 */
export function createConfiguredDocumentScanner(
  env: Record<string, string | undefined> = process.env
): DocumentScanner {
  const url = env.VEYRA_MALWARE_SCANNER_URL?.trim();
  if (url) {
    return createHttpDocumentScanner({
      url,
      token: env.VEYRA_MALWARE_SCANNER_TOKEN?.trim() || null
    });
  }
  if (env.NODE_ENV === "production") {
    return {
      async scan(): Promise<ScanResult> {
        throw validation(
          "Document uploads are disabled until a malware scanner is configured for this deployment"
        );
      }
    };
  }
  return createLocalValidationScanner();
}
