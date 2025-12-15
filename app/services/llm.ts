import { Asset } from 'expo-asset';
import { File as ExpoFile, Paths } from 'expo-file-system'; // Alias to avoid global File conflict
import { initLlama, LlamaContext } from 'llama.rn';
import { Alert } from 'react-native';

let context: LlamaContext | null = null;
const MODEL_NAME = 'Qwen3-0.6B-Q5_K_M.gguf';

// Initialize the model
export const initModel = async () => {
    if (context) return; // Already initialized

    try {
        console.log('Initializing Qwen model using initLlama helper...');
        Alert.alert('LLM Init', 'Initializing Qwen model...'); // DEBUG ALERT

        const modelAsset = require('../../assets/models/llm/Qwen3-0.6B-Q5_K_M.gguf');
        const asset = Asset.fromModule(modelAsset);
        await asset.downloadAsync();

        // ... (truncated for brevity, keep existing logic)
        if (!asset.localUri) throw new Error('Model asset localUri is null');

        const docDir = Paths.document;
        if (!docDir) throw new Error('Document directory not found');
        const destFile = new ExpoFile(docDir, MODEL_NAME);

        if (!destFile.exists) {
            Alert.alert('LLM Init', 'Copying model asset...');
            if (asset.localUri) {
                const sourceFile = new ExpoFile(asset.localUri);
                sourceFile.copy(destFile);
            } else {
                throw new Error('Asset localUri is null/undefined');
            }
        }

        const destinationUri = destFile.uri;

        context = await initLlama({
            model: destinationUri,
            n_ctx: 2048,
            n_threads: 4,
        });
        console.log('Qwen model initialized successfully.');
        Alert.alert('LLM Init', 'Model ready!');
    } catch (e: any) {
        console.error('Failed to init Qwen model:', e);
        Alert.alert('LLM Error', 'Init failed: ' + e.message);
        throw e;
    }
};

// Extract action items
export const extractActionItems = async (transcription: string) => {
    console.log('extractActionItems called with:', transcription.slice(0, 50) + '...');
    Alert.alert('LLM Inference', `Starting extraction on text length: ${transcription.length}`);

    if (!context) {
        console.log('Context missing, initializing model...');
        Alert.alert('LLM Inference', 'Context missing, checking init...');
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
            temperature: 0.6,
            top_p: 0.95,
            top_k: 20,
            min_p: 0
        });

        console.log('Model output:', result.text);
        Alert.alert('LLM Output', `Raw result: ${result.text}`); // Show full output

        // Strategy 1: Greedy match (find everything between first [ and last ])
        const jsonMatch = result.text.match(/\[.*\]/s);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                Alert.alert('LLM Success', `Parsed ${parsed.length} items`);
                return parsed;
            } catch (e) {
                console.log('Greedy parsing failed. Trying last block fallback...');
            }
        }

        // Strategy 2: Fallback to the *last* bracketed block
        // (This handles cases where thinking process puts brackets before the final answer)
        const lastEnd = result.text.lastIndexOf(']');
        if (lastEnd !== -1) {
            const lastStart = result.text.lastIndexOf('[', lastEnd);
            if (lastStart !== -1) {
                const candidate = result.text.substring(lastStart, lastEnd + 1);
                console.log('Fallback candidate:', candidate);
                try {
                    const parsed = JSON.parse(candidate);
                    Alert.alert('LLM Success (Fallback)', `Parsed ${parsed.length} items`);
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
