import { z } from 'zod';

export const questionSchema = z.object({
	question: z.string(),
	options: z
		.array(z.string())
		.length(4)
		.describe(
			'Four possible answers to the question. Only one should be correct. They should all be of equal lengths.'
		),
	answer: z
		.enum(['A', 'B', 'C', 'D'])
		.describe(
			'The correct answer, where A is the first option, B is the second, and so on.'
		),
});

export type Question = z.infer<typeof questionSchema>;

export const questionsSchema = z.array(questionSchema).length(4);

// Schema for marking results (based on poc.py structure)
export const markResultSchema = z.object({
	student_name: z.string(),
	results: z.array(
		z.object({
			question_number: z.number(),
			marks_awarded: z.number(),
			total_marks: z.number(),
			feedback: z.string(),
			confidence: z.number(),
			confidence_breakdown: z
				.object({
					criteria_matched: z.number(),
					total_criteria: z.number(),
					confidence_score: z.number(),
					partial_credit_details: z
						.array(
							z.object({
								criterion: z.string(),
								matched: z.boolean(),
								partial_score: z.number(),
								explanation: z.string(),
							})
						)
						.optional(),
					reasoning: z.string(),
				})
				.optional(),
		})
	),
	total_marks_awarded: z.number(),
	total_marks_available: z.number(),
	general_feedback: z.string(),
	overall_confidence: z.number().optional(),
});

export type MarkResult = z.infer<typeof markResultSchema>;
