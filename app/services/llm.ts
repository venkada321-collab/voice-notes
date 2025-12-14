import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Paths } from 'expo-file-system'; // Use Paths directly
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
        const destinationUri = docDir.uri + '/' + MODEL_NAME;

        // ... file copy logic ...
        // Use new Paths API to check existence
        const pathInfo = Paths.info(destinationUri);

        if (!pathInfo.exists) {
            Alert.alert('LLM Init', 'Copying model asset...');
            await FileSystem.copyAsync({ from: asset.localUri, to: destinationUri });
        }

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
            temperature: 0.7,
        });

        console.log('Model output:', result.text);
        Alert.alert('LLM Output', `Raw result: ${result.text.slice(0, 100)}...`); // Show first 100 chars

        // clean up output to find JSON array
        const jsonMatch = result.text.match(/\[.*\]/s);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            Alert.alert('LLM Success', `Parsed ${parsed.length} items`);
            return parsed;
        }
        Alert.alert('LLM Warning', 'No JSON found in output');
        return [];
    } catch (e: any) {
        console.error('Inference failed:', e);
        Alert.alert('LLM Error', 'Inference crashed: ' + e.message);
        return [];
    }
};
