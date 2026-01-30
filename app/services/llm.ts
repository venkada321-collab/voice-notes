import { File as ExpoFile, Paths } from 'expo-file-system'; // Alias to avoid global File conflict
import * as FileSystem from 'expo-file-system/legacy'; // Fix: Use legacy API for download
import { initLlama, LlamaContext } from 'llama.rn';

let context: LlamaContext | null = null;
const MODEL_NAME = 'Qwen3-0.6B-Q5_K_M.gguf';

// Check if model exists
export const checkModelExists = async () => {
    const docDir = Paths.document;
    if (!docDir) return false;
    const destFile = new ExpoFile(docDir, MODEL_NAME);
    return destFile.exists;
};

// Initialize the model
export const initModel = async (onStatus?: (msg: string) => void, onProgress?: (ratio: number) => void) => {
    if (context) return; // Already initialized

    try {
        const docDir = Paths.document;
        if (!docDir) throw new Error('Document directory not found');
        const destFile = new ExpoFile(docDir, MODEL_NAME);

        if (!destFile.exists) {
            onStatus?.('Initializing Neural Core...');

            // Download from URL
            const MODEL_URL = "https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q5_K_M.gguf?download=true";

            try {
                // Use legacy API to download
                const downloadResumable = FileSystem.createDownloadResumable(
                    MODEL_URL,
                    destFile.uri,
                    {},
                    (downloadProgress) => {
                        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                        onProgress?.(progress);
                    }
                );

                const result = await downloadResumable.downloadAsync();

                if (!result || !result.uri) {
                    throw new Error("Download failed");
                }

                onStatus?.('Neural Core Ready');

            } catch (e: any) {
                throw new Error("Failed to download model");
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
        // Alert.alert('LLM Error', 'Init failed: ' + e.message); // Native alert removed
        throw e;
    }
};

// Extract action items
export const extractActionItems = async (transcription: string, onStatus?: (msg: string) => void): Promise<{ success: boolean; data?: string[]; errorType?: 'NO_JSON' | 'CRASH' }> => {



    if (!context) {


        await initModel(onStatus);
    }

    // Qwen-Instruct template
    const prompt = `<|im_start|>system
You are a helpful assistant. Extract actionable tasks from the user's text. Return them as a JSON list of strings. For Example: ["Buy milk", "Call John"]. Only return the JSON.
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

                return { success: true, data: parsed };
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

                    return { success: true, data: parsed };
                } catch (e) {
                    console.error('Fallback parsing failed:', e);
                }
            }
        }

        return { success: false, errorType: 'NO_JSON' };
    } catch (e: any) {
        console.error('Inference failed:', e);
        return { success: false, errorType: 'CRASH' };
    }
};

export const generateMeetingSummary = async (title: string, tasks: any[], style: string = 'formal', onStatus?: (msg: string) => void): Promise<{ success: boolean; data?: string; errorType?: 'CRASH' }> => {
    // If no context, try to init (though usually it should be ready if we are in the app)
    if (!context) {
        try {
            await initModel(onStatus);
        } catch (e) {
            // Fallback if model cannot load: simple join
            const fallback = `Meeting: ${title}\n\nTasks:\n${tasks.map(t => `- ${t.content}`).join('\n')}`;
            return { success: true, data: fallback };
        }
    }

    // If still no context (init failed silently or something), fallback
    if (!context) {
        const fallback = `Meeting: ${title}\n\nTasks:\n${tasks.map(t => `- ${t.content}`).join('\n')}`;
        return { success: true, data: fallback };
    }

    const taskListString = tasks.map(t => `- ${t.content}`).join('\n');

    let styleInstruction = "The summary should be concise, professional, and ready to share.";
    if (style === 'casual') {
        styleInstruction = "The summary should be relaxed, easy-going, and written like a blog post or tweet.";
    } else if (style === 'friend') {
        styleInstruction = "The summary should be very informal, like texting a close friend. Use emojis and slang where appropriate.";
    } else if (style === 'simple') {
        styleInstruction = "The summary should be extremely simple, as if explaining it to a 5-year-old. Use very basic words.";
    }

    const prompt = `<|im_start|>system
You are a helpful assistant. Summarize the following meeting based on its title and action items. ${styleInstruction}
<|im_end|>
<|im_start|>user
Meeting Title: ${title}

Action Items:
${taskListString}

Please provide a brief summary paragraph followed by the list of action items.
<|im_end|>
<|im_start|>assistant
`;

    try {
        const result = await context.completion({
            prompt,
            n_predict: 512,
            temperature: 0.6,
            top_p: 0.95,
            top_k: 20,
            min_p: 0
        });

        // Remove<think>...</think> blocks (including attributes like <think_start>)
        // Handles multiline content within think tags
        let cleanText = result.text.replace(/<think[\s\S]*?<\/think>/gi, '').trim();

        return { success: true, data: cleanText };

    } catch (e: any) {
        console.error('Summary generation failed:', e);
        // Fallback on crash
        const fallback = `Meeting: ${title}\n\nTasks:\n${tasks.map(t => `- ${t.content}`).join('\n')}`;
        return { success: true, data: fallback };
    }
};
