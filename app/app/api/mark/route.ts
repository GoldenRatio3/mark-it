import { markResultLLMSchema } from '@/lib/schemas';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: Request) {
	try {
		console.log('[POST] Marking request received');
		const { files } = await req.json();
		console.log(
			'[POST] Files parsed:',
			files?.map((f: { name?: string }) => f?.name || '[unnamed]')
		);

		// Expect two PDFs: mark scheme and student paper (order-agnostic, but we use first two provided)
		const [fileA, fileB] = files ?? [];
		if (!fileA || !fileB) {
			console.warn('[POST] Missing files: fileA:', !!fileA, 'fileB:', !!fileB);
			return Response.json(
				{ error: 'Two files are required: mark scheme and student paper' },
				{ status: 400 }
			);
		}

		const systemPrompt = `You are a highly experienced UK maths examiner. You mark papers according to national standards with precision, consistency, and clear justification.
					Your role is to accurately assess student answers using the official mark scheme provided, provide detailed feedback, a reason why you have given that mark referencing the mark scheme criteria, return structured, accurate marks per question (split sub questions into their own result) and overall based on the provided JSON format, after marking reflect: if you re-read the answer and marking scheme, would you grade remain the same or not? If not, lower your confidence. Lets think step by step.`;

		const userPrompt = `TASK OVERVIEW\n\nYou have been provided with two attached files:\n\n1. A Mark Scheme — the official marking criteria for a specific maths exam paper.\n2. A Student Paper — the scanned or typed answers submitted by a student.\n\nYour task is to:\n- Read and apply the mark scheme strictly when assessing the student paper.\n- Award full or partial marks per question based only on what is in the mark scheme.\n- Give a brief explanation (1–2 sentences) per question to justify your marking.\n- Highlight any errors or misconceptions.\n- Offer a concise tip on how the student could improve, if relevant.\n\nRULES\n\n- Only use the information contained in the two attached files.\n- Do not make assumptions outside the scope of the mark scheme.\n- Be concise but informative and maintain a helpful, constructive tone.`;
		console.log('[POST] Starting marking models...');
		const markingPromises = [
			generateObject({
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
			}),
			generateObject({
				model: openai('gpt-5'),
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
			}),
			generateObject({
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
			}),
		];
		const results = await Promise.all(markingPromises);
		console.log(
			'[POST] Marking models completed. Results:',
			results.map((r) => r?.object?.total_marks_awarded)
		);

		// Find the most common total_marks_awarded and total_marks_available
		function mode(arr: any[]) {
			const freq: Record<string, number> = {};
			arr.forEach((v) => {
				const key = JSON.stringify(v);
				freq[key] = (freq[key] || 0) + 1;
			});
			return arr.sort(
				(a, b) => freq[JSON.stringify(b)] - freq[JSON.stringify(a)]
			)[0];
		}

		const awardedArr = results.map((r) => r.object.total_marks_awarded);
		const availableArr = results.map((r) => r.object.total_marks_available);
		const mostCommonAwarded = mode(awardedArr);
		const mostCommonAvailable = mode(availableArr);
		console.log(
			'[POST] Most common awarded:',
			mostCommonAwarded,
			'Most common available:',
			mostCommonAvailable
		);

		// Use the result with the most common score for feedback/details
		const chosenIdx = results.findIndex(
			(r) =>
				r.object.total_marks_awarded === mostCommonAwarded &&
				r.object.total_marks_available === mostCommonAvailable
		);
		const chosenResult = results[chosenIdx >= 0 ? chosenIdx : 0].object;

		// Validation: Ensure individual question marks add up to the totals
		const sumAwarded = chosenResult.results.reduce(
			(sum, q) =>
				sum + (typeof q.marks_awarded === 'number' ? q.marks_awarded : 0),
			0
		);
		const sumAvailable = chosenResult.results.reduce(
			(sum, q) => sum + (typeof q.total_marks === 'number' ? q.total_marks : 0),
			0
		);
		if (
			sumAwarded !== mostCommonAwarded ||
			sumAvailable !== mostCommonAvailable
		) {
			console.warn(
				`[validation] Mismatch in total marks: Awarded ${mostCommonAwarded} vs sum ${sumAwarded}, Available ${mostCommonAvailable} vs sum ${sumAvailable}`
			);
			// TODO: temp fix: override to match sum of individual questions
			chosenResult.total_marks_awarded = sumAwarded;
			chosenResult.total_marks_available = sumAvailable;
		}

		// Lower confidence if scores disagree for each question
		const questionCount = chosenResult.results.length;
		for (let i = 0; i < questionCount; i++) {
			const questionMarks = results.map(
				(r) => r.object.results[i]?.marks_awarded
			);
			const questionConfidences = results.map(
				(r) => r.object.results[i]?.confidence
			);
			const uniqueQScores = new Set(questionMarks.map((a) => JSON.stringify(a)))
				.size;
			let avgConfidence =
				questionConfidences
					.filter((v) => typeof v === 'number')
					.reduce((a, b) => a + b, 0) /
				(questionConfidences.filter((v) => typeof v === 'number').length || 1);
			if (uniqueQScores === 1) {
				// All agree, keep confidence
				chosenResult.results[i].confidence = avgConfidence;
			} else if (uniqueQScores === 2) {
				console.log(
					`[POST] Question ${i + 1} has 2 unique scores, lowering confidence.`
				);
				chosenResult.results[i].confidence = avgConfidence * 0.7;
			} else {
				console.log(
					`[POST] Question ${
						i + 1
					} has >2 unique scores, lowering confidence further.`
				);
				chosenResult.results[i].confidence = avgConfidence * 0.4;
			}
		}

		// Compute overall confidence as the mean of all per-question confidences
		const overallConfidence = (() => {
			const vals = chosenResult.results
				.map((r: any) => r?.confidence)
				.filter((v: any) => typeof v === 'number');
			if (vals.length === 0) return 0.0;
			return vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
		})();
		console.log('[POST] Overall confidence:', overallConfidence);

		// Coerce/augment to full app schema shape without debug info
		const appShape = {
			student_name: chosenResult.student_name,
			results: (chosenResult.results as any[]).map((r) => ({
				question_number: r.question_number,
				marks_awarded: r.marks_awarded,
				total_marks: r.total_marks,
				feedback: r.feedback,
				reason: r.reason,
				confidence: r.confidence,
			})),
			total_marks_awarded: chosenResult.total_marks_awarded,
			total_marks_available: chosenResult.total_marks_available,
			general_feedback: chosenResult.general_feedback,
			overall_confidence: overallConfidence,
		};
		console.log('[POST] Returning result:', appShape);

		return Response.json(appShape);
	} catch (err: any) {
		console.error('Marking error:', err);
		return Response.json(
			{ error: err?.message || 'Unknown error occurred during marking.' },
			{ status: 500 }
		);
	}
}
