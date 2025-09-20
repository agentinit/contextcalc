import { get_encoding } from 'tiktoken';
import type { Tiktoken } from 'tiktoken';

const ENCODING_NAME = 'o200k_base';

export interface TiktokenWrapper {
  encoding: Tiktoken;
  isInitialized: boolean;
  error?: Error;
}

let tiktokenInstance: TiktokenWrapper | null = null;

/**
 * Initialize tiktoken with proper error handling and fallbacks
 */
export function initializeTiktoken(): TiktokenWrapper {
  if (tiktokenInstance) {
    return tiktokenInstance;
  }

  try {
    const encoding = get_encoding(ENCODING_NAME);
    
    // Validate the encoding by testing it with a simple string
    // This will fail if the WASM backend isn't properly initialized
    try {
      encoding.encode("test");
    } catch (validationError) {
      throw new Error(`Tiktoken encoding validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`);
    }
    
    tiktokenInstance = {
      encoding,
      isInitialized: true
    };
    return tiktokenInstance;
  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    
    // Enhanced error message with troubleshooting tips
    if (errorInstance.message.includes('tiktoken_bg.wasm')) {
      const enhancedError = new Error(
        `Failed to load tiktoken WebAssembly module: ${errorInstance.message}\n\n` +
        'This usually happens when using contextcalc as a dependency. Try:\n' +
        '1. Ensure tiktoken is installed: npm install tiktoken\n' +
        '2. If using in a bundled environment, ensure WASM files are copied\n' +
        '3. Check that the tiktoken_bg.wasm file is accessible in your project\n\n' +
        'For more help, see: https://github.com/agentinit/contextcalc/issues'
      );
      enhancedError.cause = errorInstance;
      
      tiktokenInstance = {
        encoding: {} as Tiktoken,
        isInitialized: false,
        error: enhancedError
      };
    } else {
      tiktokenInstance = {
        encoding: {} as Tiktoken,
        isInitialized: false,
        error: new Error(`Failed to initialize tokenizer with encoding '${ENCODING_NAME}': ${errorInstance.message}`)
      };
    }
    
    return tiktokenInstance;
  }
}

/**
 * Get the tiktoken instance, initializing if necessary
 */
export function getTiktoken(): TiktokenWrapper {
  return initializeTiktoken();
}

/**
 * Check if tiktoken is properly initialized
 */
export function isTiktokenAvailable(): boolean {
  const wrapper = getTiktoken();
  return wrapper.isInitialized;
}

/**
 * Get initialization error if any
 */
export function getTiktokenError(): Error | undefined {
  const wrapper = getTiktoken();
  return wrapper.error;
}

/**
 * Reset the tiktoken instance (for testing)
 */
export function resetTiktoken(): void {
  if (tiktokenInstance?.isInitialized) {
    try {
      tiktokenInstance.encoding.free();
    } catch (error) {
      console.warn('Warning: Failed to free tiktoken encoding:', error);
    }
  }
  tiktokenInstance = null;
}