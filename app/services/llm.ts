import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Paths } from 'expo-file-system'; // Use Paths directly
import { initLlama, LlamaContext } from 'llama.rn';

let context: LlamaContext | null = null;
const MODEL_NAME = 'Qwen3-0.6B-Q5_K_M.gguf';

// Initialize the model
export const initModel = async () => {
    if (context) return; // Already initialized

    try {
        console.log('Initializing Qwen model using initLlama helper...');

        const modelAsset = require('../../assets/models/llm/Qwen3-0.6B-Q5_K_M.gguf');
        const asset = Asset.fromModule(modelAsset);
        await asset.downloadAsync();

        if (!asset.localUri) {
            throw new Error('Model asset localUri is null');
        }

        // Get document directory path using new API
        const docDir = Paths.document;
        if (!docDir) throw new Error('Document directory not found');

        // Ensure we have a standard path (remove file:// scheme if present)
        const docPath = docDir.uri.startsWith('file://') ? docDir.uri.slice(7) : docDir.uri;
        const storedPath = `${docPath}/${MODEL_NAME}`;

        // Helper to copy if missing
        // We use the legacy FileSystem for copyAsync as it is handy, assuming it still works with URIs
        // Or we can use the new API if known? let's stick to legacy for simple copy since we have the URI.
        // Actually, FileSystem.getInfoAsync/copyAsync works with URIs.

        const destinationUri = docDir.uri + '/' + MODEL_NAME;
        const info = await FileSystem.getInfoAsync(destinationUri);

        if (!info.exists) {
            console.log('Copying model to:', destinationUri);
            await FileSystem.copyAsync({
                from: asset.localUri,
                to: destinationUri
            });
        }

        // initLlama handles 'file://' internally if passed, but usually best to pass without for native libs
        // Looking at source, it handles it.
        context = await initLlama({
            model: destinationUri,
            n_ctx: 2048,
            n_threads: 4,
        });
        console.log('Qwen model initialized successfully.');
    } catch (e) {
        console.error('Failed to init Qwen model:', e);
        throw e;
    }
};

// Extract action items
export const extractActionItems = async (transcription: string) => {
    if (!context) {
        await initModel();
    }

    // Qwen-Instruct template
    const prompt = `<|im_start|>system
You are a helpful assistant. Extract actionable tasks from the user's text. Return them as a JSON list of strings. Example: ["Buy milk", "Call John"]. Only return the JSON.
<|im_end|>
<|im_start|>user
${transcription}
<|im_end|>
<|im_start|>assistant
/think
`;

    try {
        console.log('Running inference on:', transcription);
        const result = await context!.completion({
            prompt,
            n_predict: 1024, // Increased limit for thinking process
            temperature: 0.7,
        });

        console.log('Model output:', result.text);

        // clean up output to find JSON array
        const jsonMatch = result.text.match(/\[.*\]/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (e) {
        console.error('Inference failed:', e);
        return [];
    }
};
