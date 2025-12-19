import { File as ExpoFile, Paths } from 'expo-file-system'; // Alias to avoid global File conflict
import { initLlama, LlamaContext } from 'llama.rn';
import { Alert, Platform } from 'react-native';
import { unzip, unzipAssets } from 'react-native-zip-archive';

let context: LlamaContext | null = null;
const MODEL_NAME = 'Qwen3-0.6B-Q5_K_M.gguf';

// Initialize the model
export const initModel = async () => {
    if (context) return; // Already initialized

    try {



        const docDir = Paths.document;
        if (!docDir) throw new Error('Document directory not found');
        const destFile = new ExpoFile(docDir, MODEL_NAME);

        if (!destFile.exists) {
            // First run: Extracting AI model... (Silently)

            if (Platform.OS === 'android') {
                // Android: Extract directly from Assets (Install-time pack)
                try {
                    const targetPath = docDir.uri.replace('file://', '');
                    await unzipAssets('model.zip', targetPath);
                } catch (err) {
                    throw new Error("Failed to unzip Qwen model from assets: " + err);
                }
            } else {
                // iOS / Dev: Copy from bundle then unzip
                const zipName = 'model.zip';
                const tempZip = new ExpoFile(Paths.cache, zipName);
                const assetUri = Paths.bundle + '/' + zipName;
                const assetFile = new ExpoFile(assetUri);

                if (assetFile.exists) {
                    await assetFile.copy(tempZip);
                    if (tempZip.exists) {
                        try {
                            await unzip(tempZip.uri, docDir.uri);
                        } finally {
                            await tempZip.delete();
                        }
                    }
                } else {
                    throw new Error(`Model zip not found at ${assetUri}`);
                }
            }
        }

        // Double check existence after unzip
        if (!destFile.exists) {
            throw new Error(`Model file ${MODEL_NAME} not found after extraction`);
        }

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
