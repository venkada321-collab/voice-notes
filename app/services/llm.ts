import * as FileSystem from 'expo-file-system';
import { File as ExpoFile, Paths } from 'expo-file-system'; // Alias to avoid global File conflict
import { initLlama, LlamaContext } from 'llama.rn';
import { Alert } from 'react-native';

let context: LlamaContext | null = null;
const MODEL_NAME = 'Qwen3-0.6B-Q5_K_M.gguf';

// Initialize the model
export const initModel = async (onStatus?: (msg: string) => void) => {
    if (context) return; // Already initialized

    try {



        const docDir = Paths.document;
        if (!docDir) throw new Error('Document directory not found');
        const destFile = new ExpoFile(docDir, MODEL_NAME);

        if (!destFile.exists) {
            onStatus?.('Initializing Neural Core...');
            // Alert.alert('Initializing Neural Core', 'Downloading advanced features... (This happens only once)');

            // Download from URL
            const MODEL_URL = "https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q5_K_M.gguf?download=true";

            try {
                const downloadResumable = FileSystem.createDownloadResumable(
                    MODEL_URL,
                    destFile.uri,
                    {},
                    (downloadProgress) => {
                        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                        // Optional: You could debounce and emit this progress to UI
                    }
                );

                const result = await downloadResumable.downloadAsync();
                if (!result || !result.uri) {
                    throw new Error("Download failed");
                }

                onStatus?.('Neural Core Ready');
                // Alert.alert('Success', 'Neural Core ready.');

            } catch (e: any) {
                console.error("Download failed", e);
                throw new Error("Failed to download model: " + e.message);
            }
        }

        // Double check existence after download
        // We need to re-check existence property or use the file object freshly regarding sync state if needed, 
        // but ExpoFile.exists is a property getter so accessing it again should be fine if implementation matches.
        // Ideally we should rely on download success.

        const destinationUri = destFile.uri.replace('file://', '');

        context = await initLlama({
            model: destinationUri,
            n_ctx: 2048,
            n_threads: 4,
        });


    } catch (e: any) {
        console.error('Failed to init Qwen model:', e);
        Alert.alert('LLM Error', 'Init failed: ' + e.message);
        throw e;
    }
};

// Extract action items
export const extractActionItems = async (transcription: string, onStatus?: (msg: string) => void) => {



    if (!context) {


        await initModel(onStatus);
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

        const result = await context!.completion({
            prompt,
            n_predict: 1024, // Increased limit for thinking process
            temperature: 0.6,
            top_p: 0.95,
            top_k: 20,
            min_p: 0
        });




        // Strategy 1: Greedy match (find everything between first [ and last ])
        const jsonMatch = result.text.match(/\[.*\]/s);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);

                return parsed;
            } catch (e) {

            }
        }

        // Strategy 2: Fallback to the *last* bracketed block
        // (This handles cases where thinking process puts brackets before the final answer)
        const lastEnd = result.text.lastIndexOf(']');
        if (lastEnd !== -1) {
            const lastStart = result.text.lastIndexOf('[', lastEnd);
            if (lastStart !== -1) {
                const candidate = result.text.substring(lastStart, lastEnd + 1);

                try {
                    const parsed = JSON.parse(candidate);

                    return parsed;
                } catch (e) {
                    console.error('Fallback parsing failed:', e);
                }
            }
        }

        Alert.alert('LLM Warning', 'No JSON found in output');
        return [];
    } catch (e: any) {
        console.error('Inference failed:', e);
        Alert.alert('LLM Error', 'Inference crashed: ' + e.message);
        return [];
    }
};
