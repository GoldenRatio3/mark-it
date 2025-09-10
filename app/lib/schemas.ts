import { z } from 'zod';

// Schema for marking results (based on poc.py structure)
export const markResultSchema = z.object({
	student_name: z.string(),
	results: z.array(
		z.object({
			question_number: z.number(),
			marks_awarded: z.number(),
			total_marks: z.number(),
			feedback: z.string(),
			reason: z.string(),
			confidence: z.number(),
			question_type: z.string().optional(),
			expected_visual_answer: z
				.object({
					shape_type: z.string(),
					vertices: z.array(z.array(z.number())).optional(),
					tolerance: z
						.object({
							scale: z.number().optional(),
							rotation: z.number().optional(),
							position: z.number().optional(),
						})
						.optional(),
				})
				.optional(),
			visual_analysis: z
				.object({
					confidence: z.number().optional(),
					feedback: z.string().optional(),
					geometric_accuracy: z
						.object({
							scale_factor: z.number().optional(),
							rotation_angle: z.number().optional(),
							position_error: z.number().optional(),
							overall_accuracy: z.number().optional(),
						})
						.nullable()
						.optional(),
					detected_shapes: z
						.array(
							z.object({
								type: z.string(),
								vertices: z.array(z.array(z.number())).optional(),
								confidence: z.number().optional(),
							})
						)
						.optional(),
				})
				.optional(),
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

// Simpler schema used for LLM generation to avoid API response_schema validation issues
export const markResultLLMSchema = z.object({
	student_name: z.string(),
	results: z.array(
		z.object({
			question_number: z.number(),
			marks_awarded: z.number(),
			total_marks: z.number(),
			feedback: z.string(),
			reason: z.string(),
			confidence: z.number(),
		})
	),
	total_marks_awarded: z.number(),
	total_marks_available: z.number(),
	general_feedback: z.string(),
});
