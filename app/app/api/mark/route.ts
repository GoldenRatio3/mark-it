import { markResultSchema, markResultLLMSchema } from '@/lib/schemas';
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
							Your role is to accurately assess student answers using the official mark scheme provided, provide detailed feedback, return structured, accurate marks per question (split sub questions into their own result) and overall based on the provided JSON format, after marking reflect: if you re-read the answer and marking scheme, would you grade remain the same or not? If not, lower your confidence.`;

	const userPrompt = `TASK OVERVIEW\n\nYou have been provided with two attached files:\n\n1. A Mark Scheme — the official marking criteria for a specific maths exam paper.\n2. A Student Paper — the scanned or typed answers submitted by a student.\n\nYour task is to:\n- Read and apply the mark scheme strictly when assessing the student paper.\n- Award full or partial marks per question based only on what is in the mark scheme.\n- Give a brief explanation (1–2 sentences) per question to justify your marking.\n- Highlight any errors or misconceptions.\n- Offer a concise tip on how the student could improve, if relevant.\n\nRULES\n\n- Only use the information contained in the two attached files.\n- Do not make assumptions outside the scope of the mark scheme.\n- Be concise but informative and maintain a helpful, constructive tone.`;

	const result = await generateObject({
		model: google('gemini-2.5-pro'),
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
		schema: markResultLLMSchema,
	});
	console.log('LLM result:', result);

	// TODO: detect image based questions
	// // Step 1: Detect image-based questions and ensure image_path/expected_visual_answer are present
	// (result.object.results as any[]).forEach((q, idx) => {
	// 	// Fallback: If image_path is missing but question_type or feedback suggests an image, try to infer
	// 	if (
	// 		!q.image_path &&
	// 		(q.question_type === 'visual' ||
	// 			/see image|graph|diagram/i.test(q.feedback))
	// 	) {
	// 		// Attempt to assign image_path from known files or context (customize as needed)
	// 		q.image_path = `answer_${q.question_number}.jpeg`;
	// 		// Optionally, set expected_visual_answer if not present
	// 		if (!q.expected_visual_answer) {
	// 			q.expected_visual_answer = {
	// 				shape_type: 'unknown',
	// 				vertices: [],
	// 				// Default tolerances
	// 				tolerance: { scale: 0.1, rotation: 5.0, position: 1.0 },
	// 			};
	// 		}
	// 	}
	// });

	// TODO: check
	// Step 2: Run visual analysis for all detected image questions
	try {
		const visualTasks = (result.object?.results || []).map(
			(r: any, idx: number) =>
				new Promise<{ idx: number; payload: any } | null>((resolve) => {
					if (!r?.image_path || !r?.expected_visual_answer) {
						return resolve(null);
					}
					try {
						const scriptPath = path.join(
							process.cwd(),
							'lib',
							'python_integration.py'
						);
						const args = [
							scriptPath,
							'--mode',
							'visual',
							'--input-data',
							JSON.stringify({
								image_path: r.image_path,
								expected_answer: r.expected_visual_answer,
								grid_spacing: 50.0,
							}),
						];
						console.log('[visual] Invoking python3', {
							scriptPath,
							cwd: process.cwd(),
							args,
						});
						const py = spawn('python3', args);

						let out = '';
						let err = '';
						py.stdout.on('data', (d) => (out += d.toString()));
						py.stderr.on('data', (d) => (err += d.toString()));

						const timeout = setTimeout(() => {
							try {
								py.kill('SIGKILL');
							} catch {}
							resolve(null);
						}, 8000);

						py.on('close', () => {
							clearTimeout(timeout);
							if (err) {
								console.error('[visual] Python stderr:', err.slice(0, 500));
							}
							console.log('[visual] Python stdout:', out.slice(0, 500));
							try {
								const parsed = JSON.parse(out || '{}');
								resolve({ idx, payload: parsed });
							} catch {
								console.warn('[visual] Failed to parse python stdout as JSON');
								resolve(null);
							}
						});
					} catch {
						console.error('[visual] Failed to spawn python3');
						resolve(null);
					}
				})
		);

		const visualResults = await Promise.all(visualTasks);
		visualResults.forEach((res) => {
			if (!res) return;
			const { idx, payload } = res;
			const q: any = result.object.results[idx];
			if (!q) return;
			q.visual_analysis = {
				confidence: payload?.confidence,
				feedback: payload?.feedback,
				geometric_accuracy: payload?.geometric_accuracy || null,
				detected_shapes: payload?.detected_shapes || [],
			};
			if (
				typeof payload?.confidence === 'number' &&
				typeof q.confidence === 'number'
			) {
				q.confidence = Math.max(
					0,
					Math.min(1, (q.confidence + payload.confidence) / 2)
				);
			}
		});
	} catch (e) {
		console.error('Visual analysis step failed:', e);
	}

	// Compute overall confidence via Python agreement mode based on per-question marks
	// TODO: should be comparing different runs, might be to expensive?
	const markingResultsForAgreement = result.object.results.map((r) => ({
		marks_awarded: r.marks_awarded,
		total_marks: r.total_marks,
	}));

	// Validation: Ensure individual question marks add up to the totals
	const sumAwarded = result.object.results.reduce(
		(sum, q) =>
			sum + (typeof q.marks_awarded === 'number' ? q.marks_awarded : 0),
		0
	);
	const sumAvailable = result.object.results.reduce(
		(sum, q) => sum + (typeof q.total_marks === 'number' ? q.total_marks : 0),
		0
	);
	if (
		sumAwarded !== result.object.total_marks_awarded ||
		sumAvailable !== result.object.total_marks_available
	) {
		console.warn(
			`[validation] Mismatch in total marks: Awarded ${result.object.total_marks_awarded} vs sum ${sumAwarded}, Available ${result.object.total_marks_available} vs sum ${sumAvailable}`
		);
		// TODO: temp fix: override to match sum of individual questions
		result.object.total_marks_awarded = sumAwarded;
		result.object.total_marks_available = sumAvailable;
	}

	const agreementConfidence = 0.0; // bypasses Python step for now
	// const agreementConfidence = await new Promise<number>((resolve) => {
	// 	try {
	// 		const scriptPath = path.join(
	// 			process.cwd(),
	// 			'lib',
	// 			'python_integration.py'
	// 		);
	// 		const args = [
	// 			scriptPath,
	// 			'--mode',
	// 			'agreement',
	// 			'--input-data',
	// 			JSON.stringify({ marking_results: markingResultsForAgreement }),
	// 		];
	// 		console.log('[agreement] Invoking python3', {
	// 			scriptPath,
	// 			cwd: process.cwd(),
	// 			args,
	// 		});
	// 		const py = spawn('python3', args);

	// 		let out = '';
	// 		let err = '';
	// 		py.stdout.on('data', (d) => (out += d.toString()));
	// 		py.stderr.on('data', (d) => (err += d.toString()));

	// 		const timeout = setTimeout(() => {
	// 			try {
	// 				py.kill('SIGKILL');
	// 			} catch {}
	// 			resolve(0.0);
	// 		}, 8000);
	// 		py.on('close', () => {
	// 			clearTimeout(timeout);
	// 			if (err) {
	// 				console.error('[agreement] Python stderr:', err.slice(0, 500));
	// 			}
	// 			console.log('[agreement] Python stdout:', out.slice(0, 500));
	// 			try {
	// 				const parsed = JSON.parse(out || '{}');
	// 				resolve(
	// 					typeof parsed.confidence_score === 'number'
	// 						? parsed.confidence_score
	// 						: 0.0
	// 				);
	// 			} catch {
	// 				console.warn('[agreement] Failed to parse python stdout as JSON');
	// 				resolve(0.0);
	// 			}
	// 		});
	// 	} catch {
	// 		console.error('[agreement] Failed to spawn python3');
	// 		resolve(0.0);
	// 	}
	// });

	// Fallback to average per-question confidence if Python step fails
	// TODO: update fallback logic as showing low confidence here is common
	const averagePerQuestionConfidence = (() => {
		const vals = result.object.results
			.map((r: any) => r?.confidence)
			.filter((v: any) => typeof v === 'number');
		if (vals.length === 0) return 0.0;
		return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
	})();
	console.log('[confidence] agreement', agreementConfidence);
	console.log(
		'[confidence] average per-question',
		averagePerQuestionConfidence
	);

	const useFallback = !(agreementConfidence > 0);
	if (useFallback) {
		console.warn('[overall] Using fallback average per-question confidence');
	}
	const overallConfidence = useFallback
		? averagePerQuestionConfidence
		: agreementConfidence;

	// Coerce/augment to full app schema shape without debug info
	const appShape = {
		student_name: result.object.student_name,
		results: (result.object.results as any[]).map((r) => ({
			question_number: r.question_number,
			marks_awarded: r.marks_awarded,
			total_marks: r.total_marks,
			feedback: r.feedback,
			confidence: r.confidence,
		})),
		total_marks_awarded: result.object.total_marks_awarded,
		total_marks_available: result.object.total_marks_available,
		general_feedback: result.object.general_feedback,
		overall_confidence: overallConfidence,
	};

	return Response.json(appShape);
}
