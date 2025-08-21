import { markResultSchema } from '@/lib/schemas';
import { spawn } from 'child_process';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import path from 'path';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: Request) {
	const { files } = await req.json();

	// Expect two PDFs: mark scheme and student paper (order-agnostic, but we use first two provided)
	const [fileA, fileB] = files ?? [];
	if (!fileA || !fileB) {
		return new Response(
			'Two files are required: mark scheme and student paper',
			{ status: 400 }
		);
	}

	const systemPrompt = `You are a highly experienced UK maths examiner. You mark papers according to national standards with precision, consistency, and clear justification.
Your role is to accurately assess student answers using the official mark scheme provided, provide detailed feedback, a confidence score for how accurate your analysis is,
and return structured, accurate marks per question (split sub questions into their own question) and overall based on the provided JSON format.`;

	const userPrompt = `TASK OVERVIEW\n\nYou have been provided with two attached files:\n\n1. A Mark Scheme — the official marking criteria for a specific maths exam paper.\n2. A Student Paper — the scanned or typed answers submitted by a student.\n\nYour task is to:\n- Read and apply the mark scheme strictly when assessing the student paper.\n- Award full or partial marks per question based only on what is in the mark scheme.\n- Give a brief explanation (1–2 sentences) per question to justify your marking.\n- Highlight any errors or misconceptions.\n- Offer a concise tip on how the student could improve, if relevant.\n\nRULES\n\n- Only use the information contained in the two attached files.\n- Do not make assumptions outside the scope of the mark scheme.\n- Be concise but informative and maintain a helpful, constructive tone.\n- Use UK GCSE or A-Level standards depending on the content.\n- If question numbers or formats are unclear, do your best to match answers to the correct scheme section.`;

	const result = await generateObject({
		model: google('gemini-1.5-flash-latest'),
		messages: [
			{ role: 'system', content: systemPrompt },
			{
				role: 'user',
				content: [
					{ type: 'text', text: userPrompt },
					{
						type: 'file',
						data: fileA.data,
						mediaType: fileA.type || 'application/pdf',
					},
					{
						type: 'file',
						data: fileB.data,
						mediaType: fileB.type || 'application/pdf',
					},
				],
			},
		],
		schema: markResultSchema,
	});

	// Compute overall confidence via Python agreement mode based on per-question marks
	const markingResultsForAgreement = result.object.results.map((r) => ({
		marks_awarded: r.marks_awarded,
		total_marks: r.total_marks,
	}));

	const agreementConfidence = await new Promise<number>((resolve) => {
		try {
			const scriptPath = path.join(
				process.cwd(),
				'app',
				'lib',
				'python_integration.py'
			);
			const args = [
				scriptPath,
				'--mode',
				'agreement',
				'--input-data',
				JSON.stringify({ marking_results: markingResultsForAgreement }),
			];
			const py = spawn('python3', args);

			let out = '';
			let err = '';
			py.stdout.on('data', (d) => (out += d.toString()));
			py.stderr.on('data', (d) => (err += d.toString()));

			const timeout = setTimeout(() => {
				try {
					py.kill('SIGKILL');
				} catch {}
				resolve(0.0);
			}, 8000);
			py.on('close', () => {
				clearTimeout(timeout);
				if (err) {
					console.error('Python agreement stderr:', err);
				}
				try {
					const parsed = JSON.parse(out || '{}');
					resolve(
						typeof parsed.confidence_score === 'number'
							? parsed.confidence_score
							: 0.0
					);
				} catch {
					resolve(0.0);
				}
			});
		} catch {
			resolve(0.0);
		}
	});

	// Fallback to average per-question confidence if Python step fails
	const averagePerQuestionConfidence = (() => {
		const vals = result.object.results
			.map((r: any) => r?.confidence)
			.filter((v: any) => typeof v === 'number');
		if (vals.length === 0) return 0.0;
		return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
	})();

	const overallConfidence =
		agreementConfidence > 0
			? agreementConfidence
			: averagePerQuestionConfidence;

	const responseObject = {
		...result.object,
		overall_confidence: overallConfidence,
	};

	return Response.json(responseObject);
}
