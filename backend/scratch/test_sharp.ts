import { extractFeaturesFromBuffer } from '../src/services/imageProcessingService.ts';
import fs from 'fs';
import path from 'path';

async function test() {
  try {
    console.log("Starting test...");
    // Create a dummy buffer if no file is available, or try to find an image in the workspace
    const dummyBuffer = Buffer.alloc(1000); 
    // This will likely fail since it's not a real image, but we want to see IF it crashes the process
    console.log("Extracting features from dummy buffer...");
    const result = await extractFeaturesFromBuffer(dummyBuffer);
    console.log("Result:", result);
  } catch (error: any) {
    console.error("Caught error:", error.message);
  }
}

test();
